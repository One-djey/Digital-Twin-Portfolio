import express from "express";
import { registerRoutes } from "./routes.ts";
import { requestLogger, errorHandler } from "./middleware.ts";
import "dotenv/config";

// Local-only dev entrypoint. Never referenced by the esbuild command that
// produces dist/server/index.js, so vite/@vitejs/plugin-react (devDependencies)
// can never end up hoisted into the Vercel serverless bundle. See CLAUDE.md
// for why the old single-entrypoint approach broke production.

console.log("Starting dev server... Current directory:", process.cwd());

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);

(async () => {
  const server = await registerRoutes(app);

  app.use(errorHandler);

  const { setupVite, serveStatic } = await import("./vite.ts");
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT: number = Number(process.env.PORT) || 5000;
  const HOSTNAME: string = process.env.HOSTNAME || "0.0.0.0";
  server.listen(PORT, HOSTNAME, () => {
    console.log(`serving on ${HOSTNAME}:${PORT}`);
  });
})();
