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

export type RunOptions = {
  onText?: (delta: string) => void;
  signal?: AbortSignal;
  executeTool?: ToolExecutor;
  now?: Date;
};

export type RunResult = {
  text: string;
  model: string;
  usage: Usage;
  finishReason: string;
  latencyMs: number;
  toolCalls: { name: string; ok: boolean }[];
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
