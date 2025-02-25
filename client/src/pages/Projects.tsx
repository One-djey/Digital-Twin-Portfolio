import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portfolioData } from "../../../shared/portfolio.ts";

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
                    {portfolioData.projects.map((project, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            {project.url ? (
                                <a href={project.url} target="_blank" rel="noopener noreferrer">
                                    <Card
                                        className="overflow-hidden h-full transition-transform duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
                                    >
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
                                </a>
                            ) : (
                                <Card
                                    className="overflow-hidden h-full transition-transform duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
                                >
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
                            )}
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
