import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
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
import { MessageCircle, X, Send, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { portfolioData } from "../../../shared/portfolio.ts";
import ReactMarkdown from 'react-markdown';
import { getOrCreateUserId } from "@shared/uuidv4.ts";

interface ChatWidgetProps {
  embedded?: boolean;
  hideFrame?: boolean;
  onFirstMessage?: () => void;
}

type ChatMessage = {
  role: string;
  content: string;
  created_at: Date;
};

const ChatContent = ({
  messages,
  isPending,
  mutation,
  inputRef,
  scrollAreaRef,
  isHomePage,
}: {
  messages: ChatMessage[];
  isPending: boolean;
  mutation: any;
  inputRef: React.RefObject<HTMLInputElement>;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  isHomePage: boolean;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const message = formData.get("message") as string;
    if (message?.trim()) {
      mutation.mutate(message.trim());
      form.reset();
      inputRef.current?.focus();
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPending]);

  return (
    <div className="flex flex-col h-full">
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

          {messages.length === 0 && !isPending && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Aucun message à afficher.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 flex items-start gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <img
                  src={portfolioData.personal.avatar}
                  alt="AI Assistant"
                  className="w-8 h-8 rounded-full mt-1 object-cover"
                />
              )}
              <div
                className={`p-3 rounded-lg text-left ${msg.role === "user" ? "bg-primary text-primary-foreground ml-auto max-w-[80%]" : "bg-muted max-w-[80%]"}`}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === "user" && <div className="w-8" />}
            </motion.div>
          ))}
        </div>

        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-start gap-2"
          >
            <img
              src={portfolioData.personal.avatar}
              alt="AI Assistant"
              className="w-8 h-8 rounded-full mt-1 object-cover"
            />
            <div className="p-3 rounded-lg bg-muted inline-flex gap-1">
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              >
                .
              </motion.span>
            </div>
          </motion.div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            name="message"
            placeholder="Type a message..."
            disabled={isPending}
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
      <p className="text-center text-muted-foreground text-xs">Powered by {portfolioData.ai_clone.model}</p>
    </div>
  );
};

const ChatWidget = forwardRef(({ embedded = false, hideFrame = false, onFirstMessage }: ChatWidgetProps, ref) => {
  const [isOpen, setIsOpen] = useState(embedded);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [location] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isHomePage = location === "/";

  const userId = getOrCreateUserId();

  const { data: fetchedMessages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/chat?user_id=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      return response.json();
    },
  });

  const introMessage = {
    role: "assistant",
    content: portfolioData.intro.chatIntro,
    created_at: new Date(),
  };

  const messages  = fetchedMessages.length === 0 || fetchedMessages[0].content !== introMessage.content
  ? [introMessage, ...fetchedMessages]
  : fetchedMessages;
  
  useEffect(() => {
    if (isFirstVisit) {
      setIsFirstVisit(false);
    }
  }, [isFirstVisit]);
  
  

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const tempMessage: ChatMessage = {
        role: "user",
        content,
        created_at: new Date(),
      };
      queryClient.setQueryData(["/api/chat", userId], [...messages, tempMessage]);

      const response = await apiRequest("POST", "/api/chat", {
        user_id: userId,
        message: { role: "user", content },
      });
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      return response.json();
    },
    onSuccess: (newMessages) => {
      if (onFirstMessage && messages.length === 1) {
        onFirstMessage();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat", userId] });
      inputRef.current?.focus();
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetChat = async () => {
    try {
      queryClient.setQueryData<ChatMessage[]>(["/api/chat", userId], [introMessage]);

      const response = await apiRequest("POST", "/api/chat/reset", {
        user_id: userId,
      });
      if (!response.ok) {
        console.error("Failed to reset chat:", response.statusText);
        throw new Error("Failed to reset chat.");
      }

      queryClient.removeQueries({ queryKey: ["/api/chat", userId] });
      await queryClient.prefetchQuery({
        queryKey: ["/api/chat", userId],
        queryFn: async () => {
          const res = await apiRequest("GET", `/api/chat?user_id=${userId}`);
          return res.json();
        },
      });
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error in resetChat:", error);
      toast({
        title: "Error",
        description: "Failed to reset chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  useImperativeHandle(ref, () => ({
    resetChat,
    scrollToBottom,
  }));

  if (embedded) {
    return hideFrame ? (
      <div className="h-full">
        <ChatContent
          messages={messages}
          isPending={mutation.isPending}
          mutation={mutation}
          inputRef={inputRef}
          scrollAreaRef={scrollAreaRef}
          isHomePage={isHomePage}
        />
      </div>
    ) : (
      <Card className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">
            Chat with {portfolioData.personal.name}'s AI Clone
          </h3>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={resetChat}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Restart chat</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
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
        <ChatContent
          messages={messages}
          isPending={mutation.isPending}
          mutation={mutation}
          inputRef={inputRef}
          scrollAreaRef={scrollAreaRef}
          isHomePage={isHomePage}
        />
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
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">
                  Chat with {portfolioData.personal.name}'s AI Clone
                </h3>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={resetChat}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Restart chat</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
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
              <ChatContent
                messages={messages}
                isPending={mutation.isPending}
                mutation={mutation}
                inputRef={inputRef}
                scrollAreaRef={scrollAreaRef}
                isHomePage={isHomePage}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
});

export default ChatWidget;
