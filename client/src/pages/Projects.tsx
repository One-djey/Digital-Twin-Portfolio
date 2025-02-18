import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const projects = [
  {
    title: "E-commerce Platform",
    description: "A modern e-commerce solution with AI-powered recommendations",
    image: "https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8",
  },
  {
    title: "Analytics Dashboard",
    description: "Real-time analytics and data visualization platform",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
  },
  {
    title: "Social Media App",
    description: "A next-gen social platform with AI content moderation",
    image: "https://images.unsplash.com/photo-1510759395231-72b17d622279",
  },
  {
    title: "AI Chat Interface",
    description: "Natural language processing chat application",
    image: "https://images.unsplash.com/photo-1660592868727-858d28c3ba52",
  },
  {
    title: "Portfolio Generator",
    description: "Automated portfolio website generator using AI",
    image: "https://images.unsplash.com/photo-1685478237595-f452cb125f27",
  },
  {
    title: "IoT Dashboard",
    description: "Smart home IoT control and monitoring system",
    image: "https://images.unsplash.com/photo-1679409759768-bea306439ab8",
  },
];

export default function Projects() {
  return (
    <div className="py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-8 text-center">My Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-48 object-cover"
                />
                <CardHeader>
                  <CardTitle>{project.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{project.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
