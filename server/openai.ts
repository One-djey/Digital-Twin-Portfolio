import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to get structured chat responses
export async function getChatResponse(
  userMessage: string,
  context?: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            context ||
            "You are a helpful AI assistant for a portfolio website. Keep responses concise, professional, and focused on software development, technology, and career topics.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content ?? "I apologize, I couldn't process that request.";
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw new Error("Failed to get AI response");
  }
}

// Helper function for getting structured data responses
export async function getStructuredResponse<T>(
  userMessage: string,
  context: string,
  schema: string
): Promise<T> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `${context}\n\nRespond with JSON in this format:\n${schema}`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content received");
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.error("Error getting structured response:", error);
    throw new Error("Failed to get structured AI response");
  }
}