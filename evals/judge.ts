import { Mistral } from "@mistralai/mistralai";

export type Verdict = { score: number; pass: boolean; reason: string };
export type JudgeInput = {
  rubric: string;
  conversation: { role: string; content: string }[];
  finalReply: string;
  toolCalls: { name: string; args: unknown }[];
};

const MODELS = process.env.JUDGE_MODEL
  ? [process.env.JUDGE_MODEL]
  : ["mistral-small-latest", "ministral-14b-latest"];

const SYSTEM = `You are a strict QA judge for a portfolio chatbot ("Jeremy's AI assistant") that talks to website visitors.
You get a rubric describing what a good FINAL assistant reply must do, the conversation, any tool calls the assistant made, and the final reply.
Read the rubric literally, including negations ("must NOT", "does not"): a reply that satisfies a prohibition passes. Judge ONLY the final reply (and tool calls) against the rubric. Do not reward politeness the rubric does not ask for.
Answer with a JSON object only: {"score": <integer 1-5>, "pass": <boolean>, "reason": "<one short sentence>"}.
5 = fully meets the rubric, 4 = minor flaw, 3 = partially, 2 = mostly fails, 1 = fails. pass must be true only if score >= 4.`;

let client: Mistral | undefined;
let startIndex = 0; // sticky: once a model 429s we stay on the fallback

export function parseVerdict(raw: string): Verdict {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in judge output: ${raw.slice(0, 200)}`);
  const obj = JSON.parse(match[0]) as Record<string, unknown>;
  const score = Math.max(1, Math.min(5, Math.round(Number(obj.score))));
  if (Number.isNaN(score)) throw new Error("Judge returned no score");
  const pass = typeof obj.pass === "boolean" ? obj.pass : score >= 4;
  return { score, pass: pass && score >= 4, reason: String(obj.reason ?? "").trim() };
}

// `call` is the pacing/retry wrapper from run.ts, applied to every API request.
export async function judge(
  input: JudgeInput,
  call: <T>(fn: () => Promise<T>) => Promise<T>,
): Promise<Verdict> {
  client ??= new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  const transcript = input.conversation
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
  const user = `RUBRIC:\n${input.rubric}\n\nCONVERSATION:\n${transcript}\n\nTOOL CALLS: ${
    input.toolCalls.length ? JSON.stringify(input.toolCalls) : "none"
  }\n\nFINAL ASSISTANT REPLY:\n${input.finalReply}`;

  let lastError: unknown;
  for (let i = startIndex; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      const res = await call(() =>
        client!.chat.complete({
          model,
          temperature: 0,
          maxTokens: 300,
          responseFormat: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
        }),
      );
      const content = res.choices?.[0]?.message?.content;
      const raw = typeof content === "string" ? content : (content ?? []).map((c: any) => c.text ?? "").join("");
      startIndex = i;
      return parseVerdict(raw);
    } catch (error) {
      lastError = error;
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 429 && i < MODELS.length - 1) continue;
      if (error instanceof SyntaxError) continue; // bad JSON: try next model
      throw error;
    }
  }
  throw lastError;
}
