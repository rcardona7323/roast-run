import { Resend } from "resend";
import { logger } from "./logger.js";

const FROM = process.env.EMAIL_FROM ?? "noreply@runclub.app";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendWeeklyDigest(params: {
  to: string;
  name: string;
  orgName: string;
  totalMiles: number;
  weekMiles: number;
  nextReward: { name: string; milesRequired: number } | null;
}) {
  const { to, name, orgName, totalMiles, weekMiles, nextReward } = params;

  const html = `
    <h2>Your weekly run summary — ${orgName}</h2>
    <p>Hi ${name},</p>
    <p>You logged <strong>${weekMiles.toFixed(1)} miles</strong> this week.</p>
    <p>Your total: <strong>${totalMiles.toFixed(1)} miles</strong></p>
    ${
      nextReward
        ? `<p>Next reward: <strong>${nextReward.name}</strong> at ${nextReward.milesRequired} miles
           (${Math.max(0, nextReward.milesRequired - totalMiles).toFixed(1)} to go)</p>`
        : `<p>You've unlocked all rewards — keep running!</p>`
    }
    <p>See you on the road,<br>The ${orgName} Team</p>
  `;

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: `Your ${orgName} weekly run digest`,
    html,
  });

  if (error) logger.error({ error, to }, "Failed to send weekly digest");
}
