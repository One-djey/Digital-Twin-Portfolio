import type { Express } from "express";
import { checkDatabaseHealth, purgeExpiredData } from "../storage.ts";

export function registerHealthRoutes(app: Express) {
  app.get("/api/health", async (req, res) => {
    const database = await checkDatabaseHealth();

    const aiProvider = {
      mistral: { configured: Boolean(process.env.MISTRAL_API_KEY) },
      openai: { configured: Boolean(process.env.OPENAI_API_KEY) },
    };

    const email = {
      configured: Boolean(process.env.RESEND_API_KEY),
    };

    // Retention purge piggybacks on the daily UptimeRobot ping. A purge
    // failure is reported but never changes the health status.
    let purge: unknown = null;
    if (database.up) {
      try {
        purge = await purgeExpiredData();
      } catch (error: any) {
        console.error("Purge failed: " + error.message);
        purge = { error: error.message };
      }
    }

    const services = { database, aiProvider, email };
    const isUp = database.up; // seul service vérifié activement (les autres ne font que constater la présence des clés, pour éviter des appels payants)
    const status = isUp ? "ok" : "down";

    res.status(isUp ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      services,
      purge,
    });
  });
}
