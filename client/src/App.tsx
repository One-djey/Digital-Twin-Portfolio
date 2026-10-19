import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { cn } from "@/lib/utils";
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
import LegalNotice from "@/pages/legal/LegalNotice";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { portfolioData } from "../../shared/portfolio.ts";
import { LEGAL_ROUTES } from "@shared/chat.ts";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/services" component={Services} />
      <Route path="/projects" component={Projects} />
      <Route path="/resume" component={Resume} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path={LEGAL_ROUTES.notice} component={LegalNotice} />
      <Route path={LEGAL_ROUTES.privacy} component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Home is a full-viewport chat: lock the layout to the viewport height so
  // the conversation scrolls inside the widget and the footer stays below it.
  const [location] = useLocation();
  const isHomePage = location === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <Helmet>
        <title>
          {portfolioData.personal.name} - {portfolioData.personal.title}
        </title>
        <link rel="icon" href={portfolioData.personal.avatar} />
      </Helmet>
      <div
        className={cn(
          "flex flex-col bg-background",
          isHomePage ? "h-dvh overflow-hidden" : "min-h-screen",
        )}
      >
        <Navbar />
        <main
          className={cn("container mx-auto flex-1", isHomePage && "min-h-0")}
        >
          <Router />
        </main>
        <Footer />
        <ChatWidget />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
