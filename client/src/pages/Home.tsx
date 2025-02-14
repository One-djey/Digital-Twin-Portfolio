import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto"
      >
        <div className="mb-8">
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
        </div>

        <div className="flex gap-4 justify-center">
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
    </div>
  );
}
