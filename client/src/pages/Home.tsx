import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ChatWidget from "@/components/ChatWidget";
import portfolioData from "@/data/portfolio.json";

export default function Home() {
  const [chatStarted, setChatStarted] = useState(false);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <img
          src={portfolioData.personal.avatar}
          alt="Professional headshot"
          className="w-32 h-32 rounded-full mx-auto object-cover mb-6"
        />
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
          Hi, I'm {portfolioData.personal.name}
        </h1>
        <p className="text-xl text-muted-foreground">
          {portfolioData.personal.title}
        </p>
      </motion.div>

      <div className="flex-1">
        <ChatWidget 
          embedded={true} 
          hideFrame={true}
          onFirstMessage={() => setChatStarted(true)} 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center gap-4 mt-8"
      >
        <Link href="/portfolio">
          <Button>View My Work</Button>
        </Link>
        <Link href="/contact">
          <Button variant="outline">Get in Touch</Button>
        </Link>
      </motion.div>
    </div>
  );
}