import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageBarProps {
  onSend: (message: string) => void;
  name?: string;
  disabled?: boolean;
}

export default function MessageBar({ onSend, name = "Christina", disabled }: MessageBarProps) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const message = formData.get("message") as string;
    if (message.trim()) {
      onSend(message.trim());
      form.reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        name="message"
        placeholder={`Chat with ${name}'s AI clone...`}
        disabled={disabled}
        autoComplete="off"
      />
      <Button type="submit" size="icon" disabled={disabled}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
