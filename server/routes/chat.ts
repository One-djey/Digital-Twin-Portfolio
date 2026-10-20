import type { Express, NextFunction, Request, Response } from "express";
import { waitUntil } from "@vercel/functions";
import {
  chatFeedbackRequestSchema,
  chatRequestSchema,
  chatResetRequestSchema,
  type ChatErrorBody,
  type ChatErrorCode,
  type ChatMessageDTO,
} from "@shared/chat.ts";
import { isUUID } from "@shared/uuidv4.ts";
import { digitalTwinAgent } from "../ai/DigitalTwinAgent.ts";
import { SUBMIT_LEAD_TOOL_NAME, type RunStep } from "../ai/types.ts";
import { executeSubmitLead } from "../leads.ts";
import { createLimiter } from "../rateLimitStore.ts";
import {
  addAssistantMessage,
  addMessage,
  addUser,
  countAssistantMessagesToday,
  countUserMessages,
  deleteMessage,
  getAllUserMessages,
  getRecentUserMessages,
  getTurnUserMessageId,
  resetUserMessages,
  setMessageFeedback,
  userExistsById,
} from "../storage.ts";
import {
  deleteChatTraces,
  scoreChatFeedback,
  traceChatTurn,
  type ChatTurnTrace,
} from "../tracing.ts";

// Max messages (user + assistant combined) per conversation.
const MAX_MESSAGES = 50;
// Number of most recent messages sent to the model.
const HISTORY_WINDOW = 20;
// Global budget of assistant replies per UTC day.
const DEFAULT_DAILY_CAP = 300;

type MessageRow = Awaited<ReturnType<typeof getAllUserMessages>>[number];

type TurnOutcome =
  | Pick<Extract<ChatTurnTrace, { stored: true }>, "stored" | "reply" | "result">
  | Pick<Extract<ChatTurnTrace, { stored: false }>, "stored" | "error">;

function toDTO(row: MessageRow): ChatMessageDTO {
  return {
    // postgres-js returns bigint identity columns as strings at runtime.
    id: Number(row.id),
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    feedback: row.feedback === 1 || row.feedback === -1 ? row.feedback : null,
  };
}

function sendError(
  res: Response,
  status: number,
  code: ChatErrorCode,
  message: string,
) {
  const body: ChatErrorBody = { code, message };
  res.status(status).json(body);
}

function dailyCap(): number {
  const raw = process.env.CHAT_DAILY_CAP;
  if (raw === undefined || raw.trim() === "") return DEFAULT_DAILY_CAP;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DAILY_CAP;
}

export function registerChatRoutes(app: Express) {
  const chatMinuteLimiter = createLimiter({
    prefix: "chat-min",
    windowMs: 60 * 1000,
    limit: 10,
    message: "Too many messages, please wait a moment and try again.",
  });
  const chatDayLimiter = createLimiter({
    prefix: "chat-day",
    windowMs: 24 * 60 * 60 * 1000,
    limit: 100,
    message: "Daily message limit reached, please try again tomorrow.",
  });
  const resetLimiter = createLimiter({
    prefix: "chat-reset",
    windowMs: 60 * 1000,
    limit: 5,
    message: "Too many requests, please wait a moment and try again.",
  });
  const feedbackLimiter = createLimiter({
    prefix: "chat-feedback",
    windowMs: 60 * 1000,
    limit: 30,
    message: "Too many requests, please wait a moment and try again.",
  });

  // Validation runs before the rate limiters so malformed requests get a 400.
  const validateChatRequest = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const parsed = chatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        "invalid_request",
        "Invalid message. Messages must be between 1 and 1000 characters.",
      );
      return;
    }
    res.locals.chatRequest = parsed.data;
    next();
  };

  app.get("/api/chat", async (req, res) => {
    try {
      const userId = req.query?.user_id;
      if (typeof userId !== "string" || !isUUID(userId)) {
        sendError(res, 400, "invalid_request", "Invalid user ID.");
        return;
      }
      if (!(await userExistsById(userId))) {
        res.status(200).json([]);
        return;
      }
      const messages = await getAllUserMessages(userId);
      res.status(200).json(messages.map(toDTO));
    } catch (error: any) {
      console.error("Error fetching messages: " + error.message);
      sendError(res, 500, "internal_error", "Something went wrong.");
    }
  });

  app.post("/api/chat/reset", resetLimiter, async (req, res) => {
    try {
      const parsed = chatResetRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "invalid_request", "Invalid user ID.");
        return;
      }
      const userMessageIds = await resetUserMessages(parsed.data.user_id);
      // The privacy policy promises the reset deletes the conversation
      // everywhere, Langfuse traces included.
      await deleteChatTraces(userMessageIds).catch((error) =>
        console.error("Langfuse trace deletion failed: " + error?.message),
      );
      res.status(200).json([]);
    } catch (error: any) {
      console.error("Error resetting messages: " + error.message);
      sendError(res, 500, "internal_error", "Something went wrong.");
    }
  });

  app.post("/api/chat/feedback", feedbackLimiter, async (req, res) => {
    try {
      const parsed = chatFeedbackRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, "invalid_request", "Invalid feedback.");
        return;
      }
      const { user_id, message_id, rating } = parsed.data;
      const updated = await setMessageFeedback(user_id, message_id, rating);
      if (!updated) {
        sendError(res, 400, "invalid_request", "Message not found.");
        return;
      }
      res.status(200).json({ ok: true });
      waitUntil(
        (async () => {
          const userMessageId = await getTurnUserMessageId(user_id, message_id);
          if (userMessageId === null) return;
          await scoreChatFeedback({
            userMessageId,
            answeredAt: updated.createdAt ?? new Date(),
            rating,
          });
        })().catch((error) =>
          console.error("Langfuse feedback failed: " + error?.message),
        ),
      );
    } catch (error: any) {
      console.error("Error saving feedback: " + error.message);
      sendError(res, 500, "internal_error", "Something went wrong.");
    }
  });

  app.post(
    "/api/chat",
    validateChatRequest,
    chatMinuteLimiter,
    chatDayLimiter,
    async (req, res) => {
      const { user_id, message } = res.locals.chatRequest as {
        user_id: string;
        message: { content: string };
      };

      let streaming = false;
      let userMessageId: number | null = null;
      // Set once the user message is stored: sends the turn's trace to
      // Langfuse in the background (at most once per turn).
      let traceTurn: ((outcome: TurnOutcome) => void) | undefined;

      try {
        if (!(await userExistsById(user_id))) {
          await addUser(user_id);
        }

        // Checked before the insert: the conversation needs room for both the
        // visitor's message and the reply.
        if ((await countUserMessages(user_id)) + 2 > MAX_MESSAGES) {
          sendError(
            res,
            403,
            "conversation_limit",
            "This conversation has reached its message limit. Please start a new conversation to continue.",
          );
          return;
        }

        if ((await countAssistantMessagesToday()) >= dailyCap()) {
          sendError(
            res,
            503,
            "daily_cap",
            "The assistant has reached its daily limit. Please try again tomorrow or use the contact form.",
          );
          return;
        }

        const [userRow] = await addMessage(user_id, "user", message.content);
        userMessageId = userRow.id;

        const turnStart = new Date();
        const steps: RunStep[] = [];
        traceTurn = (outcome) => {
          traceTurn = undefined;
          waitUntil(
            traceChatTurn({
              userId: user_id,
              // postgres-js returns bigint identity columns as strings.
              userMessageId: Number(userRow.id),
              userMessage: message.content,
              startTime: turnStart,
              endTime: new Date(),
              steps,
              ...outcome,
            }),
          );
        };

        // Last HISTORY_WINDOW messages, trimmed so the first one is a user turn.
        const recent = await getRecentUserMessages(user_id, HISTORY_WINDOW);
        while (recent.length > 0 && recent[0].role !== "user") recent.shift();
        const history = recent.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as
            "user" | "assistant",
          content: m.content,
        }));

        // SSE from here on: failures are reported as `error` events.
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        streaming = true;

        const controller = new AbortController();
        res.on("close", () => {
          if (!res.writableFinished) controller.abort();
        });

        const send = (event: string, data: unknown) => {
          if (res.writableEnded || res.destroyed) return;
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        const failWithAiError = async (reason: string) => {
          traceTurn?.({ stored: false, error: reason });
          if (userMessageId !== null) {
            await deleteMessage(user_id, userMessageId).catch(() => {});
            userMessageId = null;
          }
          const body: ChatErrorBody = {
            code: "ai_unavailable",
            message:
              "The assistant is temporarily unavailable. Please try again in a moment.",
          };
          send("error", body);
          if (!res.writableEnded) res.end();
        };

        let result;
        try {
          result = await digitalTwinAgent.run(history, {
            onText: (text) => send("delta", { text }),
            signal: controller.signal,
            steps,
            executeTool: async (name, args) => {
              if (name === SUBMIT_LEAD_TOOL_NAME) {
                return executeSubmitLead(user_id, args);
              }
              return JSON.stringify({ ok: false, error: "unknown_tool" });
            },
          });
        } catch (error: any) {
          if (!controller.signal.aborted) {
            console.error("AI error: " + error?.message);
          }
          await failWithAiError(
            controller.signal.aborted
              ? "client_disconnected"
              : `ai_unavailable: ${error?.message}`,
          );
          return;
        }

        if (controller.signal.aborted) {
          // Client left: no reply to persist, don't keep an orphan message.
          await failWithAiError("client_disconnected");
          return;
        }

        if (!result.text.trim()) {
          console.error("AI error: empty reply");
          await failWithAiError("empty_reply");
          return;
        }

        const assistantRow = await addAssistantMessage(user_id, result.text, {
          model: result.model,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          cachedTokens: result.usage.cachedTokens,
          latencyMs: result.latencyMs,
          finishReason: result.finishReason,
        });
        traceTurn?.({ stored: true, reply: result.text, result });

        console.info(
          JSON.stringify({
            event: "chat_reply",
            user_id,
            model: result.model,
            latency_ms: result.latencyMs,
            input_tokens: result.usage.inputTokens,
            output_tokens: result.usage.outputTokens,
            cached_tokens: result.usage.cachedTokens ?? 0,
            finish_reason: result.finishReason,
            tools: result.toolCalls.map((t) => t.name),
          }),
        );

        send("done", {
          userMessage: toDTO(userRow),
          assistantMessage: toDTO(assistantRow),
        });
        res.end();
      } catch (error: any) {
        console.error("Error processing chat: " + error?.message);
        traceTurn?.({ stored: false, error: `internal_error: ${error?.message}` });
        if (userMessageId !== null) {
          await deleteMessage(user_id, userMessageId).catch(() => {});
        }
        if (streaming) {
          if (!res.writableEnded) {
            const body: ChatErrorBody = {
              code: "internal_error",
              message: "Something went wrong. Please try again.",
            };
            res.write(`event: error\ndata: ${JSON.stringify(body)}\n\n`);
            res.end();
          }
        } else {
          sendError(
            res,
            500,
            "internal_error",
            "Something went wrong. Please try again.",
          );
        }
      }
    },
  );
}
