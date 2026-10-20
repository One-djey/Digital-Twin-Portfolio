import { z } from "zod";

// Contract of the AI layer: provider implementations (server/ai/APIs/*), the
// agent loop (AIAgent.run) and its callers (routes, evals) only meet here.

export type ToolCall = {
  id: string;
  name: string;
  arguments: string; // JSON-encoded arguments
};

export type AiChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; content: string; toolCallId: string; name: string };

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON schema
};

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
};

export type StreamOptions = {
  tools?: ToolDefinition[];
  onText?: (delta: string) => void;
  signal?: AbortSignal;
};

export type CompletionResult = {
  text: string;
  toolCalls: ToolCall[];
  finishReason: string; // "stop" | "length" | "tool_calls" | "error" | ...
  usage: Usage;
  model: string; // model that actually answered
};

export interface AiApiInterface {
  readonly provider: "mistral" | "openai";
  readonly model: string;
  stream(
    messages: AiChatMessage[],
    options?: StreamOptions,
  ): Promise<CompletionResult>;
}

// Executes a tool requested by the model and returns a JSON string fed back
// to it. Must not throw for business failures: return `{"ok":false,...}`.
export type ToolExecutor = (name: string, args: unknown) => Promise<string>;

// Langfuse prompt version a system prompt was compiled from.
export type PromptRef = { name: string; version: number; isFallback: boolean };

export type SystemPrompt = {
  text: string;
  prompt?: PromptRef; // unset when built from the local template
};

// One model call or tool call of a run, recorded so that the caller can trace
// the run afterwards (server/tracing.ts) once it knows how the turn ended.
export type GenerationStep = {
  type: "generation";
  round: number;
  attempt: "primary" | "fallback";
  provider: AiApiInterface["provider"];
  requestedModel: string; // model the provider started with
  // Model that answered (may differ after a Mistral rate-limit fallback), or
  // the requested one when the call failed.
  model: string;
  modelParameters: { temperature: number; maxTokens: number };
  input: AiChatMessage[]; // messages as sent to the model
  prompt?: PromptRef; // system prompt version
  tools: string[];
  startTime: Date;
  completionStartTime?: Date; // first streamed text delta
  endTime: Date;
  result?: CompletionResult;
  error?: string;
};

export type ToolStep = {
  type: "tool";
  round: number;
  call: ToolCall;
  output: string; // JSON string fed back to the model
  ok: boolean;
  startTime: Date;
  endTime: Date;
};

export type RunStep = GenerationStep | ToolStep;

export type RunOptions = {
  onText?: (delta: string) => void;
  signal?: AbortSignal;
  executeTool?: ToolExecutor;
  now?: Date;
  // Filled with every step as the run progresses, including when it throws.
  steps?: RunStep[];
};

export type RunResult = {
  text: string;
  model: string;
  usage: Usage;
  finishReason: string;
  latencyMs: number;
  toolCalls: { name: string; ok: boolean }[];
  prompt?: PromptRef;
};

export const SUBMIT_LEAD_TOOL_NAME = "submit_lead";

export const submitLeadArgsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  // One sentence written by the model summarising what the visitor wants.
  intentSummary: z.string().trim().min(10).max(200),
});
export type SubmitLeadArgs = z.infer<typeof submitLeadArgsSchema>;
