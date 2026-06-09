import { Router } from "express";
import { db } from "@workspace/db";
import { runsTable, rewardTiersTable, redemptionsTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";
import { getOrCreateMember } from "./members";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const now = new Date();

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [weekResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${runsTable.distanceMiles}), 0)` })
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId));

  const [weekMilesResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${runsTable.distanceMiles}), 0)` })
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId));

  const weekRunsResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${runsTable.distanceMiles}), 0)` })
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId));

  const weekMiles = await db
    .select({ total: sql<number>`COALESCE(SUM(${runsTable.distanceMiles}), 0)` })
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId));

  const [weekMilesRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${runsTable.distanceMiles}), 0)` })
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId));

  const recentRuns = await db
    .select()
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId))
    .orderBy(runsTable.date)
    .limit(5);

  const runsThisWeek = await db
    .select()
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId));

  const milesThisWeek = runsThisWeek
    .filter((r) => r.date >= weekStartStr)
    .reduce((sum, r) => sum + r.distanceMiles, 0);

  const milesThisMonth = runsThisWeek
    .filter((r) => r.date >= monthStartStr)
    .reduce((sum, r) => sum + r.distanceMiles, 0);

  const allRuns = runsThisWeek;
  const runCount = allRuns.length;

  const tiers = await db
    .select()
    .from(rewardTiersTable)
    .where(eq(rewardTiersTable.active, true))
    .orderBy(rewardTiersTable.milesRequired);

  const earnedTiers = tiers.filter((t) => member.totalMiles >= t.milesRequired);
  const nextRewardTier = tiers.find((t) => member.totalMiles < t.milesRequired) ?? null;
  const milesUntilNextReward = nextRewardTier
    ? nextRewardTier.milesRequired - member.totalMiles
    : null;

  const pendingRedemptions = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(redemptionsTable)
    .where(eq(redemptionsTable.userId, member.userId));

  const pendingCount = Number(pendingRedemptions[0]?.count ?? 0);

  res.json({
    totalMiles: member.totalMiles,
    runCount,
    milesThisMonth,
    milesThisWeek,
    nextRewardTier,
    milesUntilNextReward,
    earnedTiers,
    recentRuns: recentRuns.reverse(),
    pendingRedemptions: pendingCount,
  });
});

export default router;
