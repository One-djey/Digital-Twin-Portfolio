import "dotenv/config";
import OpenAI from "openai";
import type {
  AiApiInterface,
  AiChatMessage,
  CompletionResult,
  StreamOptions,
  ToolCall,
  Usage,
} from "../types.ts";

const REQUEST_TIMEOUT_MS = 30_000;

export class OpenAIAPI implements AiApiInterface {
  public readonly provider = "openai" as const;
  public readonly model: string;
  private client: OpenAI;
  private temperature: number;
  private maxTokens: number;

  // Check pricing: https://platform.openai.com/docs/pricing
  public static readonly MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "o1",
    "o1-mini",
    "o3-mini",
  ];

  constructor(model: string, temperature: number, maxTokens: number) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    if (!OpenAIAPI.MODELS.includes(model)) {
      throw new Error(
        `Unsupported OpenAI model "${model}". Supported models: ${OpenAIAPI.MODELS.join(", ")}`,
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  public async stream(
    messages: AiChatMessage[],
    { tools, onText, signal }: StreamOptions = {},
  ): Promise<CompletionResult> {
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: messages.map(toOpenAIMessage),
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
          ...(tools?.length
            ? {
                tools: tools.map((tool) => ({
                  type: "function" as const,
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                  },
                })),
                tool_choice: "auto" as const,
                parallel_tool_calls: false,
              }
            : {}),
        },
        { timeout: REQUEST_TIMEOUT_MS, maxRetries: 2, signal },
      );

      let text = "";
      let finishReason = "";
      let usage: OpenAI.CompletionUsage | undefined;
      // Tool calls arrive fragmented: the first fragment of an index carries
      // the id and name, the following ones pieces of the JSON arguments.
      const calls = new Map<
        number,
        { id: string; name: string; arguments: string }
      >();

      for await (const chunk of stream) {
        if (chunk.usage) usage = chunk.usage;

        const choice = chunk.choices[0];
        if (!choice) continue;

        const delta = choice.delta?.content;
        if (delta) {
          text += delta;
          onText?.(delta);
        }

        for (const fragment of choice.delta?.tool_calls ?? []) {
          const call = calls.get(fragment.index) ?? {
            id: "",
            name: "",
            arguments: "",
          };
          if (fragment.id) call.id = fragment.id;
          if (fragment.function?.name) call.name += fragment.function.name;
          if (fragment.function?.arguments) {
            call.arguments += fragment.function.arguments;
          }
          calls.set(fragment.index, call);
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      const toolCalls: ToolCall[] = Array.from(calls.entries())
        .sort(([a], [b]) => a - b)
        .filter(([, call]) => call.name)
        .map(([index, call]) => ({
          id: call.id || `call_${index}_${Date.now().toString(36)}`,
          name: call.name,
          arguments: call.arguments || "{}",
        }));

      return {
        text,
        toolCalls,
        finishReason: finishReason || "stop",
        usage: toUsage(usage),
        model: this.model,
      };
    } catch (error) {
      throw new Error(
        `OpenAI API request failed (${this.model}): ${describeError(error)}`,
        { cause: error },
      );
    }
  }
}

function toOpenAIMessage(
  message: AiChatMessage,
): OpenAI.Chat.ChatCompletionMessageParam {
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
              type: "function" as const,
              function: { name: call.name, arguments: call.arguments },
            })),
          }
        : { role: "assistant", content: message.content };
    case "tool":
      return {
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content,
      };
  }
}

function toUsage(usage: OpenAI.CompletionUsage | undefined): Usage {
  if (!usage) return { inputTokens: 0, outputTokens: 0 };
  const cached = usage.prompt_tokens_details?.cached_tokens;
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    ...(typeof cached === "number" ? { cachedTokens: cached } : {}),
  };
}

function describeError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return `HTTP ${error.status ?? "?"}: ${error.message}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
