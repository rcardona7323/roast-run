import cron from "node-cron";
import { db, membersTable, runsTable, rewardTiersTable } from "@runclub/db";
import { gte, and, eq, sql } from "drizzle-orm";
import { sendWeeklyDigest } from "./email.js";
import { logger } from "./logger.js";

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

  for (const member of members) {
    if (!member.email) continue;

    const weekRuns = await db
      .select({ total: sql<number>`sum(${runsTable.distanceMiles})` })
      .from(runsTable)
      .where(
        and(
          eq(runsTable.userId, member.userId),
          eq(runsTable.organizationId, member.organizationId),
          gte(runsTable.date, weekStr)
        )
      );

    const weekMiles = weekRuns[0]?.total ?? 0;

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

    try {
      await sendWeeklyDigest({
        to: member.email,
        name: member.displayName,
        orgName: member.organizationId,
        totalMiles: member.totalMiles,
        weekMiles,
        nextReward,
      });
    } catch (err) {
      logger.error({ err, memberId: member.id }, "Digest send failed");
    }
  }
}
