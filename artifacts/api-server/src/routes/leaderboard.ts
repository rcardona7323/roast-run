import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, runsTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (req, res) => {
  const period = (req.query.period as string) || "alltime";

  let members;

  if (period === "alltime") {
    members = await db
      .select({
        userId: membersTable.userId,
        displayName: membersTable.displayName,
        profileImageUrl: membersTable.profileImageUrl,
        totalMiles: membersTable.totalMiles,
        runCount: sql<number>`(SELECT COUNT(*) FROM runs WHERE runs.user_id = members.user_id)`.as("run_count"),
      })
      .from(membersTable)
      .orderBy(membersTable.totalMiles);

    members = members.reverse();
  } else {
    const now = new Date();
    let cutoff: Date;

    if (period === "thisweek") {
      cutoff = new Date(now);
      cutoff.setDate(now.getDate() - now.getDay());
      cutoff.setHours(0, 0, 0, 0);
    } else {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const cutoffStr = cutoff.toISOString().split("T")[0];

    const rows = await db
      .select({
        userId: runsTable.userId,
        totalMiles: sql<number>`SUM(${runsTable.distanceMiles})`.as("total_miles"),
        runCount: sql<number>`COUNT(*)`.as("run_count"),
      })
      .from(runsTable)
      .where(gte(runsTable.date, cutoffStr))
      .groupBy(runsTable.userId)
      .orderBy(sql`SUM(${runsTable.distanceMiles}) DESC`);

    const memberMap = new Map<string, { displayName: string; profileImageUrl: string | null }>();
    const allMembers = await db.select().from(membersTable);
    for (const m of allMembers) {
      memberMap.set(m.userId, { displayName: m.displayName, profileImageUrl: m.profileImageUrl });
    }

    members = rows.map((r) => ({
      userId: r.userId,
      displayName: memberMap.get(r.userId)?.displayName ?? "Runner",
      profileImageUrl: memberMap.get(r.userId)?.profileImageUrl ?? null,
      totalMiles: r.totalMiles,
      runCount: Number(r.runCount),
    }));
  }

  const ranked = members.map((m, i) => ({
    rank: i + 1,
    userId: m.userId,
    displayName: m.displayName,
    profileImageUrl: m.profileImageUrl,
    totalMiles: Number(m.totalMiles) || 0,
    runCount: Number(m.runCount) || 0,
  }));

  res.json(ranked);
});

export default router;
