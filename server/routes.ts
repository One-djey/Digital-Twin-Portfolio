import { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts";
import { insertChatMessageSchema } from "../shared/schema.ts";
import { logger, logRequest } from '../shared/logger.ts'; // Importez le logger
import { digitalTwinAgent } from "./ai/DigitalTwinAgent.ts";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(logRequest); // Utilisez le middleware de logging personnalisé

  app.post("/api/chat/reset", async (_req, res) => {
    try {
      await storage.resetMessages();
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error:any) {
      logger.error("Error resetting messages: " + error.message);
      res.status(500).json({ message: "Failed to reset messages" });
    }
  });

  app.get("/api/chat", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error:any) {
      logger.error("Error fetching messages: " + error.message);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const result = insertChatMessageSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid message format" });
        return;
      }

      await storage.createMessage({
        role: "user",
        content: result.data.content,
      });

      const messages = await storage.getMessages();
      const aiResponse = await digitalTwinAgent.getResponse(messages);

      await storage.createMessage({
        role: "assistant",
        content: aiResponse,
      });

      const allMessages = await storage.getMessages();
      allMessages.forEach(msg => console.log(`[chat] ${msg.role}: ${msg.content}`));
      res.json(allMessages);
    } catch (error:any) {
      logger.error("Error processing chat: " + error.message);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
