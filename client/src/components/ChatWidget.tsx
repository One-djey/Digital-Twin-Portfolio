import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@shared/schema";

interface ChatWidgetProps {
  embedded?: boolean;
  onFirstMessage?: () => void;
}

export default function ChatWidget({ embedded = false, onFirstMessage }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat"],
  });

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      try {
        console.log("Sending message:", content); // Debug log
        const response = await apiRequest("POST", "/api/chat", { role: "user", content });
        console.log("Response:", response); // Debug log
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },
    onSuccess: () => {
      if (onFirstMessage && messages.length === 0) {
        onFirstMessage();
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      setMessage("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      console.log("Submitting message:", message); // Debug log
      mutation.mutate(message);
    }
  };

  const ChatContent = () => (
    <>
      <ScrollArea className="flex-1 p-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            {msg.role === "assistant" && (
              <img
                src="https://images.unsplash.com/photo-1573496799515-eebbb63814f2"
                alt="AI Assistant"
                className="w-8 h-8 rounded-full inline-block mr-2"
              />
            )}
            <div
              className={`inline-block p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
        ))}
        {mutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 text-muted-foreground"
          >
            <img
              src="https://images.unsplash.com/photo-1573496799515-eebbb63814f2"
              alt="AI Assistant"
              className="w-8 h-8 rounded-full inline-block mr-2"
            />
            <span className="inline-flex gap-1">
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
            </span>
          </motion.div>
        )}
      </ScrollArea>

      <form className="p-4 border-t" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={mutation.isPending}
          />
          <Button type="submit" disabled={mutation.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return (
      <Card className="w-full h-[400px] flex flex-col">
        <div className="flex items-center p-4 border-b">
          <h3 className="font-semibold">Chat with Christina's AI Clone</h3>
        </div>
        <ChatContent />
      </Card>
    );
  }

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-4 right-4 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

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
                <h3 className="font-semibold">Chat with Christina's AI Clone</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ChatContent />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}