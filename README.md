# Digital Twin Portfolio

This project is an AI agent answering as a clone of the proprietary user, based on information provided on its portfolio.
It is under MIT License, so you can copy and use freely as long as you mention the author.
You are warmly welcome to collaborate and suggest changes, bug fix or improvements.

Create your own digital twin portfolio by following those steps...

# Requirements

We assume you have a developpment settup with [Node.js](https://nodejs.org/en/download), [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [vercel CLI](https://vercel.com/docs/cli#installing-vercel-cli) (optional).

## Download the project
On the original [Digital-Twin-Portfolio](https://github.com/One-djey/Digital-Twin-Portfolio) GitHub repo, clic on *"Fork"* > Create fork.

On your forked project, clic on *"Code"*, copy the HTTPS or SSH URL.

Open a terminal.

`git clone [the_github_URL]` to clone your forked project.

`cd Digital-Twin-Portfolio` to go inside the project's folder.

## Install dependancies

`npm install` install dependcies _(required to develop)_

## Update your info

Change all the the information pieces inside the `./shared/portfolio.ts` with your own data. 

`npm run build` rebuild the project _(re-generate the ./dist folder)_

## Run locally (Optionnal)

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

## Deploy your twin

Go on https://vercel.com/. Create a account with GitHub or login.

Create a project linked to your forked Digital-Twin-Portfolio repo.

Add the environnement variables:

- `MISTRAL_API_KEY`, or OPENAI_API_KEY depending if ou changed the model you choosed. By default, Mistral. Get your key on the respective platform.

- `DATABASE_URL`, get your URL on Supabase project's dashboard, clic on the "connect" button on top of the page, copy the "Transaction pooler" URL.


Build and get your vercel app URL!

You can also link an existing domain name or use as is.


# *Congrats, Your clone is online!*