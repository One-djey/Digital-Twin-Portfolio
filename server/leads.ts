import { submitLeadArgsSchema } from "./ai/types.ts";
import { sendLeadEmail } from "./email.ts";
import {
  addContactMessage,
  countLeads,
  getAllUserMessages,
  updateUser,
} from "./storage.ts";

export const MAX_LEADS_PER_USER = 3;

// Executes the `submit_lead` tool for a chat visitor. The returned JSON string
// is fed back to the model, so business failures are reported as
// `{ok:false,error}` rather than thrown. Never throws.
export async function executeSubmitLead(
  userId: string,
  rawArgs: unknown,
): Promise<string> {
  try {
    const parsed = submitLeadArgsSchema.safeParse(rawArgs);
    if (!parsed.success) {
      return JSON.stringify({
        ok: false,
        error: "invalid_arguments",
        details: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    const lead = parsed.data;

    if ((await countLeads(userId)) >= MAX_LEADS_PER_USER) {
      return JSON.stringify({ ok: false, error: "lead_limit" });
    }

    await updateUser(userId, lead.name, lead.email, lead.phone ?? null);

    const rows = await addContactMessage(
      userId,
      lead.intentSummary,
      "chat_lead",
    );
    const contactId = rows[0]?.id;
    if (contactId === undefined) {
      return JSON.stringify({ ok: false, error: "internal_error" });
    }

    const messages = await getAllUserMessages(userId);
    const transcript = messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
      createdAt: m.createdAt,
    }));

    const result = await sendLeadEmail({ lead, transcript, contactId });
    if (!result.ok) {
      // The lead is stored; only the notification failed.
      console.error(
        `Lead email failed (contact ${contactId}): ${result.error}`,
      );
      return JSON.stringify({ ok: false, error: "email_failed" });
    }

    console.info(`New chat lead saved (contact ${contactId})`);
    return JSON.stringify({ ok: true });
  } catch (error: any) {
    console.error("Error submitting lead: " + error?.message);
    return JSON.stringify({ ok: false, error: "internal_error" });
  }
}
