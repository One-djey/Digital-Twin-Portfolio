import type { ChatMessage, InsertChatMessage } from "@shared/schema";

export interface IStorage {
  getMessages(): Promise<ChatMessage[]>;
  createMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class MemStorage implements IStorage {
  private messages: ChatMessage[];
  private currentId: number;

  constructor() {
    this.messages = [{
      id: 0,
      role: "assistant",
      content: require("../client/src/data/portfolio.json").intro.chatIntro,
      timestamp: new Date()
    }];
    this.currentId = 1;
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.messages;
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
