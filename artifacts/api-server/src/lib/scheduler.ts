import cron from "node-cron";
import { db } from "@workspace/db";
import { membersTable, runsTable, rewardTiersTable } from "@workspace/db";
import { eq, and, gte, isNotNull, asc, isNull } from "drizzle-orm";
import { sendEmail, buildWeeklyDigestEmail } from "./email";
import { logger } from "./logger";

const APP_URL = process.env.APP_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN ?? "localhost"}`;

export async function sendWeeklyDigest(): Promise<{ sent: number; skipped: number }> {
  logger.info("Weekly digest: starting run");

  const tiers = await db
    .select()
    .from(rewardTiersTable)
    .where(eq(rewardTiersTable.active, true))
    .orderBy(asc(rewardTiersTable.milesRequired));

  const members = await db
    .select()
    .from(membersTable)
    .where(and(isNotNull(membersTable.email), isNull(membersTable.parentMemberId)));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  let sent = 0;
  let skipped = 0;

  for (const member of members) {
    if (!member.email) { skipped++; continue; }

    const weekRuns = await db
      .select({ distanceMiles: runsTable.distanceMiles })
      .from(runsTable)
      .where(and(eq(runsTable.userId, member.userId), gte(runsTable.date, weekStart.toISOString().split("T")[0])));

    const milesThisWeek = weekRuns.reduce((sum, r) => sum + (r.distanceMiles ?? 0), 0);
    const totalMiles = member.totalMiles ?? 0;
    const nextTier = tiers.find((t) => totalMiles < t.milesRequired) ?? null;
    const milesUntilNext = nextTier ? nextTier.milesRequired - totalMiles : null;

    try {
      await sendEmail({
        to: member.email,
        subject: `☕ Your Roast & Run weekly update — ${totalMiles.toFixed(1)} miles and counting!`,
        html: buildWeeklyDigestEmail({
          memberName: member.displayName,
          totalMiles,
          milesThisWeek,
          nextTierName: nextTier?.name ?? null,
          milesUntilNext,
          appUrl: APP_URL,
        }),
      });
      sent++;
    } catch (err) {
      logger.error({ err, memberId: member.id }, "Weekly digest: failed to send to member");
      skipped++;
    }
  }

  logger.info({ sent, skipped }, "Weekly digest: complete");
  return { sent, skipped };
}

export function startScheduler(): void {
  // Every Thursday at 9:00 AM server time
  cron.schedule("0 9 * * 4", () => {
    sendWeeklyDigest().catch((err) => {
      logger.error({ err }, "Weekly digest: unhandled error in cron job");
    });
  });

  logger.info("Scheduler started — weekly digest runs every Monday at 09:00");
}
