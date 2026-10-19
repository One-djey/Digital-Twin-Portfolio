import { z } from "zod";

// Client/server contract for the chat widget. Imported by both sides so the
// limits, payloads and SSE events can never drift apart.

export const CHAT_MAX_CONTENT_LENGTH = 1000;

export const chatRequestSchema = z.object({
  user_id: z.string().uuid(),
  message: z.object({
    content: z.string().trim().min(1).max(CHAT_MAX_CONTENT_LENGTH),
  }),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatResetRequestSchema = z.object({
  user_id: z.string().uuid(),
});
export type ChatResetRequest = z.infer<typeof chatResetRequestSchema>;

export const chatFeedbackRequestSchema = z.object({
  user_id: z.string().uuid(),
  message_id: z.number().int().positive(),
  rating: z.union([z.literal(1), z.literal(-1), z.null()]),
});
export type ChatFeedbackRequest = z.infer<typeof chatFeedbackRequestSchema>;

export type ChatRole = "user" | "assistant";
export type ChatFeedback = 1 | -1 | null;

// What the API returns for a persisted message (GET /api/chat, SSE `done`).
export type ChatMessageDTO = {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO 8601
  feedback: ChatFeedback;
};

export type ChatErrorCode =
  | "invalid_request" // 400
  | "rate_limited" // 429
  | "conversation_limit" // 403: start a new conversation
  | "daily_cap" // 503: global daily budget reached
  | "ai_unavailable" // AI provider failed (SSE `error` event)
  | "internal_error"; // 500

// Body of every JSON error response, and payload of the SSE `error` event.
// `message` is English and safe to show to the visitor.
export type ChatErrorBody = {
  code: ChatErrorCode;
  message: string;
};

// POST /api/chat answers with `text/event-stream` once the request is
// accepted. Each event is sent as `event: <name>\ndata: <json>\n\n`.
// Failures before the stream starts are plain JSON HTTP errors (ChatErrorBody).
export type ChatStreamEvent =
  | { event: "delta"; data: { text: string } }
  | {
      event: "done";
      data: { userMessage: ChatMessageDTO; assistantMessage: ChatMessageDTO };
    }
  | { event: "error"; data: ChatErrorBody };

export const LEGAL_ROUTES = {
  notice: "/legal/mentions-legales",
  privacy: "/legal/confidentialite",
} as const;
