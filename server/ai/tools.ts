import {
  SUBMIT_LEAD_TOOL_NAME,
  type SubmitLeadArgs,
  type ToolDefinition,
} from "./types.ts";

// JSON schema mirror of `submitLeadArgsSchema` (types.ts), which remains the
// source of truth: the tool executor validates the arguments with it. The
// `satisfies` clause keeps both property lists in sync at compile time.
const submitLeadProperties = {
  name: {
    type: "string",
    description: "The visitor's full name, as they gave it.",
    maxLength: 100,
  },
  email: {
    type: "string",
    description: "The visitor's email address, exactly as they typed it.",
    maxLength: 200,
  },
  phone: {
    type: "string",
    description:
      "The visitor's phone number. Only include it if the visitor gave one; omit the field otherwise.",
    maxLength: 40,
  },
  intentSummary: {
    type: "string",
    description:
      'ONE sentence (10 to 200 characters), in English or in the visitor\'s language, summarising what the visitor wants from Jeremy, e.g. "SaaS startup looking for a freelancer to add an AI agent to its customer support, starting within a month."',
    minLength: 10,
    maxLength: 200,
  },
} satisfies Record<keyof SubmitLeadArgs, Record<string, unknown>>;

export const SUBMIT_LEAD_TOOL: ToolDefinition = {
  name: SUBMIT_LEAD_TOOL_NAME,
  description:
    'Send the visitor\'s contact details and a one-sentence summary of their need to Jeremy by email, so he can get back to them. Only call it after the visitor has given their full name and a valid email address AND has explicitly agreed to the recap of what will be sent. Call it once per request. Returns {"ok":true} on success or {"ok":false,"error":...} on failure.',
  parameters: {
    type: "object",
    properties: submitLeadProperties,
    required: ["name", "email", "intentSummary"],
    additionalProperties: false,
  },
};

export const DIGITAL_TWIN_TOOLS: ToolDefinition[] = [SUBMIT_LEAD_TOOL];
