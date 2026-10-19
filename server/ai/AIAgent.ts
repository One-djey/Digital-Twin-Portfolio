import { OpenAIAPI } from "./APIs/OpenAI.ts";
import { MistralAPI } from "./APIs/Mistral.ts";
import type {
  AiApiInterface,
  AiChatMessage,
  CompletionResult,
  RunOptions,
  RunResult,
  ToolCall,
  ToolDefinition,
  ToolExecutor,
  Usage,
} from "./types.ts";

// Max number of model turns that may end with tool calls in one run; the
// following call is made without tools so the model has to answer in text.
const MAX_TOOL_ROUNDS = 2;

const OPENAI_FALLBACK_MODEL = "gpt-4o-mini";
const MISTRAL_FALLBACK_MODEL = "mistral-small-latest";

function isOpenAIModel(model: string): boolean {
  return (
    model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3")
  );
}

function isMistralModel(model: string): boolean {
  return (
    model.startsWith("mistral") ||
    model.startsWith("ministral") ||
    model.startsWith("pixtral") ||
    model.startsWith("codestral")
  );
}

// Instantiates the provider implementation matching the model name prefix.
function createApiInstance(
  model: string,
  temperature: number,
  maxTokens: number,
): AiApiInterface {
  if (isOpenAIModel(model)) {
    return new OpenAIAPI(model, temperature, maxTokens);
  }
  if (isMistralModel(model)) {
    return new MistralAPI(model, temperature, maxTokens);
  }
  throw new Error(`Unsupported model type: ${model}`);
}

// Backup model on the other provider, used when the primary one fails and
// that provider's API key is configured.
function createFallbackInstance(
  model: string,
  temperature: number,
  maxTokens: number,
): AiApiInterface | undefined {
  try {
    if (isMistralModel(model) && process.env.OPENAI_API_KEY) {
      return new OpenAIAPI(OPENAI_FALLBACK_MODEL, temperature, maxTokens);
    }
    if (!isMistralModel(model) && process.env.MISTRAL_API_KEY) {
      return new MistralAPI(MISTRAL_FALLBACK_MODEL, temperature, maxTokens);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export type AIAgentConfig = {
  model: string;
  temperature: number;
  maxTokens: number;
  buildSystemPrompt: (now: Date) => string;
  tools?: ToolDefinition[];
  // Sent instead of failing when the model ends with an empty answer after a
  // successful tool call: the side effect already happened (e.g. a lead was
  // emailed), so an error would make the visitor retry and duplicate it.
  toolSuccessFallbackText?: string;
};

const toolError = (error: string) => JSON.stringify({ ok: false, error });

export abstract class AIAgent {
  protected readonly config: AIAgentConfig;
  // Created on first use so that a missing API key fails the chat request
  // instead of crashing every route that imports the agent.
  private primary?: AiApiInterface;
  private fallback?: AiApiInterface | null;

  constructor(config: AIAgentConfig) {
    this.config = config;
  }

  private getPrimary(): AiApiInterface {
    this.primary ??= createApiInstance(
      this.config.model,
      this.config.temperature,
      this.config.maxTokens,
    );
    return this.primary;
  }

  private getFallback(): AiApiInterface | undefined {
    if (this.fallback === undefined) {
      this.fallback =
        createFallbackInstance(
          this.config.model,
          this.config.temperature,
          this.config.maxTokens,
        ) ?? null;
    }
    return this.fallback ?? undefined;
  }

  // Answers the conversation `history` (user/assistant turns, oldest first),
  // streaming text through `onText` and running the tool loop. Throws if no
  // provider could answer.
  public async run(
    history: AiChatMessage[],
    options: RunOptions = {},
  ): Promise<RunResult> {
    const start = Date.now();
    const tools = this.config.tools ?? [];
    const messages: AiChatMessage[] = [
      {
        role: "system",
        content: this.config.buildSystemPrompt(options.now ?? new Date()),
      },
      ...history,
    ];

    const usage: Required<Usage> = {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    };
    const toolCallsLog: RunResult["toolCalls"] = [];
    let fullText = "";
    // Set at the start of every round after the first, so that the text of
    // an earlier round is separated from the next round's first delta.
    let roundStart = false;
    const onText = (delta: string) => {
      if (roundStart) {
        roundStart = false;
        if (fullText && !/\s$/.test(fullText) && !/^\s/.test(delta)) {
          fullText += "\n\n";
          options.onText?.("\n\n");
        }
      }
      fullText += delta;
      options.onText?.(delta);
    };

    for (let round = 0; ; round++) {
      roundStart = round > 0;
      const allowTools = tools.length > 0 && round < MAX_TOOL_ROUNDS;
      const result = await this.complete(messages, {
        tools: allowTools ? tools : undefined,
        onText,
        signal: options.signal,
      });
      usage.inputTokens += result.usage.inputTokens;
      usage.outputTokens += result.usage.outputTokens;
      usage.cachedTokens += result.usage.cachedTokens ?? 0;

      if (!allowTools || result.toolCalls.length === 0) {
        if (!fullText.trim()) {
          const fallbackText = this.config.toolSuccessFallbackText;
          if (!fallbackText || !toolCallsLog.some((call) => call.ok)) {
            throw new Error("AI provider returned an empty answer");
          }
          onText(fallbackText);
        }
        return {
          text: fullText,
          model: result.model,
          usage,
          finishReason: result.finishReason,
          latencyMs: Date.now() - start,
          toolCalls: toolCallsLog,
        };
      }

      messages.push({
        role: "assistant",
        content: result.text,
        toolCalls: result.toolCalls,
      });
      for (const call of result.toolCalls) {
        const output = await this.executeToolCall(
          call,
          tools,
          options.executeTool,
        );
        toolCallsLog.push({ name: call.name, ok: isOkResult(output) });
        messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: output,
        });
      }
    }
  }

  // One model call, on the primary provider, or on the fallback one if the
  // primary failed before emitting any text (never once the visitor has
  // started reading an answer, nor when the caller aborted).
  private async complete(
    messages: AiChatMessage[],
    options: {
      tools?: ToolDefinition[];
      onText: (delta: string) => void;
      signal?: AbortSignal;
    },
  ): Promise<CompletionResult> {
    let emitted = false;
    const onText = (delta: string) => {
      emitted = true;
      options.onText(delta);
    };

    let primaryError: unknown;
    try {
      return await this.getPrimary().stream(messages, { ...options, onText });
    } catch (error) {
      primaryError = error;
    }

    const fallback =
      emitted || options.signal?.aborted ? undefined : this.getFallback();
    if (!fallback) throw primaryError;

    console.error(
      `Primary AI provider failed, falling back to ${fallback.provider} (${fallback.model}): ${errorMessage(primaryError)}`,
    );
    return fallback.stream(messages, { ...options, onText });
  }

  // Returns the JSON string fed back to the model. Never throws.
  private async executeToolCall(
    call: ToolCall,
    tools: ToolDefinition[],
    executeTool: ToolExecutor | undefined,
  ): Promise<string> {
    if (!tools.some((tool) => tool.name === call.name)) {
      return toolError("unknown_tool");
    }
    if (!executeTool) return toolError("tool_unavailable");

    let args: unknown;
    try {
      args = JSON.parse(call.arguments || "{}");
    } catch {
      return toolError("invalid_arguments");
    }

    try {
      return await executeTool(call.name, args);
    } catch (error) {
      console.error(`Tool "${call.name}" failed: ${errorMessage(error)}`);
      return toolError("tool_failed");
    }
  }
}

function isOkResult(output: string): boolean {
  try {
    return JSON.parse(output)?.ok === true;
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
