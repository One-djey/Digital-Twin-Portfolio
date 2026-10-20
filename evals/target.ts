import type { AiChatMessage } from "../server/ai/types.ts";

// The ONLY coupling point between the evals and the app.

export type EvalMessage = { role: "user" | "assistant"; content: string };
export type TargetResult = {
  text: string;
  toolCalls: { name: string; args: unknown }[];
};

// `digitalTwinAgent.run()` with a stubbed tool executor (no DB, no email)
// that records every call and reports success.
export const targetName = "run";

export async function runTarget(
  messages: EvalMessage[],
): Promise<TargetResult> {
  const { digitalTwinAgent } = await import("../server/ai/DigitalTwinAgent.ts");
  const toolCalls: TargetResult["toolCalls"] = [];
  const history: AiChatMessage[] = messages.map((m) => ({ ...m }));
  const result = await digitalTwinAgent.run(history, {
    executeTool: async (name, args) => {
      toolCalls.push({ name, args });
      return JSON.stringify({ ok: true });
    },
  });
  return { text: result.text, toolCalls };
}

// System prompt version the target runs on: the Langfuse version with label
// LANGFUSE_PROMPT_LABEL (default "production"), or the local template.
export async function targetPrompt(): Promise<string> {
  const { buildSystemPrompt } = await import(
    "../server/ai/prompts/digitalTwin.ts"
  );
  const { prompt } = await buildSystemPrompt(new Date());
  if (!prompt) return "local template (Langfuse not configured)";
  const label = process.env.LANGFUSE_PROMPT_LABEL || "production";
  return prompt.isFallback
    ? `local template (Langfuse fetch of label "${label}" failed)`
    : `${prompt.name} v${prompt.version} (label "${label}")`;
}
