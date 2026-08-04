import "dotenv/config";
import express from "express";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { registerRoutes } from "./routes.ts";
import { requestLogger, errorHandler } from "./middleware.ts";

// Vercel serverless entrypoint only. For local development, use
// `server/dev.ts` (npm run dev) instead — see CLAUDE.md "Two server
// entrypoints" for why the two are kept separate: this file's import graph
// must never reach server/vite.ts, or vite/@vitejs/plugin-react
// (devDependencies) get hoisted into the esbuild bundle and crash the
// deployed function.

console.log("Starting server... Current directory:", process.cwd());

const app = express();

app.use(requestLogger);

const environment = process.env.VERCEL_ENV || process.env.NODE_ENV;
console.log(`The application is starting in ${environment} mode...`);

const serverPromise = (async () => {
  const server = await registerRoutes(app);

  app.use(errorHandler);

  return app;
})();

// Export pour Vercel (fonction serverless)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appInstance = await serverPromise;
  return appInstance(req, res);
}
