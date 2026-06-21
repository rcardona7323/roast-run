import { router, protectedProcedure } from "../lib/trpc.js";
import { db, membersTable, runsTable, rewardTiersTable } from "../db/index.js";
import { eq, and, gte, desc, sql } from "drizzle-orm";

// Monday of the week containing the given date, as YYYY-MM-DD
function weekStart(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

// Consecutive weeks with at least one run, counting back from this week
// (or last week, so the streak isn't broken before they've run this week)
function computeStreak(runDates: string[]): number {
  const weeks = new Set(
    runDates.map((d) => weekStart(new Date(String(d).slice(0, 10) + "T12:00:00")))
  );
  const cursor = new Date();
  if (!weeks.has(weekStart(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(weekStart(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export const dashboardRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const [member] = await db
      .select()
      .from(membersTable)
      .where(
        and(
          eq(membersTable.userId, ctx.userId),
          eq(membersTable.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!member) return null;

    const recentRuns = await db
      .select()
      .from(runsTable)
      .where(
        and(
          eq(runsTable.userId, ctx.userId),
          eq(runsTable.organizationId, ctx.organizationId)
        )
      )
      .orderBy(desc(runsTable.date))
      .limit(5);

    const tiers = await db
      .select()
      .from(rewardTiersTable)
      .where(
        and(
          eq(rewardTiersTable.organizationId, ctx.organizationId),
          eq(rewardTiersTable.active, true)
        )
      );

    const earnedTiers = tiers.filter((t) => t.milesRequired <= member.totalMiles);
    const nextTier =
      tiers
        .filter((t) => t.milesRequired > member.totalMiles)
        .sort((a, b) => a.milesRequired - b.milesRequired)[0] ?? null;

    // Miles since the start of the current calendar week (Sunday),
    // matching the leaderboard's weekly view.
    const sunday = new Date();
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const weekStr = sunday.toISOString().slice(0, 10);

    const [weekResult] = await db
      .select({ total: sql<number>`coalesce(sum(${runsTable.distanceMiles}), 0)` })
      .from(runsTable)
      .where(
        and(
          eq(runsTable.userId, ctx.userId),
          eq(runsTable.organizationId, ctx.organizationId),
          gte(runsTable.date, weekStr)
        )
      );

    const allRunDates = await db
      .select({ date: runsTable.date })
      .from(runsTable)
      .where(
        and(
          eq(runsTable.userId, ctx.userId),
          eq(runsTable.organizationId, ctx.organizationId)
        )
      );

    return {
      member,
      recentRuns,
      earnedTiers,
      nextTier,
      weekMiles: weekResult?.total ?? 0,
      streakWeeks: computeStreak(allRunDates.map((r) => r.date)),
    };
  }),
});
