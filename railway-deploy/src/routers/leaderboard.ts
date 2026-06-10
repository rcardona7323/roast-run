import { router, protectedProcedure } from "../lib/trpc.js";
import { db, membersTable, runsTable } from "../db/index.js";
import { eq, and, gte, sql } from "drizzle-orm";

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

async function rankedByPeriod(organizationId: string, fromDate: string) {
  const rows = await db
    .select({
      memberId: membersTable.id,
      displayName: membersTable.displayName,
      miles: sql<number>`COALESCE(SUM(${runsTable.distanceMiles}), 0)`.as("miles"),
      runs: sql<number>`COUNT(${runsTable.id})`.as("runs"),
    })
    .from(membersTable)
    .leftJoin(
      runsTable,
      and(
        eq(runsTable.userId, membersTable.userId),
        eq(runsTable.organizationId, membersTable.organizationId),
        gte(runsTable.date, fromDate)
      )
    )
    .where(eq(membersTable.organizationId, organizationId))
    .groupBy(membersTable.id, membersTable.displayName)
    .orderBy(sql`miles DESC`);

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

export const leaderboardRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [weekly, monthly, allTime] = await Promise.all([
      rankedByPeriod(ctx.organizationId, weekStart()),
      rankedByPeriod(ctx.organizationId, monthStart()),
      db
        .select({
          memberId: membersTable.id,
          displayName: membersTable.displayName,
          miles: membersTable.totalMiles,
          runs: sql<number>`(SELECT COUNT(*) FROM runs WHERE runs.user_id = members.user_id AND runs.organization_id = members.organization_id)`.as("runs"),
        })
        .from(membersTable)
        .where(eq(membersTable.organizationId, ctx.organizationId))
        .orderBy(sql`members.total_miles DESC`),
    ]);

    return {
      weekly,
      monthly,
      allTime: allTime.map((r, i) => ({ rank: i + 1, ...r })),
    };
  }),
});
