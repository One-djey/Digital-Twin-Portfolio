import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { insertChatMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/chat", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
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

      const userMessage = await storage.createMessage({
        role: "user",
        content: result.data.content,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        messages: [
          {
            role: "system",
            content: "You are Christina's AI clone. Respond in a friendly, professional manner while maintaining her personality as a Full Stack Developer & AI Enthusiast. Keep responses concise and engaging.",
          },
          {
            role: "user",
            content: result.data.content,
          },
        ],
      });

      const aiMessage = await storage.createMessage({
        role: "assistant",
        content: response.choices[0].message.content ?? "I apologize, I couldn't process that.",
      });

      res.json([userMessage, aiMessage]);
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}