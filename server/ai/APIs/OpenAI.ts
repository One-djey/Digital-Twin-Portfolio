import OpenAI from "openai";
import { AiApiInterface } from "./AiApiInterface.ts";
import 'dotenv/config';

export class OpenAIAPI implements AiApiInterface {
  public client: OpenAI;
  public model: string;
  public temperature: number;
  public maxTokens: number;

  // Check pricing: https://platform.openai.com/docs/pricing
  public static readonly MODELS = [
    "o1",
    "o1-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
  ];


  constructor(model: string, temperature: number, maxTokens: number) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  public async getResponse(messages: any[]): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });
      return response.choices[0].message.content ?? "I apologize, I couldn't process that request.";
    } catch (error) {
      throw new Error(`OpenAI API request failed: ${error}`);
    }
  }
} 