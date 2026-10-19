import type { Request, Response, NextFunction } from "express";

// Shared between server/index.ts (Vercel entrypoint) and server/dev.ts
// (local entrypoint). Only depends on express, so importing it from either
// entrypoint never risks pulling vite/@vitejs/plugin-react into the
// esbuild-bundled Vercel function — see CLAUDE.md for why that matters.

export function requestLogger(req: Request, res: Response, next: NextFunction) {
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
      // Response bodies are only logged for errors (they are small and
      // contain no visitor content); successful bodies may hold chat messages.
      if (capturedJsonResponse && res.statusCode >= 400) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status: number = err.status || err.statusCode || 500;
  // Same shape as ChatErrorBody; never leak internal error details.
  const body =
    status < 500
      ? { code: "invalid_request", message: "Invalid request." }
      : { code: "internal_error", message: "Internal Server Error" };
  console.error(`Unhandled error (${status}): ${err?.message ?? err}`);
  if (res.headersSent) return;
  res.status(status).json(body);
}
