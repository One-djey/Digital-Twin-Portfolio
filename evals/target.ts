import type { AiChatMessage } from "../shared/schema.ts";

// The ONLY coupling point between the evals and the app.

export type EvalMessage = { role: "user" | "assistant"; content: string };
export type TargetResult = {
  text: string;
  toolCalls: { name: string; args: unknown }[];
};

// EVAL_TARGET=baseline (default): current code, `getResponse`, no tools.
// EVAL_TARGET=run: `digitalTwinAgent.run()` with a stubbed tool executor
// (no DB, no email) — use once the new AI layer has landed.
export const targetName = process.env.EVAL_TARGET === "run" ? "run" : "baseline";

export async function runTarget(messages: EvalMessage[]): Promise<TargetResult> {
  const { digitalTwinAgent } = await import("../server/ai/DigitalTwinAgent.ts");

  if (targetName === "run") {
    const toolCalls: TargetResult["toolCalls"] = [];
    // `run` is a shim in the baseline AIAgent; typed loosely so this compiles
    // against both the shim and the final implementation.
    const agent = digitalTwinAgent as unknown as {
      run: (
        history: AiChatMessage[],
        options: { executeTool: (name: string, args: unknown) => Promise<string> },
      ) => Promise<{ text: string }>;
    };
    const result = await agent.run(messages as AiChatMessage[], {
      executeTool: async (name, args) => {
        toolCalls.push({ name, args });
        return JSON.stringify({ ok: true });
      },
    });
    return { text: result.text, toolCalls };
  }

  const text = await digitalTwinAgent.getResponse(messages as AiChatMessage[]);
  return { text, toolCalls: [] };
}
