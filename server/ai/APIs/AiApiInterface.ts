import type { AiChatMessage } from "../../../shared/schema.ts";

export interface AiApiInterface {
  client: unknown;
  model: string;
  temperature: number;
  maxTokens: number;

  getResponse(messages: AiChatMessage[]): Promise<string>;
}
