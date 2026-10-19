import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import { MistralError } from "@mistralai/mistralai/models/errors";
import type {
  ChatCompletionStreamRequest,
  ChatCompletionStreamRequestMessage,
  ContentChunk,
  UsageInfo,
} from "@mistralai/mistralai/models/components";
import type {
  AiApiInterface,
  AiChatMessage,
  CompletionResult,
  StreamOptions,
  ToolCall,
  Usage,
} from "../types.ts";

const REQUEST_TIMEOUT_MS = 30_000;
const RATE_LIMIT_RETRY_DELAY_MS = 1200;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

// Retries only transient server errors, with the SDK's exponential backoff.
// 429 is deliberately excluded: it is handled by walking down
// RATE_LIMIT_FALLBACKS instead of hammering the same model.
const RETRY_OPTIONS = {
  retries: {
    strategy: "backoff" as const,
    backoff: {
      initialInterval: 500,
      maxInterval: 4000,
      exponent: 2,
      maxElapsedTime: 10_000,
    },
    retryConnectionErrors: true,
  },
  retryCodes: ["500", "502", "503", "504"],
};

export class MistralAPI implements AiApiInterface {
  public readonly provider = "mistral" as const;
  private client: Mistral;
  private temperature: number;
  private maxTokens: number;

  // Check Pricing: https://mistral.ai/en/products/la-plateforme#pricing
  public static readonly MODELS = [
    "mistral-large-latest",
    "pixtral-large-latest",
    "mistral-small-latest",
    "codestral-latest",
    "ministral-14b-latest",
    "ministral-8b-latest",
    "ministral-3b-latest",
    "mistral-embed",
    "mistral-moderation-latest",
  ];

  // Tried in order after the configured model when it answers 429. Mistral
  // gives no "latest free model" alias and doesn't expose plan coverage, so
  // we walk down to cheaper models that the free plan does cover: in 2026,
  // "mistral-small-latest" moved to Small 4, which has a 0 req/min quota on
  // the free plan, while the Ministral family stays usable.
  public static readonly RATE_LIMIT_FALLBACKS = [
    "ministral-14b-latest",
    "ministral-8b-latest",
  ];

  // How long a rate-limit fallback stays sticky before the preferred model
  // is tried again (quotas are per minute, so it may have recovered).
  public static readonly STICKY_FALLBACK_TTL_MS = 10 * 60_000;

  // The system prompt (instructions + portfolio data) is the same for every
  // visitor: a fixed cache key lets Mistral reuse that prefix across all
  // requests instead of billing it in full each time. Bump the suffix when
  // the system prompt changes structure.
  private static readonly PROMPT_CACHE_KEY = "digital-twin-agent-v2";

  // Ordered candidates and the index of the one currently in use. The index
  // is sticky for the lifetime of the instance (a Vercel function instance)
  // for STICKY_FALLBACK_TTL_MS, so only the first request after a cold start
  // (or after the TTL) pays for the 429s.
  private candidates: string[];
  private activeIndex = 0;
  private activeSince = 0;
  // Models that answered at least once on this instance.
  private knownGood = new Set<string>();

  constructor(model: string, temperature: number, maxTokens: number) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is required");
    }
    if (!MistralAPI.MODELS.includes(model)) {
      throw new Error(
        `Unsupported Mistral model "${model}". Supported models: ${MistralAPI.MODELS.join(", ")}`,
      );
    }

    this.client = new Mistral({ apiKey });
    this.candidates = [
      model,
      ...MistralAPI.RATE_LIMIT_FALLBACKS.filter((m) => m !== model),
    ];
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  // Model that the next request will start with.
  public get model(): string {
    return this.candidates[this.currentIndex()];
  }

  private currentIndex(): number {
    if (
      this.activeIndex !== 0 &&
      Date.now() - this.activeSince > MistralAPI.STICKY_FALLBACK_TTL_MS
    ) {
      this.activeIndex = 0;
    }
    return this.activeIndex;
  }

  public async stream(
    messages: AiChatMessage[],
    options: StreamOptions = {},
  ): Promise<CompletionResult> {
    const start = this.currentIndex();
    let retriedKnownGood = false;
    for (let i = start; i < this.candidates.length; i++) {
      const model = this.candidates[i];
      let emitted = false;
      try {
        const result = await this.streamOnce(model, messages, {
          ...options,
          onText: (delta) => {
            emitted = true;
            options.onText?.(delta);
          },
        });

        this.knownGood.add(model);
        if (i !== this.activeIndex) {
          console.warn(
            `Mistral model "${this.candidates[this.activeIndex]}" rate-limited, switched to "${model}"`,
          );
          this.activeIndex = i;
          this.activeSince = Date.now();
        }
        return result;
      } catch (error) {
        // Switching models is only safe while the visitor has seen nothing.
        const rateLimited =
          error instanceof MistralError && error.statusCode === 429;
        if (!emitted && rateLimited) {
          // A model that already answered on this instance has a real quota:
          // its 429 is most likely the per-second limit, so wait and retry it
          // once rather than dropping to a weaker model for the whole TTL.
          if (this.knownGood.has(model) && !retriedKnownGood) {
            retriedKnownGood = true;
            await sleep(RATE_LIMIT_RETRY_DELAY_MS, options.signal);
            i--;
            continue;
          }
          if (i < this.candidates.length - 1) continue;
        }
        throw new Error(
          `Mistral API request failed (${model}): ${describeError(error)}`,
          { cause: error },
        );
      }
    }
    throw new Error("Mistral API request failed: no candidate model left");
  }

  private async streamOnce(
    model: string,
    messages: AiChatMessage[],
    { tools, onText, signal }: StreamOptions,
  ): Promise<CompletionResult> {
    const request: ChatCompletionStreamRequest = {
      model,
      messages: messages.map(toMistralMessage),
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      promptCacheKey: MistralAPI.PROMPT_CACHE_KEY,
    };
    if (tools?.length) {
      request.tools = tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
      request.toolChoice = "auto";
      request.parallelToolCalls = false;
    }

    // When `signal` is set the SDK ignores `timeoutMs`, so the timeout has to
    // be folded into the signal itself.
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const stream = await this.client.chat.stream(request, {
      ...RETRY_OPTIONS,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });

    let text = "";
    let finishReason = "";
    let usage: UsageInfo | undefined;
    const toolCalls = new ToolCallAccumulator();

    for await (const event of stream) {
      const chunk = event.data;
      if (chunk.usage) usage = chunk.usage;

      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = extractText(choice.delta.content);
      if (delta) {
        text += delta;
        onText?.(delta);
      }

      choice.delta.toolCalls?.forEach((call, position) => {
        toolCalls.add(
          call.index ?? (call.id ? `id:${call.id}` : `pos:${position}`),
          call.id,
          call.function.name,
          call.function.arguments,
        );
      });

      if (choice.finishReason) finishReason = choice.finishReason;
    }

    const calls = toolCalls.result();
    if (finishReason === "error" && !text && !calls.length) {
      throw new Error('stream ended with finish reason "error"');
    }

    return {
      text,
      toolCalls: calls,
      finishReason: finishReason || "stop",
      usage: toUsage(usage),
      model,
    };
  }
}

// Collects tool calls across stream chunks. Mistral normally sends each call
// whole in one chunk, but string arguments are concatenated defensively in
// case it fragments them.
class ToolCallAccumulator {
  private calls = new Map<
    number | string,
    { id?: string; name: string; arguments: string }
  >();

  add(
    key: number | string,
    id: string | undefined,
    name: string,
    args: string | Record<string, unknown>,
  ) {
    const existing = this.calls.get(key);
    if (!existing) {
      this.calls.set(key, {
        id,
        name,
        arguments: typeof args === "string" ? args : JSON.stringify(args),
      });
      return;
    }
    existing.id ||= id;
    existing.name ||= name;
    existing.arguments =
      typeof args === "string"
        ? existing.arguments + args
        : JSON.stringify(args);
  }

  result(): ToolCall[] {
    return Array.from(this.calls.values())
      .filter((call) => call.name)
      .map((call) => ({
        id: call.id || randomToolCallId(),
        name: call.name,
        arguments: call.arguments || "{}",
      }));
  }
}

function extractText(
  content: string | ContentChunk[] | null | undefined,
): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .map((chunk) =>
      chunk.type === "text" && "text" in chunk ? String(chunk.text) : "",
    )
    .join("");
}

function toMistralMessage(
  message: AiChatMessage,
): ChatCompletionStreamRequestMessage {
  switch (message.role) {
    case "system":
    case "user":
      return { role: message.role, content: message.content };
    case "assistant":
      return message.toolCalls?.length
        ? {
            role: "assistant",
            content: message.content || null,
            toolCalls: message.toolCalls.map((call) => ({
              id: toMistralToolCallId(call.id),
              type: "function",
              function: { name: call.name, arguments: call.arguments },
            })),
          }
        : { role: "assistant", content: message.content };
    case "tool":
      return {
        role: "tool",
        toolCallId: toMistralToolCallId(message.toolCallId),
        name: message.name,
        content: message.content,
      };
  }
}

// Mistral only accepts tool call ids made of 9 alphanumeric characters. Ids
// coming from another provider (e.g. OpenAI's "call_...") are mapped to a
// deterministic 9-character hash so the assistant/tool pairs still match.
const ALPHANUMERIC =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function toMistralToolCallId(id: string): string {
  if (/^[a-zA-Z0-9]{9}$/.test(id)) return id;
  let hash = 2166136261; // FNV-1a
  let out = "";
  for (let round = 0; out.length < 9; round++) {
    for (const char of `${round}:${id}`) {
      hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
    }
    out += ALPHANUMERIC[hash % ALPHANUMERIC.length];
  }
  return out;
}

function randomToolCallId(): string {
  let out = "";
  for (let i = 0; i < 9; i++) {
    out += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return out;
}

function toUsage(usage: UsageInfo | undefined): Usage {
  if (!usage) return { inputTokens: 0, outputTokens: 0 };
  // Cached prompt tokens are not typed by the SDK: read every known shape.
  const raw = usage as Record<string, any>;
  const cached =
    raw.promptTokensDetails?.cachedTokens ??
    raw.prompt_tokens_details?.cached_tokens ??
    raw.numCachedTokens ??
    raw.num_cached_tokens;
  return {
    inputTokens: usage.promptTokens ?? 0,
    outputTokens: usage.completionTokens ?? 0,
    ...(typeof cached === "number" ? { cachedTokens: cached } : {}),
  };
}

function describeError(error: unknown): string {
  if (error instanceof MistralError) {
    return `HTTP ${error.statusCode}: ${error.message}`;
  }
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}
