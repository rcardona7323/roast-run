import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("[resend] RESEND_API_KEY not set — emails will not send");
}

// Resend throws if given an empty string; use a placeholder so the server boots
export const resend = new Resend(apiKey || "re_placeholder_key_not_configured");

export const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? "Coastal Crew Run Club <noreply@solbowls.com>";
