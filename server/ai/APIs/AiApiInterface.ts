export interface AiApiInterface {
    client: any;
    model: string;
    temperature: number;
    maxTokens: number;

    getResponse(messages: { role: string; content: string }[]): Promise<string>;
}
