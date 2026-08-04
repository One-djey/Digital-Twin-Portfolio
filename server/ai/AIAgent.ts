import { OpenAIAPI } from "./APIs/OpenAI.ts";
import { MistralAPI } from "./APIs/Mistral.ts";
import type { AiApiInterface } from "./APIs/AiApiInterface.ts";
import type { AiChatMessage } from "../../shared/schema.ts";

// Instancie l'implémentation provider correspondant au préfixe du nom de modèle.
function createApiInstance(
  model: string,
  temperature: number,
  maxTokens: number,
): AiApiInterface {
  if (
    model.startsWith("gpt") ||
    model.startsWith("o1") ||
    model.startsWith("o3")
  ) {
    return new OpenAIAPI(model, temperature, maxTokens);
  } else if (
    model.startsWith("mistral") ||
    model.startsWith("ministral") ||
    model.startsWith("pixtral") ||
    model.startsWith("codestral")
  ) {
    return new MistralAPI(model, temperature, maxTokens);
  }
  throw new Error(`Unsupported model type: ${model}`);
}

export abstract class AIAgent {
  protected model: string;
  protected temperature: number;
  protected maxTokens: number;
  protected systemMessage: string;
  protected apiInstance: AiApiInterface;
  // Modèle de secours utilisé si le provider principal échoue et qu'une
  // clé API pour l'autre fournisseur est disponible.
  protected fallbackApiInstance?: AiApiInterface;

  constructor(
    model: string,
    temperature: number,
    maxTokens: number,
    systemMessage: string,
  ) {
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.systemMessage = systemMessage;
    this.apiInstance = createApiInstance(model, temperature, maxTokens);
    this.fallbackApiInstance = this.createFallbackInstance(
      model,
      temperature,
      maxTokens,
    );
  }

  private createFallbackInstance(
    model: string,
    temperature: number,
    maxTokens: number,
  ): AiApiInterface | undefined {
    const isMistral =
      model.startsWith("mistral") ||
      model.startsWith("ministral") ||
      model.startsWith("pixtral") ||
      model.startsWith("codestral");
    try {
      if (isMistral && process.env.OPENAI_API_KEY) {
        return new OpenAIAPI("gpt-4o-mini", temperature, maxTokens);
      }
      if (!isMistral && process.env.MISTRAL_API_KEY) {
        return new MistralAPI("mistral-small-latest", temperature, maxTokens);
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  protected async callAPI(messages: AiChatMessage[]): Promise<string> {
    const messagesWithContext: AiChatMessage[] = [
      {
        role: "system",
        content: this.systemMessage,
      },
      ...messages,
    ];

    try {
      return await this.apiInstance.getResponse(messagesWithContext);
    } catch (error) {
      if (!this.fallbackApiInstance) {
        throw error;
      }
      console.error(`Primary AI provider failed, falling back: ${error}`);
      return this.fallbackApiInstance.getResponse(messagesWithContext);
    }
  }

  public async getResponse(messages: AiChatMessage[]): Promise<string> {
    return this.callAPI(messages);
  }
}
