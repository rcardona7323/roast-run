import { logger } from "./logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping email send");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Roast & Run <noreply@roastandrun.com>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`[email] Resend error ${res.status}: ${body}`);
      logger.error({ status: res.status, body }, "Resend API error");
    } else {
      console.log(`[email] Sent to ${opts.to} — ${opts.subject}`);
      logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
    }
  } catch (err) {
    console.error("[email] fetch failed:", err);
    logger.error({ err }, "Failed to send email");
  }
}

export function buildWeeklyDigestEmail(opts: {
  memberName: string;
  totalMiles: number;
  milesThisWeek: number;
  nextTierName: string | null;
  milesUntilNext: number | null;
  appUrl: string;
}): string {
  const { memberName, totalMiles, milesThisWeek, nextTierName, milesUntilNext, appUrl } = opts;

  const progressSection = nextTierName && milesUntilNext != null
    ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:14px;color:#92400e;font-weight:600;">🎯 Next reward</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#b45309;">${nextTierName}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#78350f;">
          Just <strong>${milesUntilNext.toFixed(1)} more miles</strong> to go!
        </p>
      </div>`
    : `<div style="background:#d1fae5;border:1px solid #34d399;border-radius:8px;padding:20px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#065f46;font-weight:600;">🏆 You've unlocked every reward tier — you're a legend!</p>
      </div>`;

  const weekSection = milesThisWeek > 0
    ? `<p style="margin:0;font-size:14px;color:#555;">You logged <strong>${milesThisWeek.toFixed(1)} miles</strong> this week. Nice work!</p>`
    : `<p style="margin:0;font-size:14px;color:#888;">No runs logged yet this week — lace up and get out there! ☀️</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Your Weekly Run Update</title></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#b45309;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">☕</span>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Roast &amp; Run</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your weekly running update</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;color:#555;font-size:15px;">Hi ${memberName},</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#f5f0ea;border-radius:8px;padding:20px;text-align:center;width:48%;">
                  <p style="margin:0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total Miles</p>
                  <p style="margin:6px 0 0;font-size:36px;font-weight:700;color:#b45309;">${totalMiles.toFixed(1)}</p>
                </td>
                <td style="width:4%;"></td>
                <td style="background:#f5f0ea;border-radius:8px;padding:20px;text-align:center;width:48%;">
                  <p style="margin:0;font-size:13px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">This Week</p>
                  <p style="margin:6px 0 0;font-size:36px;font-weight:700;color:#b45309;">${milesThisWeek.toFixed(1)}</p>
                </td>
              </tr>
            </table>

            ${weekSection}
            ${progressSection}

            <div style="text-align:center;margin-top:28px;">
              <a href="${appUrl}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:14px 32px;border-radius:100px;font-weight:600;font-size:15px;">
                View My Dashboard →
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:28px 0;"/>
            <p style="margin:0;color:#bbb;font-size:12px;text-align:center;">
              Roast &amp; Run Club · <a href="${appUrl}" style="color:#bbb;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildApprovalEmail(opts: {
  memberName: string;
  rewardName: string;
  totalMiles: number;
  nextTierName: string | null;
  milesUntilNext: number | null;
}): string {
  const { memberName, rewardName, totalMiles, nextTierName, milesUntilNext } = opts;

  const nextSection = nextTierName && milesUntilNext != null
    ? `<p style="margin:16px 0;color:#555;">
        You currently have <strong>${totalMiles.toFixed(1)} miles</strong> in the bank.
        Your next reward — <strong>${nextTierName}</strong> — is just
        <strong>${milesUntilNext.toFixed(1)} more miles</strong> away. Keep running!
      </p>`
    : `<p style="margin:16px 0;color:#555;">
        You currently have <strong>${totalMiles.toFixed(1)} miles</strong> logged.
        You've earned every tier we offer — you're a legend!
      </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Reward Approved</title></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#b45309;padding:28px 32px;text-align:center;">
            <span style="font-size:28px;">☕</span>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
              Roast &amp; Run
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">
              Your reward has been approved! 🎉
            </h2>
            <p style="margin:0 0 20px;color:#555;font-size:15px;">
              Hi ${memberName},
            </p>
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:20px;margin-bottom:20px;">
              <p style="margin:0;font-size:15px;color:#92400e;">
                <strong>✅ Approved reward:</strong><br/>
                <span style="font-size:18px;font-weight:700;color:#b45309;">${rewardName}</span>
              </p>
              <p style="margin:10px 0 0;font-size:13px;color:#78350f;">
                Swing by the café and show this email to claim your reward!
              </p>
            </div>
            ${nextSection}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
            <p style="margin:0;color:#999;font-size:12px;text-align:center;">
              Roast &amp; Run Club · Keep those miles coming!
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
