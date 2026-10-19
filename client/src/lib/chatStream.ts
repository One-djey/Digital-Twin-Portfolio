import type {
  ChatErrorBody,
  ChatErrorCode,
  ChatFeedback,
  ChatMessageDTO,
} from "@shared/chat.ts";

export class ChatError extends Error {
  code: ChatErrorCode;
  status: number;

  constructor(code: ChatErrorCode, message: string, status = 0) {
    super(message);
    this.name = "ChatError";
    this.code = code;
    this.status = status;
  }
}

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

// Turn a non-OK response into a ChatError, using the ChatErrorBody when present.
async function errorFromResponse(res: Response): Promise<ChatError> {
  try {
    const body = (await res.json()) as Partial<ChatErrorBody>;
    if (body && typeof body.message === "string") {
      return new ChatError(
        body.code ?? "internal_error",
        body.message,
        res.status,
      );
    }
  } catch {
    // Not JSON: fall through to the generic error.
  }
  return new ChatError("internal_error", GENERIC_MESSAGE, res.status);
}

type SseEvent = { event: string; data: string };

// Parse one SSE block (the lines between two blank-line separators).
function parseBlock(block: string): SseEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

type ChatResult = {
  userMessage: ChatMessageDTO;
  assistantMessage: ChatMessageDTO;
};

export async function sendChatMessage({
  userId,
  content,
  signal,
  onDelta,
}: {
  userId: string;
  content: string;
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
}): Promise<ChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ user_id: userId, message: { content } }),
    signal,
  });

  if (!res.ok) throw await errorFromResponse(res);
  if (!res.body) {
    throw new ChatError("internal_error", GENERIC_MESSAGE, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ChatResult | null = null;

  const handle = (evt: SseEvent) => {
    let payload: any;
    try {
      payload = JSON.parse(evt.data);
    } catch {
      return;
    }
    if (evt.event === "delta") {
      if (typeof payload?.text === "string") onDelta?.(payload.text);
    } else if (evt.event === "done") {
      result = payload as ChatResult;
    } else if (evt.event === "error") {
      throw new ChatError(
        payload?.code ?? "internal_error",
        payload?.message ?? GENERIC_MESSAGE,
        res.status,
      );
    }
  };

  // Consume every complete block in the buffer; a partial tail stays buffered
  // until the next chunk (events can be split across reads).
  const drain = (final: boolean) => {
    buffer = buffer.replace(/\r\n/g, "\n");
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const evt = parseBlock(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
      if (evt) handle(evt);
    }
    if (final && buffer.trim()) {
      const evt = parseBlock(buffer);
      buffer = "";
      if (evt) handle(evt);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      drain(false);
    }
    buffer += decoder.decode();
    drain(true);
  } finally {
    reader.releaseLock();
  }

  if (!result) {
    throw new ChatError(
      "ai_unavailable",
      "The connection was interrupted. Please try again.",
      res.status,
    );
  }
  return result;
}

async function postJson(url: string, body: unknown): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ChatError("internal_error", "Network error. Please try again.");
  }
  if (!res.ok) throw await errorFromResponse(res);
}

export function resetChat(userId: string): Promise<void> {
  return postJson("/api/chat/reset", { user_id: userId });
}

export function sendFeedback({
  userId,
  messageId,
  rating,
}: {
  userId: string;
  messageId: number;
  rating: ChatFeedback;
}): Promise<void> {
  return postJson("/api/chat/feedback", {
    user_id: userId,
    message_id: messageId,
    rating,
  });
}
