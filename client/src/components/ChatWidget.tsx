import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  ChatError,
  resetChat as resetChatRequest,
  sendChatMessage,
  sendFeedback,
} from "@/lib/chatStream";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { portfolioData } from "../../../shared/portfolio.ts";
import {
  CHAT_MAX_CONTENT_LENGTH,
  type ChatFeedback,
  type ChatMessageDTO,
} from "@shared/chat.ts";
import ReactMarkdown, { type Components } from "react-markdown";
import { getOrCreateUserId } from "@shared/uuidv4.ts";

interface ChatWidgetProps {
  embedded?: boolean;
  hideFrame?: boolean;
}

// A message as displayed: persisted (numeric id) or local (intro / optimistic).
type DisplayMessage = {
  key: string;
  role: "user" | "assistant";
  content: string;
  id?: number;
  feedback?: ChatFeedback;
};

// In-flight exchange: the optimistic user bubble + the streaming reply.
type PendingExchange = { content: string; reply: string };

const COUNTER_THRESHOLD = 800;
const ASSISTANT_NAME = `${portfolioData.personal.name}'s AI assistant`;

const ChatLink: Components["a"] = ({ href, children }) => {
  const [, navigate] = useLocation();
  const className = "underline underline-offset-2 hover:opacity-80";

  if (href?.startsWith("/") && !href.startsWith("//")) {
    return (
      <a
        href={href}
        className={className}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          navigate(href);
        }}
      >
        {children}
      </a>
    );
  }
  // External (http/https, mailto, wa.me...) opens in a new tab.
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
};

const markdownComponents: Components = { a: ChatLink };

const TypingDots = () => (
  <div
    className="p-3 rounded-lg bg-muted inline-flex gap-1"
    role="status"
    aria-label="Assistant is typing"
  >
    {[0, 0.2, 0.4].map((delay) => (
      <motion.span
        key={delay}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay }}
      >
        .
      </motion.span>
    ))}
  </div>
);

const ChatHeader = ({
  onReset,
  onClose,
}: {
  onReset: () => void;
  onClose: () => void;
}) => (
  <div className="flex items-center justify-between p-4 border-b">
    <h3 className="font-semibold">{ASSISTANT_NAME}</h3>
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            aria-label="Start a new conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>New conversation</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Close chat</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
);

const ChatContent = ({
  messages,
  pending,
  limitReached,
  input,
  onInputChange,
  onSend,
  onReset,
  onFeedback,
  inputRef,
  scrollAreaRef,
  isHomePage,
  chatClass,
}: {
  messages: DisplayMessage[];
  pending: PendingExchange | null;
  limitReached: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (content: string) => void;
  onReset: () => void;
  onFeedback: (message: DisplayMessage, rating: 1 | -1) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  isHomePage: boolean;
  chatClass?: string;
}) => {
  const isStreaming = pending !== null;
  // Suggestions are only offered while the intro is the sole message.
  const showSuggestions = messages.length === 1 && !isStreaming;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) onSend(input);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, pending, limitReached, scrollAreaRef]);

  const renderBubble = (msg: DisplayMessage) => (
    <motion.div
      key={msg.key}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
    >
      {msg.role === "assistant" && (
        <img
          src={portfolioData.personal.avatar}
          alt=""
          className="w-8 h-8 rounded-full mt-1 object-cover"
        />
      )}
      <div className="max-w-[80%]">
        <div
          className={`p-3 rounded-lg text-left ${msg.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"}`}
        >
          <ReactMarkdown components={markdownComponents}>
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.role === "assistant" && msg.id !== undefined && (
          <div className="flex gap-1 mt-1">
            {([1, -1] as const).map((rating) => {
              const Icon = rating === 1 ? ThumbsUp : ThumbsDown;
              const active = msg.feedback === rating;
              return (
                <Button
                  key={rating}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label={rating === 1 ? "Good answer" : "Bad answer"}
                  aria-pressed={active}
                  onClick={() => onFeedback(msg, rating)}
                >
                  <Icon
                    className={`h-3 w-3 ${active ? "text-primary fill-current" : "text-muted-foreground"}`}
                  />
                </Button>
              );
            })}
          </div>
        )}
      </div>
      {msg.role === "user" && <div className="w-8" />}
    </motion.div>
  );

  return (
    <div className={"flex flex-col h-full " + chatClass}>
      <ScrollArea ref={scrollAreaRef} className="flex-grow chat-scroll-area">
        <div className="flex flex-col h-full">
          {isHomePage && (
            <div className="text-center mb-4 pt-4">
              <img
                src={portfolioData.personal.avatar}
                alt="Professional headshot"
                className="w-32 h-32 rounded-full mx-auto object-cover mb-4"
              />
              <h1 className="text-4xl font-bold p-4 bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
                Hi, I'm {portfolioData.personal.name}
              </h1>
              <p className="text-xl text-muted-foreground">
                {portfolioData.personal.title}
              </p>
            </div>
          )}

          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex flex-col"
          >
            {messages.length === 0 && !isStreaming && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No messages yet.</p>
              </div>
            )}

            {messages.map(renderBubble)}

            {isStreaming && (
              <>
                {renderBubble({
                  key: "pending-user",
                  role: "user",
                  content: pending.content,
                })}
                {pending.reply ? (
                  renderBubble({
                    key: "pending-assistant",
                    role: "assistant",
                    content: pending.reply,
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 flex items-start gap-2"
                  >
                    <img
                      src={portfolioData.personal.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full mt-1 object-cover"
                    />
                    <TypingDots />
                  </motion.div>
                )}
              </>
            )}
          </div>

          {showSuggestions && (
            <div className="flex flex-wrap gap-2 mb-4 pl-10">
              {portfolioData.intro.chatSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left"
                  onClick={() => onSend(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {limitReached && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg border bg-muted text-sm space-y-2"
            >
              <p>You've reached the limit for this conversation.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" onClick={onReset}>
                  Start a new conversation
                </Button>
                <Link href="/contact" className="underline">
                  Contact Jeremy directly
                </Link>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            name="message"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Type a message..."
            aria-label="Message"
            maxLength={CHAT_MAX_CONTENT_LENGTH}
            disabled={isStreaming || limitReached}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={isStreaming || limitReached || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {input.length > COUNTER_THRESHOLD && (
          <p
            className={`text-xs mt-1 text-right ${input.length >= CHAT_MAX_CONTENT_LENGTH ? "text-destructive" : "text-muted-foreground"}`}
          >
            {input.length}/{CHAT_MAX_CONTENT_LENGTH}
          </p>
        )}
      </form>
      <p className="text-center text-muted-foreground text-xs pb-2">
        Powered by Mistral. AI may make mistakes.
      </p>
    </div>
  );
};

const ChatWidget = forwardRef(
  ({ embedded = false, hideFrame = false }: ChatWidgetProps, ref) => {
    const [isOpen, setIsOpen] = useState(embedded);
    const [input, setInput] = useState("");
    const [pending, setPending] = useState<PendingExchange | null>(null);
    const [limitReached, setLimitReached] = useState(false);
    const [location] = useLocation();
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const isHomePage = location === "/";

    const userId = getOrCreateUserId();
    const queryKey = useMemo(() => ["/api/chat", userId], [userId]);

    const { data: fetchedMessages = [] } = useQuery<ChatMessageDTO[]>({
      queryKey,
      queryFn: async () => {
        const response = await apiRequest("GET", `/api/chat?user_id=${userId}`);
        return response.json();
      },
    });

    // The intro is local and never persisted.
    const messages = useMemo<DisplayMessage[]>(
      () => [
        {
          key: "intro",
          role: "assistant",
          content: portfolioData.intro.chatIntro,
        },
        ...fetchedMessages.map((m) => ({
          key: `msg-${m.id}`,
          id: m.id,
          role: m.role,
          content: m.content,
          feedback: m.feedback,
        })),
      ],
      [fetchedMessages],
    );

    // Abort any in-flight stream when the widget unmounts.
    useEffect(() => () => abortRef.current?.abort(), []);

    const scrollToBottom = useCallback(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    }, []);

    useEffect(() => {
      if (isOpen) {
        const timer = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timer);
      }
    }, [isOpen, scrollToBottom]);

    const send = async (content: string) => {
      const text = content.trim();
      if (!text || abortRef.current) return;

      const controller = new AbortController();
      abortRef.current = controller;
      setInput("");
      setPending({ content: text, reply: "" });

      try {
        const { userMessage, assistantMessage } = await sendChatMessage({
          userId,
          content: text,
          signal: controller.signal,
          onDelta: (delta) =>
            setPending((p) => (p ? { ...p, reply: p.reply + delta } : p)),
        });
        queryClient.setQueryData<ChatMessageDTO[]>(queryKey, (old = []) => [
          ...old,
          userMessage,
          assistantMessage,
        ]);
        setPending(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPending(null);
        setInput(text);
        if (error instanceof ChatError && error.code === "conversation_limit") {
          setLimitReached(true);
        } else {
          toast({
            title: "Error",
            description:
              error instanceof ChatError
                ? error.message
                : "Something went wrong. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        inputRef.current?.focus();
      }
    };

    const resetChat = async () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setPending(null);
      try {
        await resetChatRequest(userId);
        queryClient.setQueryData<ChatMessageDTO[]>(queryKey, []);
        setLimitReached(false);
        setInput("");
        inputRef.current?.focus();
      } catch (error) {
        toast({
          title: "Error",
          description:
            error instanceof ChatError
              ? error.message
              : "Failed to reset the conversation. Please try again.",
          variant: "destructive",
        });
      }
    };

    const setFeedbackInCache = (messageId: number, rating: ChatFeedback) =>
      queryClient.setQueryData<ChatMessageDTO[]>(queryKey, (old = []) =>
        old.map((m) => (m.id === messageId ? { ...m, feedback: rating } : m)),
      );

    const handleFeedback = async (message: DisplayMessage, rating: 1 | -1) => {
      if (message.id === undefined) return;
      const previous = message.feedback ?? null;
      const next: ChatFeedback = previous === rating ? null : rating;
      setFeedbackInCache(message.id, next);
      try {
        await sendFeedback({ userId, messageId: message.id, rating: next });
      } catch {
        setFeedbackInCache(message.id, previous);
        toast({
          title: "Error",
          description: "Could not save your feedback. Please try again.",
          variant: "destructive",
        });
      }
    };

    useImperativeHandle(ref, () => ({
      resetChat,
      scrollToBottom,
    }));

    const content = (chatClass?: string) => (
      <ChatContent
        messages={messages}
        pending={pending}
        limitReached={limitReached}
        input={input}
        onInputChange={setInput}
        onSend={send}
        onReset={resetChat}
        onFeedback={handleFeedback}
        inputRef={inputRef}
        scrollAreaRef={scrollAreaRef}
        isHomePage={isHomePage}
        chatClass={chatClass}
      />
    );

    if (embedded) {
      return hideFrame ? (
        <div className="h-full">{content()}</div>
      ) : (
        <Card className="w-full h-full flex flex-col overflow-hidden">
          <ChatHeader onReset={resetChat} onClose={() => setIsOpen(false)} />
          {content("pb-16")}
        </Card>
      );
    }

    if (isHomePage) return null;

    return (
      <TooltipProvider>
        {!isOpen && (
          <Button
            size="icon"
            className="fixed bottom-4 right-4 rounded-full shadow-lg"
            onClick={() => setIsOpen(true)}
            aria-label="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 right-4 z-50"
            >
              <Card className="w-[350px] h-[500px] flex flex-col">
                <ChatHeader
                  onReset={resetChat}
                  onClose={() => setIsOpen(false)}
                />
                {content("pb-16")}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </TooltipProvider>
    );
  },
);

export default ChatWidget;
