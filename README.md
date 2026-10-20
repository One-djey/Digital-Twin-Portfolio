# Digital Twin Portfolio

This project is an AI agent answering as a clone of the proprietary user, based on information provided on its portfolio.
It is under MIT License, so you can copy and use freely as long as you mention the author.
You are warmly welcome to collaborate and suggest changes, bug fix or improvements.

Create your own digital twin portfolio by following those steps...

# Requirements

We assume you have a development setup with [Node.js](https://nodejs.org/en/download), [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [vercel CLI](https://vercel.com/docs/cli#installing-vercel-cli) (optional).

## Download the project
On the original [Digital-Twin-Portfolio](https://github.com/One-djey/Digital-Twin-Portfolio) GitHub repo, clic on *"Fork"* > Create fork.

On your forked project, clic on *"Code"*, copy the HTTPS or SSH URL.

Open a terminal.

`git clone [the_github_URL]` to clone your forked project.

`cd Digital-Twin-Portfolio` to go inside the project's folder.

## Install dependencies

`npm install` installs dependencies _(required to develop)_

## Update your info

Change all the pieces of information inside `./shared/portfolio.ts` with your own data.

The `legal` block of the same file (publisher, SIRET, host, sub-processors, retention periods) feeds the legal notice and privacy policy pages (`/legal/mentions-legales`, `/legal/confidentialite`): fill it in with your own details, and have the texts checked, they are not legal advice. 

`npm run build` rebuild the project _(re-generate the ./dist folder)_

## Run locally (Optional)

Unfortuatly I have a bug you can help me fix, but the local run is temporary deactivated.

You can uncomment the code in `./server/index.ts` to make it work locally, but it will not work on Vercel or vice-versa.
- `npm run start` launch the app locally _(to check if your info has been updated)_
- `vercel build` build the app locally as if it was built on vercel _(to check if it builds)_.
- `vercel dev` launch the app locally as if it was deployed on vercel. Add `VERCEL=true` at the end of your `.env` file before. _(to check before it's deployed)_
- `vercel --prod` deploy the app on Vercel in production environnement _(by default, Vercel redeploy your project every commit)_.

## Save your info

Register your changes:

`git add .` stage all changes

`git commit -m "updated portfolio"` add a commit

`git push -u origin main`

## Create a database

Go on https://supabase.com/, "Start your project".

Go to the SQL Editor and copy/paste the content of the file `init_supabase.sql`.

### Database migrations

Later schema changes live in `db/migrations/` (`NNN_name.sql`, with a matching `.down.sql` to revert). They are not applied automatically: copy/paste them in the Supabase SQL Editor, in order. `init_supabase.sql` always contains the full, up-to-date schema, so a fresh database only needs that file.

## Deploy your twin

Go on https://vercel.com/. Create a account with GitHub or login.

Create a project linked to your forked Digital-Twin-Portfolio repo.

Add the environment variables:

- `DATABASE_URL`: get your URL on the Supabase project's dashboard, click on the "Connect" button on top of the page, copy the "Transaction pooler" URL.

- `MISTRAL_API_KEY`, or `OPENAI_API_KEY` depending on the model you chose in `shared/portfolio.ts` (`ai_clone.model`). By default, Mistral. Get your key on the respective platform. If you set both keys, the other provider is used as a fallback when the main one fails.

- `RESEND_API_KEY`: [Resend](https://resend.com/) API key, used to email you contact-form messages and leads collected by the chat. Without it the site works, but you receive no emails.

- `RATE_LIMIT_SALT`: any long random string. It is used to hash visitors' IP addresses in the rate limiter (raw IPs are never stored).

- `CHAT_DAILY_CAP` _(optional)_: maximum number of assistant replies per day, to cap your AI bill. Default: 300.

- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL` _(optional)_: enable Langfuse tracing and prompt management, see below.

Build and get your vercel app URL!

You can also link an existing domain name or use as is.


## Observability and prompt management with Langfuse (optional)

[Langfuse](https://langfuse.com/) lets you read every conversation of your twin (model calls, tool calls, tokens, latency, errors, visitors' 👍/👎) and edit the assistant's instructions without redeploying. Everything works without it: no keys, no tracing, and the prompt comes from the code.

1. Create a project on [Langfuse Cloud](https://cloud.langfuse.com) (EU region by default), then create an API key pair in *Settings > API Keys*.
2. Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` and `LANGFUSE_BASE_URL` (`https://cloud.langfuse.com` for the EU region) in your `.env` and on Vercel.
3. Create the prompt in your project from the local template: `npm run prompt:push -- --label production`.

**Tracing.** One trace per chat answer, grouped by conversation (*Sessions* view), with the feedback as a `thumbs_up` score. Email addresses and phone numbers are masked and the contact details passed on by the chat are never sent. Only answered messages keep their content, and the "New conversation" button and the 60-day retention purge also delete the matching traces. Langfuse is listed as a sub-processor in the `legal` block of `shared/portfolio.ts`: remove it there if you don't use it.

**Prompt management.** The assistant's instructions are the Langfuse text prompt `digital-twin/system`; your facts stay in `shared/portfolio.ts` and are inserted as `{{variables}}`. The app uses the version labelled `production` (refreshed every minute), and falls back to the template in `server/ai/prompts/digitalTwin.ts` if Langfuse is unreachable. To change the prompt:

1. Edit it in the Langfuse UI and give the new version the `candidate` label (or edit the local template and run `npm run prompt:push -- --label candidate -m "what changed"`).
2. Test it: `LANGFUSE_PROMPT_LABEL=candidate npm run eval`.
3. Move the `production` label to that version in Langfuse: the site uses it within a minute, no deploy needed.
4. Copy the new text into `DIGITAL_TWIN_PROMPT_TEMPLATE` (`server/ai/prompts/digitalTwin.ts`) at your next commit, so the fallback stays up to date.

## Evals

`npm run eval` plays a set of test conversations (rates, availability, lead collection, language switching, prompt injection...) against the assistant and scores the answers with an LLM judge. It needs `MISTRAL_API_KEY` and writes a report in `evals/results/`. With the Langfuse keys set, it evaluates the Langfuse prompt labelled `production`, or the one named by `LANGFUSE_PROMPT_LABEL`, and prints which version it ran. Use `--case <id>` or `--category <name>` to run a subset, and `JUDGE_MODEL` to choose the judge. The command exits with a non-zero code if a critical case fails or the pass rate is below 85 %. Calls are spaced out to respect Mistral's free tier, so a full run takes a few minutes.

# *Congrats, Your clone is online!*