import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { portfolioData } from "../../../shared/portfolio.ts"; // Importer les données du portfolio
import { useState } from "react"; // Importer useState pour gérer l'état des compétences
import ReactMarkdown from 'react-markdown'; // Importer ReactMarkdown
import remarkGfm from 'remark-gfm'; // Importer remark-gfm pour le support de GFM

export default function CV() {
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
            <ReactMarkdown 
              className="text-lg leading-relaxed mb-6" 
              remarkPlugins={[remarkGfm]} // Utiliser remark-gfm pour le support GFM
            >
              {portfolioData.intro.aboutMe}
            </ReactMarkdown>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-semibold mb-4">Skills</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {portfolioData.skills.map((skill, index) => (
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

        <h2 className="text-2xl font-semibold mb-4">Experiences</h2>
        <div className="mb-8 space-y-4">
          {portfolioData.experiences.map((experience, index) => {
            const [isOpen, setIsOpen] = useState(false); // État pour gérer l'affichage des compétences
            return (
              <Card key={index} className="border border-gray-200">
                <CardContent className="py-4">
                  <div className="flex items-start">
                    <img src={experience.logo} alt={`${experience.company} logo`} className="w-16 h-16 rounded-md mr-4" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{experience.title}</h3>
                      <p className="text-sm text-muted-foreground font-bold">{experience.company}</p>
                      <p className="text-sm text-muted-foreground">{experience.period}</p>
                    </div>
                  </div>
                  <p className="mt-2">{experience.description}</p>
                  <button onClick={() => setIsOpen(!isOpen)} className="mt-2 text-blue-500">
                    Skills
                  </button>
                  {isOpen && (
                    <div className="mt-2 flex flex-wrap">
                      {experience.skills.map((skill, idx) => (
                        <span key={idx} className="bg-muted text-sm rounded-full px-2 py-1 mr-2 mb-2">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <h2 className="text-2xl font-semibold mb-4">Education</h2>
        <div className="mb-8 space-y-4">
          {portfolioData.education.map((education, index) => (
            <Card key={index} className="border border-gray-200">
              <CardContent className="py-4">
                <div className="flex items-start">
                  <img src={education.logo} alt={`${education.institution} logo`} className="w-16 h-16 rounded-md mr-4" />
                  <div className="flex-1">
                    <h3><span className="font-semibold text-lg">{education.degree}</span> - {education.field}</h3>
                    <p className="text-sm text-muted-foreground font-bold">{education.institution}</p>
                    <p className="text-sm text-muted-foreground">{education.year}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
