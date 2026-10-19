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

Build and get your vercel app URL!

You can also link an existing domain name or use as is.


## Evals

`npm run eval` plays a set of test conversations (rates, availability, lead collection, language switching, prompt injection...) against the assistant and scores the answers with an LLM judge. It needs `MISTRAL_API_KEY` and writes a report in `evals/results/`. Use `--case <id>` or `--category <name>` to run a subset, and `JUDGE_MODEL` to choose the judge. The command exits with a non-zero code if a critical case fails or the pass rate is below 85 %. Calls are spaced out to respect Mistral's free tier, so a full run takes a few minutes.

# *Congrats, Your clone is online!*