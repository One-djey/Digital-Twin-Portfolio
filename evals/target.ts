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
