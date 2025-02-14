import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageCircle, X, Send, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ChatMessage } from "@shared/schema";
import portfolioData from "@/data/portfolio.json";

interface ChatWidgetProps {
  embedded?: boolean;
  hideFrame?: boolean;
  onFirstMessage?: () => void;
}

const ChatContent = ({
  messages,
  isPending,
  mutation,
  inputRef,
  scrollAreaRef,
}: {
  messages: ChatMessage[];
  isPending: boolean;
  mutation: any;
  inputRef: React.RefObject<HTMLInputElement>;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const message = formData.get("message") as string;
    if (message?.trim()) {
      mutation.mutate(message.trim());
      form.reset();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 flex items-start gap-2 ${
              msg.role === "user" ? "justify-end" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <img
                src={portfolioData.personal.avatar}
                alt="AI Assistant"
                className="w-8 h-8 rounded-full mt-1 object-cover"
              />
            )}
            <div
              className={`p-3 rounded-lg text-left ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                  : "bg-muted max-w-[80%]"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && <div className="w-8" />}
          </motion.div>
        ))}

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
    </div>
  );
};

export default function ChatWidget({
  embedded = false,
  hideFrame = false,
  onFirstMessage,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [location] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isHomePage = location === "/";

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat"],
    initialData: [
      {
        id: 0,
        role: "assistant",
        content: portfolioData.intro.chatIntro,
        timestamp: new Date(),
      },
    ],
  });

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      // Optimistic update pour afficher immédiatement le message utilisateur
      const tempMessage: ChatMessage = {
        id: messages.length + 1,
        role: "user",
        content,
        timestamp: new Date(),
      };
      queryClient.setQueryData(["/api/chat"], [...messages, tempMessage]);

      const response = await apiRequest("POST", "/api/chat", {
        role: "user",
        content,
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
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
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
    await queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
    await queryClient.setQueryData(["/api/chat"], [
      {
        id: 0,
        role: "assistant",
        content: portfolioData.intro.chatIntro,
        timestamp: new Date(),
      },
    ]);

  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);


  if (embedded) {
    return hideFrame ? (
      <div className="h-full">
        <ChatContent
          messages={messages}
          isPending={mutation.isPending}
          mutation={mutation}
          inputRef={inputRef}
          scrollAreaRef={scrollAreaRef}
        />
      </div>
    ) : (
      <Card className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Chat with {portfolioData.personal.name}'s AI Clone</h3>
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
        />
      </Card>
    );
  }

  // Ne pas afficher le bouton flottant sur la page d'accueil
  if (isHomePage) return null;

  return (
    <>
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
                <h3 className="font-semibold">Chat with {portfolioData.personal.name}'s AI Clone</h3>
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
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}