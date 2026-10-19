import { Resend } from "resend";
import { portfolioData } from "@shared/portfolio.ts";
import type { SubmitLeadArgs } from "./ai/types.ts";

// Emails to the site owner (contact form + chat leads) sent through Resend.

const OWNER_EMAIL = portfolioData.personal.email;
const FROM = `Jeremy Maisse Portfolio <${OWNER_EMAIL}>`;

export type EmailResult = { ok: true } | { ok: false; error: string };

// `new Resend(key)` throws when the key is missing, so the client is created
// on first use instead of at import time (the server must boot without it).
let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  const v = singleLine(value);
  return v.length > max ? v.slice(0, max - 1).trimEnd() + "…" : v;
}

async function send(params: {
  subject: string;
  text: string;
  html: string;
  replyTo: string;
  category: string;
  idempotencyKey: string;
}): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) return { ok: false, error: "RESEND_API_KEY is not configured" };
  try {
    const { error } = await resend.emails.send(
      {
        from: FROM,
        to: OWNER_EMAIL,
        subject: params.subject,
        text: params.text,
        html: params.html,
        replyTo: params.replyTo,
        tags: [{ name: "category", value: params.category }],
      },
      { idempotencyKey: params.idempotencyKey },
    );
    // The SDK resolves with `{ data, error }` on API failures instead of
    // throwing.
    if (error) {
      return {
        ok: false,
        error: `${error.name} (${error.statusCode ?? "n/a"}): ${error.message}`,
      };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

export async function sendContactEmail(params: {
  name?: string | null;
  email?: string | null;
  message: string;
  contactId: number;
}): Promise<EmailResult> {
  const name = params.name?.trim() || "Anonymous";
  const email = params.email?.trim() || "";

  const text = [
    `New message from the contact form`,
    ``,
    `Name: ${name}`,
    `Email: ${email || "not provided"}`,
    ``,
    params.message,
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
<h2 style="margin:0 0 12px">New message from the contact form</h2>
<p style="margin:0 0 16px"><strong>${escapeHtml(name)}</strong>${
    email
      ? ` &middot; <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
      : ""
  }</p>
<div style="white-space:pre-wrap;padding:12px 16px;background:#f5f5f5;border-radius:8px">${escapeHtml(params.message)}</div>
</div>`;

  return send({
    subject: `[Contact] ${singleLine(name)}`,
    text,
    html,
    replyTo: email || OWNER_EMAIL,
    category: "contact_form",
    idempotencyKey: `contact-${params.contactId}`,
  });
}

export type TranscriptEntry = {
  role: "user" | "assistant";
  content: string;
  createdAt: Date | null;
};

function formatTimestamp(date: Date | null): string {
  if (!date) return "--";
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

// Best-effort normalisation of a visitor-typed phone number into an
// international form for wa.me / tel: links. French numbers (leading 0) are
// assumed when no country code is given.
function phoneDigits(phone: string): string | null {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return "33" + digits.slice(1);
  return digits;
}

export async function sendLeadEmail(params: {
  lead: SubmitLeadArgs;
  transcript: TranscriptEntry[];
  contactId: number;
}): Promise<EmailResult> {
  const { lead, transcript } = params;
  const name = singleLine(lead.name);
  const digits = lead.phone ? phoneDigits(lead.phone) : null;

  const textTranscript = transcript
    .map(
      (m) =>
        `[${formatTimestamp(m.createdAt)}] ${m.role === "user" ? "Visitor" : "Assistant"}: ${m.content}`,
    )
    .join("\n\n");

  const text = [
    lead.intentSummary,
    ``,
    `--- Contact ---`,
    `Name: ${name}`,
    `Email: ${lead.email}`,
    ...(lead.phone
      ? [
          `Phone: ${lead.phone}${digits ? ` (WhatsApp: https://wa.me/${digits})` : ""}`,
        ]
      : []),
    ``,
    `--- Conversation ---`,
    textTranscript,
  ].join("\n");

  const contactLines = [
    `<strong>${escapeHtml(name)}</strong>`,
    `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>`,
  ];
  if (lead.phone) {
    contactLines.push(
      digits
        ? `${escapeHtml(lead.phone)} &middot; <a href="https://wa.me/${digits}">WhatsApp</a> &middot; <a href="tel:+${digits}">Call</a>`
        : escapeHtml(lead.phone),
    );
  }

  const htmlTranscript = transcript
    .map((m) => {
      const isVisitor = m.role === "user";
      return `<div style="margin:0 0 10px;padding:10px 14px;border-radius:8px;background:${isVisitor ? "#e8f0fe" : "#f5f5f5"}">
<div style="font-size:12px;color:#666;margin-bottom:4px">${escapeHtml(formatTimestamp(m.createdAt))} &middot; ${isVisitor ? "Visitor" : "Assistant"}</div>
<div style="white-space:pre-wrap">${escapeHtml(m.content)}</div>
</div>`;
    })
    .join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:640px">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#666;margin-bottom:6px">New chat lead</div>
<h2 style="margin:0 0 20px;font-size:20px;line-height:1.35">${escapeHtml(lead.intentSummary)}</h2>
<div style="margin:0 0 24px;padding:12px 16px;border:1px solid #ddd;border-radius:8px">${contactLines.join("<br>")}</div>
<h3 style="margin:0 0 10px;font-size:14px;color:#444">Conversation</h3>
${htmlTranscript}
</div>`;

  return send({
    subject: `[Chat lead] ${name} — ${truncate(lead.intentSummary, 60)}`,
    text,
    html,
    replyTo: lead.email,
    category: "chat_lead",
    idempotencyKey: `lead-${params.contactId}`,
  });
}
