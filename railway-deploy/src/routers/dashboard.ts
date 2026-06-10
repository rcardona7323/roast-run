import { router, protectedProcedure } from "../lib/trpc.js";
import { db, membersTable, runsTable, rewardTiersTable } from "../db/index.js";
import { eq, and, gte, desc, sql } from "drizzle-orm";

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

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStr = oneWeekAgo.toISOString().slice(0, 10);

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

    return {
      member,
      recentRuns,
      earnedTiers,
      nextTier,
      weekMiles: weekResult?.total ?? 0,
    };
  }),
});
