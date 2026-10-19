import { AIAgent } from "./AIAgent.ts";
import { buildSystemPrompt } from "./prompts/digitalTwin.ts";
import { DIGITAL_TWIN_TOOLS } from "./tools.ts";
import { portfolioData } from "../../shared/portfolio.ts";

// Jeremy's AI assistant: answers visitors about Jeremy from portfolioData and
// can pass qualified requests on to him through the submit_lead tool.
class DigitalTwinAgent extends AIAgent {
  constructor() {
    super({
      model: portfolioData.ai_clone.model,
      // Low temperature: factual answers grounded in the portfolio data.
      temperature: 0.3,
      maxTokens: 600,
      buildSystemPrompt,
      tools: DIGITAL_TWIN_TOOLS,
      toolSuccessFallbackText:
        "Done, your request has been passed on to Jeremy.",
    });
  }
}

export const digitalTwinAgent = new DigitalTwinAgent();
