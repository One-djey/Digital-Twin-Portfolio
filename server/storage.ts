import type { ChatMessage, InsertChatMessage } from "@shared/schema";

export interface IStorage {
  getMessages(): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
  resetMessages(): Promise<void>;
}

export class MemStorage implements IStorage {
  private messages: ChatMessage[];
  private currentId: number;

  constructor() {
    this.messages = [{
      id: 0,
      role: "assistant",
      content: (async () => (await import("../client/src/data/portfolio.json")).default.intro.chatIntro)(),
      timestamp: new Date()
    }];
    this.currentId = 1;
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.messages;
  }

  async resetMessages(): Promise<void> {
    this.messages = [{
      id: 0,
      role: "assistant", 
      content: (async () => (await import("../client/src/data/portfolio.json")).default.intro.chatIntro)(),
      timestamp: new Date()
    }];
    this.currentId = 1;
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