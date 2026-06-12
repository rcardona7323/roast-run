import cron from "node-cron";
import { db, membersTable, runsTable, rewardTiersTable, organizationsTable } from "@runclub/db";
import { gte, and, eq, sql } from "drizzle-orm";
import { resend, FROM_ADDRESS } from "./resend.js";
import { weeklyUpdateHtml } from "./email-templates.js";
import { logger } from "./logger.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

export function startCronJobs() {
  // Thursday at 8am
  cron.schedule("0 8 * * 4", async () => {
    logger.info("Running weekly digest cron");
    await sendDigests();
  });
}

async function sendDigests() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekStr = oneWeekAgo.toISOString().slice(0, 10);

  const members = await db.select().from(membersTable);
  const orgs = await db.select().from(organizationsTable);
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "Your Run Club";

  for (const member of members) {
    if (!member.email) continue;

    let weekMiles = 0;
    if (member.userId) {
      const weekRuns = await db
        .select({ total: sql<number>`coalesce(sum(${runsTable.distanceMiles}), 0)` })
        .from(runsTable)
        .where(
          and(
            eq(runsTable.userId, member.userId),
            eq(runsTable.organizationId, member.organizationId),
            gte(runsTable.date, weekStr)
          )
        );
      weekMiles = weekRuns[0]?.total ?? 0;
    }

    const tiers = await db
      .select()
      .from(rewardTiersTable)
      .where(
        and(
          eq(rewardTiersTable.organizationId, member.organizationId),
          eq(rewardTiersTable.active, true)
        )
      );

    const nextReward =
      tiers
        .filter((t) => t.milesRequired > member.totalMiles)
        .sort((a, b) => a.milesRequired - b.milesRequired)[0] ?? null;

    const club = orgName(member.organizationId);
    const bodyLines = [
      `You logged ${weekMiles.toFixed(1)} miles this week.`,
      nextReward
        ? `Next reward: ${nextReward.name} at ${nextReward.milesRequired} miles — just ${Math.max(0, nextReward.milesRequired - member.totalMiles).toFixed(1)} to go!`
        : `You've unlocked every reward — incredible work. Keep it rolling!`,
      ``,
      `See you on the road ☕`,
    ];

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: `🏃 ${club} — Your Weekly Run Digest`,
        html: weeklyUpdateHtml({
          orgName: club,
          subject: `Your Weekly Run Digest`,
          body: bodyLines.join("\n"),
          memberName: member.displayName,
          totalMiles: member.totalMiles,
          appUrl: APP_URL,
        }),
      });
    } catch (err) {
      logger.error({ err, memberId: member.id }, "Digest send failed");
    }
  }
}
