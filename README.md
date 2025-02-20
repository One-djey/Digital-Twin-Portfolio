# Digital Twin Portfolio
Create your own digital twin portfolio by following those steps.

# Requirements
We assume you have a developpment settup with Node.js, git and vercel CLI.

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

Optionnaly:
- `npm run start` launch the app locally _(to check if your info has been updated)_
- `vercel build` build the app locally as if it was built on vercel _(to check if it builds)_.
- `vercel dev` launch the app locally as if it was deployed on vercel. Add `VERCEL=true` at the end of your `.env` file before. _(to check before it's deployed)_
- `vercel --prod` deploy the app on Vercel in production environnement _(by default, Vercel redeploy your project every commit)_.

## Save your nfo
Register your changes:
`git add .` stage all changes
`git commit -m "updated portfolio"` add a commit
`git push -u origin main`

## Deploy your twin
Go on https://vercel.com/. Create a account with GitHub or login.
Create a project linked to your forked Digital-Twin-Portfolio repo.
Wait for the build and get your vercel app URL!
You can also link an existing domain name or use as is.

*Congrats! Your clone is online!*