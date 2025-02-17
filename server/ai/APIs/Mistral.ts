import 'dotenv/config'; // Assurez-vous que dotenv est importé
import { Mistral } from '@mistralai/mistralai';
import { AiApiInterface } from './AiApiInterface';

export class MistralAPI implements AiApiInterface {
  public client: Mistral;
  public model: string;
  public temperature: number;
  public maxTokens: number;

  // Check Pricing: https://mistral.ai/en/products/la-plateforme#pricing
  public static readonly MODELS = [
    "mistral-large-latest",
    "pixtral-large-latest",
    "mistral-small-latest",
    "codestral-latest",
    "ministral-8b-latest",
    "ministral-3b-latest",
    "mistral-embed",
    "mistral-moderation-latest"
  ];

  constructor(model: string, temperature: number, maxTokens: number) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is required");
    }
    
    this.client = new Mistral({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  public async getResponse(messages: { role: string; content: string }[]): Promise<string> {
    try {
      const chatResponse = await this.client.chat.complete({
        model: this.model,
        messages: messages as any,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        stream: false,
      });
      
      return String(chatResponse.choices?.[0]?.message.content ?? "I apologize, I couldn't process that request.");
    } catch (error) {
      throw new Error(`Mistral API request failed: ${error}`);
    }
  }
}
