import { useState, useEffect, useRef } from "react";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  const [chatStarted, setChatStarted] = useState(false);
  const chatWidgetRef = useRef<{ resetChat: () => void; scrollToBottom: () => void }>(null);

  useEffect(() => {
    if (chatWidgetRef.current) {
      chatWidgetRef.current.scrollToBottom();
    }
  }, []);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col max-w-3xl mx-auto px-4">

      <div className="flex-1">
        <ChatWidget 
          ref={chatWidgetRef}
          embedded={true} 
          hideFrame={true}
          onFirstMessage={() => setChatStarted(true)} 
        />
      </div>
    </div>
  );
}