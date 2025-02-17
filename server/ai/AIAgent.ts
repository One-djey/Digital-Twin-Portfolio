import { OpenAIAPI } from "./APIs/OpenAI.ts";
import { MistralAPI } from "./APIs/Mistral.ts";

export abstract class AIAgent {
  protected model: string;
  protected temperature: number;
  protected maxTokens: number;
  protected systemMessage: string;
  protected apiInstance: any; // Instance de l'API

  constructor(model: string, temperature: number, maxTokens: number, systemMessage: string) {
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.systemMessage = systemMessage;

    // Choisir l'instance de l'API en fonction du modèle
    if (model.startsWith("gpt")) {
      this.apiInstance = new OpenAIAPI(model, temperature, maxTokens);
    } else if (model.startsWith("mistral")) {
      this.apiInstance = new MistralAPI(model, temperature, maxTokens);
    } else {
      throw new Error("Unsupported model type");
    }
  }

  protected async callAPI(messages: any[]): Promise<string> {
    const messagesWithContext = [
      {
        role: "system",
        content: this.systemMessage,
      },
      ...messages,
    ];
    return this.apiInstance.getResponse(messagesWithContext);
  }

  public async getResponse(messages: any[]): Promise<string> {
    return this.callAPI(messages);
  }
} 