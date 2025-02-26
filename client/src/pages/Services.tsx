import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, ChevronRight, Star } from "lucide-react";
import { portfolioData } from "../../../shared/portfolio.ts";
import { useLocation } from "wouter";

// Interface for portfolio data types
interface ServiceType {
    title: string;
    icon: string;
    shortDescription: string;
    features: string[];
}

interface TestimonialType {
    name: string;
    position: string;
    text: string;
}

interface FAQItemType {
    question: string;
    answer: string;
}

interface ProcessStepType {
    step: number;
    title: string;
    description: string;
}

// Component for background particle effects
const ParticleEffect = () => {
    return (
        <div className="absolute inset-0 -z-10 opacity-20 overflow-hidden">
            {Array(20).fill(0).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-primary rounded-full"
                    initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight
                    }}
                    animate={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * window.innerHeight
                    }}
                    transition={{
                        duration: 15 + Math.random() * 20,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    );
};

// Component for service cards
const ServiceCard = ({ service, index }: { service: ServiceType; index: number }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [, setLocation] = useLocation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            whileHover={{ scale: 1.03 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="h-full"
        >
            <Card className="h-full border-2 overflow-hidden relative flex flex-col">
                {isHovered && (
                    <motion.div
                        className="absolute inset-0 bg-primary/5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    />
                )}
                <CardHeader className="text-center relative z-10">
                    <motion.div
                        className="mx-auto mb-4"
                        animate={{
                            y: isHovered ? [0, -10, 0] : 0
                        }}
                        transition={{ duration: 1, repeat: isHovered ? Infinity : 0 }}
                        dangerouslySetInnerHTML={{ __html: service.icon }}
                    />
                    <CardTitle className="text-xl">
                        {service.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 flex-grow flex flex-col">
                    <p className="text-center text-muted-foreground mb-6">{service.shortDescription}</p>

                    <div className="space-y-2 mb-6 flex-grow">
                        {service.features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                className="flex items-start"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + idx * 0.1 }}
                            >
                                <Check className="h-5 w-5 text-primary shrink-0 mr-2 mt-0.5" />
                                <span className="text-sm">{feature}</span>
                            </motion.div>
                        ))}
                    </div>

                    <div className="pt-2 text-center mt-auto">
                        <Button className="group" onClick={() => setLocation("/contact")}>
                            Learn more
                            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

// Testimonials component
const Testimonials = ({ testimonials }: { testimonials: TestimonialType[] }) => {
    if (!testimonials || testimonials.length === 0) return null;

    return (
        <div className="py-16 bg-muted/30">
            <div className="max-w-3xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-10">Client Testimonials</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card className="h-full">
                                <CardContent className="pt-6">
                                    <div className="flex items-center mb-4">
                                        <div className="flex text-amber-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} fill="currentColor" className="h-4 w-4" />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="italic mb-4">"{testimonial.text}"</p>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold mr-3">
                                            {testimonial.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.position}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// FAQ component
const FAQ = ({ faqItems }: { faqItems: FAQItemType[] }) => {
    if (!faqItems || faqItems.length === 0) return null;

    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="py-16">
            <div className="max-w-3xl mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqItems.map((item, index) => (
                        <Card
                            key={index}
                            className="cursor-pointer"
                            onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        >
                            <CardHeader className="py-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg">{item.question}</CardTitle>
                                    <ChevronRight
                                        className={`h-5 w-5 transition-transform ${openIndex === index ? 'rotate-90' : ''}`}
                                    />
                                </div>
                            </CardHeader>
                            {openIndex === index && (
                                <CardContent className="pt-0 pb-4">
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                    >
                                        <p>{item.answer}</p>
                                    </motion.div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Call to Action component
const CTA = () => {
    const [, setLocation] = useLocation();

    return (
        <div className="py-16 bg-primary/5 relative overflow-hidden">
            <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl font-bold mb-4">Ready to Collaborate?</h2>
                    <p className="text-lg mb-8 max-w-xl mx-auto">
                        Let's discuss your project and see how I can help you achieve your goals.
                    </p>
                    <Button size="lg" className="font-medium" onClick={() => setLocation("/contact")}>
                        Contact Me
                    </Button>
                </motion.div>
            </div>

            {/* Decorative circles */}
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/5 z-0"></div>
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 z-0"></div>
        </div>
    );
};

export default function Services() {
    const { services = [], testimonials = [], faq = [], processSteps = [] } = portfolioData;

    return (
        <div className="relative">
            <ParticleEffect />

            <div className="py-12">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-4xl mx-auto px-4"
                >
                    <div className="text-center mb-16">
                        <motion.h1
                            className="text-4xl sm:text-5xl font-bold mb-6"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            My Services
                        </motion.h1>
                        <motion.p
                            className="text-xl text-muted-foreground max-w-2xl mx-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            Tailored solutions to support your digital transformation journey.
                        </motion.p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-16">
                        {services.map((service: ServiceType, index: number) => (
                            <ServiceCard key={service.title} service={service} index={index} />
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16 mt-8"
                    >
                        <h2 className="text-2xl font-semibold mb-4">How I Work</h2>
                        <p className="text-muted-foreground mb-8">
                            A client-centered approach with a clear and efficient process.
                        </p>

                        <div className="grid sm:grid-cols-3 gap-8">
                            {processSteps.map((item: ProcessStepType, index: number) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative"
                                >
                                    <div className="flex justify-center mb-4">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold relative">
                                            {item.step}
                                            {index < 2 && (
                                                <div className="absolute w-full h-0.5 bg-primary/20 left-full top-1/2 -translate-y-1/2 hidden sm:block" style={{ width: "calc(100% - 3rem)" }}></div>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-semibold mb-2">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            <Testimonials testimonials={testimonials} />
            <FAQ faqItems={faq} />
            <CTA />
        </div>
    );
}