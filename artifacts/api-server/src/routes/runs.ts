import { Router } from "express";
import { db } from "@workspace/db";
import { runsTable, membersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getOrCreateMember } from "./members";

const router = Router();

router.get("/runs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const runs = await db
    .select()
    .from(runsTable)
    .where(eq(runsTable.userId, member.userId))
    .orderBy(desc(runsTable.date));

  res.json(runs);
});

router.get("/admin/runs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const runs = await db
    .select({
      id: runsTable.id,
      userId: runsTable.userId,
      distanceMiles: runsTable.distanceMiles,
      date: runsTable.date,
      notes: runsTable.notes,
      createdAt: runsTable.createdAt,
      source: runsTable.source,
      stravaActivityId: runsTable.stravaActivityId,
      memberDisplayName: membersTable.displayName,
      memberEmail: membersTable.email,
    })
    .from(runsTable)
    .leftJoin(membersTable, eq(runsTable.userId, membersTable.userId))
    .orderBy(desc(runsTable.date));

  res.json(runs);
});

router.post("/runs", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { distanceMiles, date, notes, forUserId } = req.body;

  if (!distanceMiles || typeof distanceMiles !== "number" || distanceMiles <= 0) {
    res.status(400).json({ error: "distanceMiles must be a positive number" });
    return;
  }

  if (!date || typeof date !== "string") {
    res.status(400).json({ error: "date is required" });
    return;
  }

  // Determine target member (self or a dependent)
  let targetMember = member;
  if (forUserId && forUserId !== member.userId) {
    const dependent = await db.query.membersTable.findFirst({
      where: eq(membersTable.userId, forUserId),
    });
    if (!dependent) {
      res.status(404).json({ error: "Dependent member not found" });
      return;
    }
    // Only allow logging for your own dependents (or admin can log for anyone)
    if (!member.isAdmin && dependent.parentMemberId !== member.id) {
      res.status(403).json({ error: "You can only log runs for your own dependents" });
      return;
    }
    targetMember = dependent;
  }

  const [run] = await db
    .insert(runsTable)
    .values({
      userId: targetMember.userId,
      distanceMiles,
      date,
      notes: notes ?? null,
    })
    .returning();

  await db
    .update(membersTable)
    .set({ totalMiles: targetMember.totalMiles + distanceMiles })
    .where(eq(membersTable.userId, targetMember.userId));

  res.status(201).json(run);
});

router.patch("/runs/:runId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const runId = parseInt(req.params.runId, 10);
  if (isNaN(runId)) {
    res.status(400).json({ error: "Invalid run ID" });
    return;
  }

  const run = await db.query.runsTable.findFirst({
    where: eq(runsTable.id, runId),
  });

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  if (!member.isAdmin && run.userId !== member.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { distanceMiles, date, notes } = req.body;

  if (distanceMiles !== undefined && (typeof distanceMiles !== "number" || distanceMiles <= 0)) {
    res.status(400).json({ error: "distanceMiles must be a positive number" });
    return;
  }

  const oldDistance = run.distanceMiles;
  const newDistance = distanceMiles ?? oldDistance;

  const [updated] = await db
    .update(runsTable)
    .set({
      distanceMiles: newDistance,
      date: date ?? run.date,
      notes: notes !== undefined ? (notes || null) : run.notes,
    })
    .where(eq(runsTable.id, runId))
    .returning();

  if (distanceMiles !== undefined && distanceMiles !== oldDistance) {
    const owner = await db.query.membersTable.findFirst({
      where: eq(membersTable.userId, run.userId),
    });
    if (owner) {
      const newTotal = Math.max(0, owner.totalMiles - oldDistance + newDistance);
      await db
        .update(membersTable)
        .set({ totalMiles: newTotal })
        .where(eq(membersTable.userId, run.userId));
    }
  }

  res.json(updated);
});

router.delete("/runs/:runId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const runId = parseInt(req.params.runId, 10);
  if (isNaN(runId)) {
    res.status(400).json({ error: "Invalid run ID" });
    return;
  }

  const run = await db.query.runsTable.findFirst({
    where: eq(runsTable.id, runId),
  });

  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  if (!member.isAdmin && run.userId !== member.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(runsTable).where(eq(runsTable.id, runId));

  const owner = await db.query.membersTable.findFirst({
    where: eq(membersTable.userId, run.userId),
  });

  if (owner) {
    const newTotal = Math.max(0, owner.totalMiles - run.distanceMiles);
    await db
      .update(membersTable)
      .set({ totalMiles: newTotal })
      .where(eq(membersTable.userId, run.userId));
  }

  res.json({ success: true });
});

// POST /api/admin/bonus-run — add bonus miles for any member
router.post("/admin/bonus-run", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { targetUserId, distanceMiles, date, notes } = req.body as {
    targetUserId: string;
    distanceMiles: number;
    date?: string;
    notes?: string;
  };

  if (!targetUserId) {
    res.status(400).json({ error: "targetUserId is required" });
    return;
  }
  if (!distanceMiles || typeof distanceMiles !== "number" || distanceMiles <= 0) {
    res.status(400).json({ error: "distanceMiles must be a positive number" });
    return;
  }

  const target = await db.query.membersTable.findFirst({
    where: eq(membersTable.userId, targetUserId),
  });
  if (!target) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const runDate = date || new Date().toISOString().split("T")[0];

  const [run] = await db
    .insert(runsTable)
    .values({
      userId: target.userId,
      distanceMiles,
      date: runDate,
      notes: notes || "Bonus miles (admin)",
    })
    .returning();

  await db
    .update(membersTable)
    .set({ totalMiles: target.totalMiles + distanceMiles })
    .where(eq(membersTable.userId, target.userId));

  res.status(201).json(run);
});

export default router;
