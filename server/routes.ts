import { Express } from "express";
import { createServer, type Server } from "http";
import { registerChatRoutes } from "./routes/chat.ts";
import { registerContactRoutes } from "./routes/contact.ts";
import { registerHealthRoutes } from "./routes/health.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  try {
    // Static files are served by Vercel via vercel.json, not by Express.

    // Vercel place un proxy devant la fonction : sans ça, req.ip est celle du
    // proxy et express-rate-limit partage le même compteur entre tous les
    // visiteurs. On fait confiance au premier hop (X-Forwarded-For).
    app.set("trust proxy", 1);

    registerHealthRoutes(app);
    registerContactRoutes(app);
    registerChatRoutes(app);

    const httpServer = createServer(app);
    return httpServer;
  } catch (error) {
    console.error("Fatal error in registerRoutes:", error);
    // En cas d'erreur critique, on crée quand même un serveur minimal
    const httpServer = createServer(app);
    // On ajoute une route pour signaler l'erreur aux clients
    app.use("*", (req, res) => {
      res.status(500).send("Server initialization error");
    });
    return httpServer;
  }
}
