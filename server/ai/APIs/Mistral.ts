import "dotenv/config"; // Assurez-vous que dotenv est importé
import { Mistral } from "@mistralai/mistralai";
import { MistralError } from "@mistralai/mistralai/models/errors";
import { AiApiInterface } from "./AiApiInterface.ts";
import type { AiChatMessage } from "../../../shared/schema.ts";

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
    "ministral-14b-latest",
    "ministral-8b-latest",
    "ministral-3b-latest",
    "mistral-embed",
    "mistral-moderation-latest",
  ];

  // Tried in order after the configured model when it answers 429. Mistral
  // gives no "latest free model" alias and doesn't expose plan coverage, so
  // we walk down to cheaper models that the free plan does cover: in 2026,
  // "mistral-small-latest" moved to Small 4, which has a 0 req/min quota on
  // the free plan, while the Ministral family stays usable.
  public static readonly RATE_LIMIT_FALLBACKS = [
    "ministral-14b-latest",
    "ministral-8b-latest",
  ];

  // Ordered candidates and the index of the one currently in use. The index
  // is sticky for the lifetime of the instance (a Vercel function instance),
  // so only the first request after a cold start pays for the 429s.
  private candidates: string[];
  private activeIndex = 0;

  constructor(model: string, temperature: number, maxTokens: number) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY environment variable is required");
    }
    if (!MistralAPI.MODELS.includes(model)) {
      throw new Error(
        `Unsupported Mistral model "${model}". Supported models: ${MistralAPI.MODELS.join(", ")}`,
      );
    }

    this.client = new Mistral({ apiKey });
    this.model = model;
    this.candidates = [
      model,
      ...MistralAPI.RATE_LIMIT_FALLBACKS.filter((m) => m !== model),
    ];
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  // Le system prompt (system + portfolioData) est identique à chaque appel :
  // une clé de cache fixe permet à Mistral de réutiliser ce préfixe entre
  // tous les utilisateurs plutôt que de le refacturer en entier à chaque
  // requête. Bump la valeur si le system prompt change de structure.
  private static readonly PROMPT_CACHE_KEY = "digital-twin-agent-v1";

  public async getResponse(messages: AiChatMessage[]): Promise<string> {
    for (let i = this.activeIndex; i < this.candidates.length; i++) {
      const model = this.candidates[i];
      try {
        const chatResponse = await this.client.chat.complete({
          model,
          messages: messages as any,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
          stream: false,
          promptCacheKey: MistralAPI.PROMPT_CACHE_KEY,
        });

        if (i !== this.activeIndex) {
          console.warn(
            `Mistral model "${this.candidates[this.activeIndex]}" rate-limited, switched to "${model}"`,
          );
          this.activeIndex = i;
          this.model = model;
        }

        return String(
          chatResponse.choices?.[0]?.message?.content ??
            "I apologize, I couldn't process that request.",
        );
      } catch (error) {
        const rateLimited =
          error instanceof MistralError && error.statusCode === 429;
        if (rateLimited && i < this.candidates.length - 1) continue;
        throw new Error(`Mistral API request failed (${model}): ${error}`);
      }
    }
    throw new Error("Mistral API request failed: no candidate model left");
  }
}
