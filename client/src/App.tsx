import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Helmet } from "react-helmet";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Services from "@/pages/Services.tsx";
import Projects from "@/pages/Projects";
import Resume from "@/pages/Resume";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";
import { portfolioData } from "../../shared/portfolio.ts";

function Router() {
  return (
    <Switch>
        <Route path="/" component={Home} />
        <Route path="/services" component={Services} />
        <Route path="/projects" component={Projects} />
        <Route path="/resume" component={Resume} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
      <QueryClientProvider client={queryClient}>
      <Helmet>
              <title>{portfolioData.personal.name} - {portfolioData.personal.title}</title>
              <link rel="icon" href={portfolioData.personal.avatar} />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto">
          <Router />
        </main>
        <ChatWidget />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;