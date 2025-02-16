import type { ChatMessage, InsertChatMessage } from "@shared/schema";
import { portfolioData } from "../shared/portfolio.ts";

export interface IStorage {
  getMessages(): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  resetMessages(): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: ChatMessage[];
  private currentId: number;

  constructor() {
    this.messages = [
      {
        id: 0,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ];
    this.currentId = 1;
    this.initializeMessages();
  }

  private async initializeMessages() {
    this.messages[0].content = portfolioData.intro.chatIntro;
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.messages;
  }

  async resetMessages(): Promise<void> {
    try {
      // Reset complet
      this.messages = [];
      this.currentId = 0;
      // Ajouter le message initial
      this.messages.push({
        id: this.currentId++,
        role: "assistant",
        content: portfolioData.intro.chatIntro,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to reset messages:", error);
      throw new Error("Could not reset messages.");
    }
  }

  async createMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: this.currentId++,
      ...insertMessage,
      timestamp: new Date(),
    };
    this.messages.push(message);
    return message;
  }
}

export const storage = new MemStorage();
