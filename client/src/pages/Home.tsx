import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ChatWidget from "@/components/ChatWidget";
import MessageBar from "@/components/MessageBar";

export default function Home() {
  const [chatStarted, setChatStarted] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] relative">
      <motion.div
        initial={false}
        animate={{
          top: chatStarted ? "2rem" : "50%",
          y: chatStarted ? 0 : "-50%",
          width: "100%",
        }}
        className="absolute left-0 px-4"
      >
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <img
              src="https://images.unsplash.com/photo-1573496799515-eebbb63814f2"
              alt="Professional headshot"
              className="w-48 h-48 rounded-full mx-auto object-cover mb-6"
            />
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              Hi, I'm Christina
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Full Stack Developer & AI Enthusiast
            </p>
          </motion.div>

          <div className="flex flex-col gap-4 items-center">
            <div className="flex gap-4">
              <Link href="/portfolio">
                <Button size="lg">View My Work</Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Get in Touch
                </Button>
              </Link>
            </div>

            {!chatStarted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-md mt-4"
              >
                <MessageBar 
                  onSend={() => setChatStarted(true)} 
                />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {chatStarted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-48 left-0 right-0 bottom-0 px-4"
        >
          <div className="max-w-3xl mx-auto h-full">
            <ChatWidget embedded={true} onFirstMessage={() => {}} />
          </div>
        </motion.div>
      )}
    </div>
  );
}