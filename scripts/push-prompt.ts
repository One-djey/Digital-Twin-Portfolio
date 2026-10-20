import "dotenv/config";
import { getLangfuseClient } from "../server/tracing.ts";
import {
  DIGITAL_TWIN_PROMPT_NAME,
  DIGITAL_TWIN_PROMPT_TEMPLATE,
  DIGITAL_TWIN_PROMPT_VARIABLES,
} from "../server/ai/prompts/digitalTwin.ts";

// Creates a new version of the Langfuse system prompt from the local template
// (server/ai/prompts/digitalTwin.ts). Without flags the version only gets
// Langfuse's automatic `latest` label; `--label <name>` (repeatable) adds
// labels, e.g. `--label candidate` to eval it or `--label production` to
// deploy it. `-m <message>` sets the commit message.
//
//   npm run prompt:push -- --label candidate -m "Shorter replies"

function parseArgs() {
  const labels: string[] = [];
  let message: string | undefined;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--label") labels.push(argv[++i]);
    else if (argv[i] === "-m") message = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return { labels, message };
}

async function main() {
  const langfuse = getLangfuseClient();
  if (!langfuse) {
    console.error("LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY are not set.");
    process.exit(2);
  }

  const { labels, message } = parseArgs();
  const prompt = await langfuse.prompt.create({
    name: DIGITAL_TWIN_PROMPT_NAME,
    type: "text",
    prompt: DIGITAL_TWIN_PROMPT_TEMPLATE,
    labels,
    commitMessage: message ?? "Pushed from the local template",
    // Documents the variables the code fills in (DIGITAL_TWIN_PROMPT_VARIABLES).
    config: { variables: Object.keys(DIGITAL_TWIN_PROMPT_VARIABLES) },
  });
  console.log(
    `Created ${prompt.name} v${prompt.version}` +
      (labels.length ? ` with labels: ${labels.join(", ")}` : ""),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
