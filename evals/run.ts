import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { cases, type EvalCase } from "./cases.ts";
import { judge } from "./judge.ts";
import {
  runTarget,
  targetName,
  targetPrompt,
  type EvalMessage,
} from "./target.ts";

// Mistral free tier: ~1 request/second, plus a per-minute budget that a full
// run exceeds at 1.1 s spacing (429 "Rate limit exceeded", code 1300), which
// silently pushes the target down to a weaker fallback model mid-run.
const MIN_GAP_MS = Number(process.env.EVAL_MIN_GAP_MS ?? 2500);
const RETRY_DELAY_MS = 10_000;
const PASS_RATE_THRESHOLD = 0.85;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Spaces ANY two API calls (target and judge) and retries twice on 429.
let lastCallAt = 0;
async function paced<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    try {
      return await fn();
    } catch (error) {
      const msg = String(error);
      const status = (error as { statusCode?: number }).statusCode;
      const is429 = status === 429 || /\b429\b/.test(msg);
      if (is429 && attempt < 2) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }
}

function parseArgs() {
  const ids: string[] = [];
  let category: string | undefined;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--case") ids.push(argv[++i]);
    else if (argv[i] === "--category") category = argv[++i];
  }
  return { ids, category };
}

function countSentences(text: string): number {
  return text.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý*\-\d])/).filter((s) => s.trim())
    .length;
}

type CaseResult = {
  id: string;
  category: string;
  critical: boolean;
  pass: boolean;
  score: number | null;
  reason: string;
  failures: string[];
  conversation: EvalMessage[];
  finalReply: string;
  toolCalls: { name: string; args: unknown }[];
  error?: string;
};

async function runCase(c: EvalCase): Promise<CaseResult> {
  const conversation: EvalMessage[] = [...(c.history ?? [])];
  const toolCalls: { name: string; args: unknown }[] = [];
  const base = { id: c.id, category: c.category, critical: c.critical };
  let finalReply = "";
  try {
    for (const turn of c.turns) {
      conversation.push({ role: "user", content: turn });
      const res = await paced(() => runTarget(conversation));
      toolCalls.push(...res.toolCalls);
      finalReply = res.text;
      conversation.push({ role: "assistant", content: res.text });
    }
  } catch (error) {
    return {
      ...base,
      pass: false,
      score: null,
      reason: `target error: ${String(error).slice(0, 120)}`,
      failures: ["target error"],
      conversation,
      finalReply,
      toolCalls,
      error: String(error),
    };
  }

  const failures: string[] = [];
  for (const re of c.mustMatch ?? [])
    if (!re.test(finalReply)) failures.push(`missing ${re}`);
  for (const re of c.mustNotMatch ?? [])
    if (re.test(finalReply)) failures.push(`forbidden ${re}`);
  if (c.maxSentences && countSentences(finalReply) > c.maxSentences)
    failures.push(`more than ${c.maxSentences} sentences`);
  if (c.expectTool === "none" && toolCalls.length > 0)
    failures.push(
      `unexpected tool call: ${toolCalls.map((t) => t.name).join(",")}`,
    );
  if (c.expectTool === "submit_lead") {
    const lead = toolCalls.filter((t) => t.name === "submit_lead").at(-1);
    if (!lead) failures.push("submit_lead not called");
    else if (c.expectToolArgs && !c.expectToolArgs(lead.args))
      failures.push(`submit_lead args rejected: ${JSON.stringify(lead.args)}`);
  }

  let score: number | null = null;
  let reason = "";
  let judgePass = false;
  try {
    // The judge conversation excludes the scripted-vs-live distinction.
    const v = await judge(
      { rubric: c.rubric, conversation, finalReply, toolCalls },
      paced,
    );
    score = v.score;
    reason = v.reason;
    judgePass = v.pass;
  } catch (error) {
    reason = `judge error: ${String(error).slice(0, 120)}`;
    failures.push(reason);
  }
  if (!judgePass && score !== null) failures.push(`judge: ${reason}`);

  return {
    ...base,
    pass: failures.length === 0 && judgePass,
    score,
    reason:
      failures.length && failures[0] !== `judge: ${reason}`
        ? failures[0]
        : reason,
    failures,
    conversation,
    finalReply,
    toolCalls,
  };
}

const pct = (n: number, d: number) =>
  d ? `${Math.round((100 * n) / d)}% (${n}/${d})` : "n/a";

async function main() {
  const { ids, category } = parseArgs();
  const selected = cases.filter(
    (c) =>
      (!ids.length || ids.includes(c.id)) &&
      (!category || c.category === category),
  );
  if (!selected.length) {
    console.error("No case selected");
    process.exit(2);
  }
  const unknown = ids.filter((id) => !cases.some((c) => c.id === id));
  if (unknown.length) console.error(`Unknown case ids: ${unknown.join(", ")}`);

  const prompt = await targetPrompt();
  console.log(`Target: ${targetName} — ${selected.length} case(s)`);
  console.log(`Prompt: ${prompt}\n`);
  const results: CaseResult[] = [];
  for (const c of selected) {
    const r = await runCase(c);
    results.push(r);
    console.log(
      `${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(24)} ${r.category.padEnd(12)} ${
        r.critical ? "CRIT" : "    "
      } score=${r.score ?? "-"}  ${r.reason.replace(/\s+/g, " ").slice(0, 90)}`,
    );
  }

  const passed = results.filter((r) => r.pass).length;
  const crit = results.filter((r) => r.critical);
  const critPassed = crit.filter((r) => r.pass).length;
  const byCategory: Record<string, { pass: number; total: number }> = {};
  for (const r of results) {
    byCategory[r.category] ??= { pass: 0, total: 0 };
    byCategory[r.category].total++;
    if (r.pass) byCategory[r.category].pass++;
  }

  console.log(`\nOverall:  ${pct(passed, results.length)}`);
  console.log(`Critical: ${pct(critPassed, crit.length)}`);
  for (const [cat, v] of Object.entries(byCategory))
    console.log(`  ${cat.padEnd(14)} ${pct(v.pass, v.total)}`);

  mkdirSync("evals/results", { recursive: true });
  const file = `evals/results/${new Date().toISOString().replace(/[:.]/g, "-")}-${targetName}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      {
        target: targetName,
        prompt,
        date: new Date().toISOString(),
        summary: {
          overall: { passed, total: results.length },
          critical: { passed: critPassed, total: crit.length },
          byCategory,
        },
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\nResults: ${file}`);

  const critFailed = crit.length - critPassed;
  process.exit(
    critFailed > 0 || passed / results.length < PASS_RATE_THRESHOLD ? 1 : 0,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
