import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left side: Introduction and CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center md:text-left"
          >
            <div className="mb-8">
              <img
                src="https://images.unsplash.com/photo-1573496799515-eebbb63814f2"
                alt="Professional headshot"
                className="w-48 h-48 rounded-full mx-auto md:mx-0 object-cover mb-6"
              />
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
                Hi, I'm Christina
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Full Stack Developer & AI Enthusiast
              </p>
            </div>

            <div className="flex gap-4 justify-center md:justify-start">
              <Link href="/portfolio">
                <Button size="lg">View My Work</Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right side: Embedded Chat */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="sticky top-24">
              <ChatWidget embedded={true} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}