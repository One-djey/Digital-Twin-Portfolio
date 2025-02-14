import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  return (
    <div className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-8 text-center">About Me</h1>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <p className="text-lg leading-relaxed mb-6">
              I'm a passionate Full Stack Developer with expertise in modern web technologies
              and artificial intelligence. With over 5 years of experience, I've worked
              on various projects ranging from e-commerce platforms to AI-powered
              applications.
            </p>
            
            <p className="text-lg leading-relaxed">
              My focus is on creating intuitive, user-friendly applications that
              leverage cutting-edge technology to solve real-world problems. I'm
              particularly interested in the intersection of AI and web development,
              and how we can use these technologies to enhance user experiences.
            </p>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-semibold mb-4">Skills</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            "React",
            "TypeScript",
            "Node.js",
            "Python",
            "AI/ML",
            "AWS",
            "Docker",
            "GraphQL",
            "PostgreSQL",
          ].map((skill, index) => (
            <motion.div
              key={skill}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-muted p-3 rounded-lg text-center"
            >
              {skill}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
