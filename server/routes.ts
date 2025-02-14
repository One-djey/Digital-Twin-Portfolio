import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { insertChatMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/chat", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/chat", async (req, res) => {
    const result = insertChatMessageSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: "Invalid message format" });
      return;
    }

    const userMessage = await storage.createMessage({
      role: "user",
      content: result.data.content,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant for a portfolio website. Keep responses concise and professional.",
        },
        {
          role: "user",
          content: result.data.content,
        },
      ],
    });

    const aiMessage = await storage.createMessage({
      role: "assistant",
      content: response.choices[0].message.content || "Sorry, I couldn't process that.",
    });

    res.json([userMessage, aiMessage]);
  });

  const httpServer = createServer(app);
  return httpServer;
}
