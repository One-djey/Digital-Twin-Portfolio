import express, { type Request, Response, NextFunction } from "express";
import { VercelRequest, VercelResponse } from "@vercel/node";
import { registerRoutes } from "./routes.ts";
import { setupVite, serveStatic, log } from "./vite.ts";
import 'dotenv/config';
import { logRequest } from '../shared/logger.ts';

const app = express();

// Assurez-vous que le middleware de logging est utilisé avant les autres middlewares
// app.use(logRequest); // Utilisez le middleware de logging personnalisé
if (!process.env.VERCEL) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

const environment = process.env.VERCEL || process.env.NODE_ENV;
console.log(`The application is starting in ${environment} mode...`);

const serverPromise = (async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (!process.env.VERCEL) {
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }

  return app;
})();

// Export pour Vercel (fonction serverless)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appInstance = await serverPromise;
  return appInstance(req, res);
}
