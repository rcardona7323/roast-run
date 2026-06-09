import { Router } from "express";
import { db } from "@workspace/db";
import { rewardTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateMember } from "./members";

const router = Router();

router.get("/reward-tiers", async (req, res) => {
  const tiers = await db
    .select()
    .from(rewardTiersTable)
    .orderBy(rewardTiersTable.milesRequired);
  res.json(tiers);
});

router.post("/reward-tiers", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, description, milesRequired, rewardType, active } = req.body;

  if (!name || !description || !milesRequired || !rewardType) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [tier] = await db
    .insert(rewardTiersTable)
    .values({
      name,
      description,
      milesRequired,
      rewardType,
      active: active !== false,
    })
    .returning();

  res.status(201).json(tier);
});

router.patch("/reward-tiers/:tierId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const tierId = parseInt(req.params.tierId, 10);
  if (isNaN(tierId)) {
    res.status(400).json({ error: "Invalid tier ID" });
    return;
  }

  const { name, description, milesRequired, rewardType, active } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (milesRequired !== undefined) updates.milesRequired = milesRequired;
  if (rewardType !== undefined) updates.rewardType = rewardType;
  if (active !== undefined) updates.active = active;

  const [tier] = await db
    .update(rewardTiersTable)
    .set(updates)
    .where(eq(rewardTiersTable.id, tierId))
    .returning();

  if (!tier) {
    res.status(404).json({ error: "Tier not found" });
    return;
  }

  res.json(tier);
});

router.delete("/reward-tiers/:tierId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const tierId = parseInt(req.params.tierId, 10);
  if (isNaN(tierId)) {
    res.status(400).json({ error: "Invalid tier ID" });
    return;
  }

  await db.delete(rewardTiersTable).where(eq(rewardTiersTable.id, tierId));
  res.json({ success: true });
});

export default router;
