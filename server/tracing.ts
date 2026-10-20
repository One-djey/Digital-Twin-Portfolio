import "dotenv/config";
import { context, TraceFlags, type SpanContext } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { LangfuseClient } from "@langfuse/client";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import {
  createTraceId,
  propagateAttributes,
  setLangfuseTracerProvider,
  startObservation,
} from "@langfuse/tracing";
import {
  SUBMIT_LEAD_TOOL_NAME,
  type AiChatMessage,
  type GenerationStep,
  type RunResult,
  type RunStep,
  type ToolCall,
  type ToolStep,
  type Usage,
} from "./ai/types.ts";

// Langfuse tracing of the chat assistant (Langfuse Cloud EU). Disabled when
// LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY are unset: every export is then a
// no-op. Never throws: a tracing failure must not affect the chat.
//
// Privacy (see portfolioData.legal): message content is sent to Langfuse,
// with email addresses and phone numbers masked and the submit_lead contact
// details redacted. Content is only sent for turns stored in the database:
// their trace id derives from the user message id, so the conversation reset
// and the 60-day retention purge can delete the matching traces. Failed
// turns (user message deleted) are traced with metadata only.

const SERVICE_NAME = "digital-twin-portfolio";
const TRACE_NAME = "chat-response";
const FEEDBACK_SCORE_NAME = "thumbs_up";
// The Langfuse public API advises small trace deletion batches on Cloud.
const DELETE_BATCH_SIZE = 50;
// Parent span id of the root observation: only used to give the trace a
// deterministic id (createTraceId), the parent itself never exists.
const SEED_PARENT_SPAN_ID = "0123456789abcdef";

const enabled = Boolean(
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
);
const environment =
  process.env.LANGFUSE_TRACING_ENVIRONMENT ??
  process.env.VERCEL_ENV ??
  "development";
const release =
  process.env.LANGFUSE_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA;

let processor: LangfuseSpanProcessor | undefined;
let client: LangfuseClient | undefined;

function getProcessor(): LangfuseSpanProcessor | undefined {
  if (!enabled) return undefined;
  if (!processor) {
    processor = new LangfuseSpanProcessor({
      // Serverless: export each span as it ends instead of batching.
      exportMode: "immediate",
      environment,
      release,
      mask: ({ data }) => maskPii(data),
    });
    // propagateAttributes() stores userId/sessionId in the active context.
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
    // Isolated provider: nothing else in the app emits OpenTelemetry spans.
    setLangfuseTracerProvider(
      new BasicTracerProvider({
        resource: resourceFromAttributes({ "service.name": SERVICE_NAME }),
        spanProcessors: [processor],
      }),
    );
  }
  return processor;
}

export function getLangfuseClient(): LangfuseClient | undefined {
  if (!enabled) return undefined;
  client ??= new LangfuseClient();
  return client;
}

// ---------------------------------------------------------------------------
// Masking

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERNS = [
  // International: +33 6 12 34 56 78, 0044 20 7946 0958, +1 (415) 555-0100
  /(?:\+|\b00)\d{1,3}(?:[\s.-]?\(?\d{1,4}\)?){2,6}/g,
  // French national: 06 12 34 56 78, 06.12.34.56.78, 0612345678
  /\b0[1-9](?:[\s.-]?\d{2}){4}\b/g,
];

function maskString(text: string): string {
  let masked = text.replace(EMAIL_PATTERN, "[email]");
  for (const pattern of PHONE_PATTERNS) {
    masked = masked.replace(pattern, "[phone]");
  }
  return masked;
}

// Applied by the span processor to every input, output and metadata value.
function maskPii(data: unknown): unknown {
  if (typeof data === "string") return maskString(data);
  if (Array.isArray(data)) return data.map(maskPii);
  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, maskPii(value)]),
    );
  }
  return data;
}

// The visitor's contact details passed to submit_lead are never sent, even
// in a form the regexes would miss (e.g. a bare name).
function redactToolArguments(call: ToolCall): string {
  if (call.name !== SUBMIT_LEAD_TOOL_NAME) return call.arguments;
  try {
    const args = JSON.parse(call.arguments);
    for (const field of ["name", "email", "phone"]) {
      if (args?.[field] !== undefined) args[field] = "[redacted]";
    }
    return JSON.stringify(args);
  } catch {
    return "[redacted]";
  }
}

// ---------------------------------------------------------------------------
// Chat turn traces

// Deterministic trace id of the chat turn started by this user message.
export function chatTurnTraceId(userMessageId: number): Promise<string> {
  return createTraceId(`chat-turn:${userMessageId}`);
}

export type ChatTurnTrace = {
  userId: string;
  userMessageId: number;
  userMessage: string;
  startTime: Date;
  endTime: Date;
  steps: RunStep[];
} & (
  | { stored: true; reply: string; result: RunResult }
  | { stored: false; error: string }
);

// Builds the trace of one chat turn from the steps recorded by
// AIAgent.run(), once the turn is over, then flushes it.
export async function traceChatTurn(turn: ChatTurnTrace): Promise<void> {
  const spanProcessor = getProcessor();
  if (!spanProcessor) return;
  try {
    const traceId = await chatTurnTraceId(turn.userMessageId);
    propagateAttributes(
      {
        userId: turn.userId,
        // The browser's id spans the whole conversation (kept after a reset).
        sessionId: turn.userId,
        traceName: TRACE_NAME,
        tags: ["chat"],
      },
      () => recordTurn(turn, traceId),
    );
    await spanProcessor.forceFlush();
  } catch (error) {
    console.error("Langfuse trace failed: " + errorMessage(error));
  }
}

function recordTurn(turn: ChatTurnTrace, traceId: string) {
  const root = startObservation(
    "answer-visitor",
    turn.stored
      ? {
          input: turn.userMessage,
          output: turn.reply,
          metadata: {
            model: turn.result.model,
            finishReason: turn.result.finishReason,
            latencyMs: turn.result.latencyMs,
            toolCalls: turn.result.toolCalls,
          },
        }
      : {
          level: "ERROR",
          statusMessage: turn.error,
          metadata: { contentOmitted: "turn not stored" },
        },
    {
      asType: "agent",
      startTime: turn.startTime,
      parentSpanContext: {
        traceId,
        spanId: SEED_PARENT_SPAN_ID,
        traceFlags: TraceFlags.SAMPLED,
      },
    },
  );
  const parent = root.otelSpan.spanContext();
  for (const step of turn.steps) {
    if (step.type === "generation") {
      recordGeneration(step, parent, turn.stored);
    } else {
      recordTool(step, parent, turn.stored);
    }
  }
  root.end(turn.endTime);
}

function recordGeneration(
  step: GenerationStep,
  parent: SpanContext,
  withContent: boolean,
) {
  const result = step.result;
  const generation = startObservation(
    "generate-reply",
    {
      model: step.model,
      modelParameters: step.modelParameters,
      completionStartTime: step.completionStartTime,
      ...(withContent
        ? {
            input: toTraceMessages(step.input),
            output: result && toTraceMessage(assistantMessage(result)),
          }
        : {}),
      ...(result ? { usageDetails: toUsageDetails(result.usage) } : {}),
      // Links the generation to its prompt version (the SDK skips fallbacks).
      ...(step.prompt ? { prompt: step.prompt } : {}),
      metadata: {
        promptIsFallback: step.prompt ? step.prompt.isFallback : "local template",
        round: step.round,
        attempt: step.attempt,
        provider: step.provider,
        requestedModel: step.requestedModel,
        toolsOffered: step.tools,
        finishReason: result?.finishReason,
      },
      ...(step.error ? { level: "ERROR", statusMessage: step.error } : {}),
    },
    {
      asType: "generation",
      startTime: step.startTime,
      parentSpanContext: parent,
    },
  );
  generation.end(step.endTime);
}

function recordTool(step: ToolStep, parent: SpanContext, withContent: boolean) {
  const tool = startObservation(
    step.call.name,
    {
      ...(withContent
        ? {
            input: parseJson(redactToolArguments(step.call)),
            output: parseJson(step.output),
          }
        : {}),
      metadata: { round: step.round, toolCallId: step.call.id, ok: step.ok },
      ...(step.ok ? {} : { level: "WARNING", statusMessage: step.output }),
    },
    { asType: "tool", startTime: step.startTime, parentSpanContext: parent },
  );
  tool.end(step.endTime);
}

function assistantMessage(result: {
  text: string;
  toolCalls: ToolCall[];
}): AiChatMessage {
  return {
    role: "assistant",
    content: result.text,
    toolCalls: result.toolCalls,
  };
}

// OpenAI-style messages, the format the Langfuse UI renders (tool calls
// included).
function toTraceMessages(messages: AiChatMessage[]) {
  return messages.map(toTraceMessage);
}

function toTraceMessage(message: AiChatMessage) {
  switch (message.role) {
    case "system":
    case "user":
      return { role: message.role, content: message.content };
    case "assistant":
      return message.toolCalls?.length
        ? {
            role: "assistant",
            content: message.content || null,
            tool_calls: message.toolCalls.map((call) => ({
              id: call.id,
              type: "function",
              function: {
                name: call.name,
                arguments: redactToolArguments(call),
              },
            })),
          }
        : { role: "assistant", content: message.content };
    case "tool":
      return {
        role: "tool",
        tool_call_id: message.toolCallId,
        name: message.name,
        content: message.content,
      };
  }
}

// Langfuse usage buckets are exclusive: cached tokens are not part of `input`.
function toUsageDetails(usage: Usage): Record<string, number> {
  const cached = usage.cachedTokens ?? 0;
  return {
    input: usage.inputTokens - cached,
    output: usage.outputTokens,
    ...(cached ? { input_cached_tokens: cached } : {}),
  };
}

// ---------------------------------------------------------------------------
// Deletion and scores

// Deletes the traces of the chat turns started by these user messages (reset
// and retention purge). Throws on failure. Deletion is asynchronous on the
// Langfuse side (usually done within minutes).
export async function deleteChatTraces(userMessageIds: number[]) {
  const langfuse = getLangfuseClient();
  if (!langfuse || userMessageIds.length === 0) return;
  const traceIds = await Promise.all(userMessageIds.map(chatTurnTraceId));
  for (let i = 0; i < traceIds.length; i += DELETE_BATCH_SIZE) {
    await langfuse.api.trace.deleteMultiple({
      traceIds: traceIds.slice(i, i + DELETE_BATCH_SIZE),
    });
  }
}

// Mirrors the visitor's 👍/👎 on the trace of the turn. `answeredAt` (the
// assistant message's creation time) is the score timestamp: re-sending the
// same id and timestamp updates the score in place.
export async function scoreChatFeedback(feedback: {
  userMessageId: number;
  answeredAt: Date;
  rating: 1 | -1 | null;
}): Promise<void> {
  const langfuse = getLangfuseClient();
  if (!langfuse) return;
  try {
    const traceId = await chatTurnTraceId(feedback.userMessageId);
    const id = `${FEEDBACK_SCORE_NAME}-${traceId}`;
    if (feedback.rating === null) {
      await langfuse.api.scores.delete(id);
      return;
    }
    langfuse.score.create({
      id,
      traceId,
      name: FEEDBACK_SCORE_NAME,
      value: feedback.rating === 1 ? 1 : 0,
      dataType: "BOOLEAN",
      environment,
      timestamp: feedback.answeredAt.toISOString(),
    });
    await langfuse.flush();
  } catch (error) {
    console.error("Langfuse feedback score failed: " + errorMessage(error));
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
