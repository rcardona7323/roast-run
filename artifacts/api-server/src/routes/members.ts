import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable, runsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

async function getOrCreateMember(req: any) {
  const user = req.user;
  if (!user?.id) return null;

  // First try by userId
  let member = await db.query.membersTable.findFirst({
    where: eq(membersTable.userId, user.id),
  });

  if (!member && user.email) {
    // Check if an imported placeholder exists with this email — link it
    const imported = await db.query.membersTable.findFirst({
      where: eq(membersTable.email, user.email),
    });
    if (imported) {
      const [linked] = await db
        .update(membersTable)
        .set({
          userId: user.id,
          profileImageUrl: user.profileImageUrl ?? imported.profileImageUrl,
        })
        .where(eq(membersTable.id, imported.id))
        .returning();
      member = linked;
    }
  }

  if (!member) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] ||
      "Runner";

    const [created] = await db
      .insert(membersTable)
      .values({
        userId: user.id,
        displayName,
        email: user.email ?? null,
        profileImageUrl: user.profileImageUrl ?? null,
        isAdmin: false,
      })
      .returning();
    member = created;
  }

  return member;
}

router.get("/members/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(member);
});

router.patch("/members/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { displayName, email, phone, emergencyContact, emergencyPhone } = req.body;
  if (displayName !== undefined && (typeof displayName !== "string" || displayName.trim().length === 0)) {
    res.status(400).json({ error: "displayName must be a non-empty string" });
    return;
  }
  const patch: Record<string, string | null> = {};
  if (displayName !== undefined) patch.displayName = displayName.trim();
  if (email !== undefined) patch.email = email || null;
  if (phone !== undefined) patch.phone = phone || null;
  if (emergencyContact !== undefined) patch.emergencyContact = emergencyContact || null;
  if (emergencyPhone !== undefined) patch.emergencyPhone = emergencyPhone || null;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [updated] = await db
    .update(membersTable)
    .set(patch)
    .where(eq(membersTable.userId, member.userId))
    .returning();
  res.json(updated);
});

router.get("/members", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const members = await db.select().from(membersTable).orderBy(membersTable.totalMiles);
  res.json(members.reverse());
});

// GET /api/admin/members/:userId — full member detail (admin only)
router.get("/admin/members/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { userId } = req.params;

  const member = await db.query.membersTable.findFirst({
    where: eq(membersTable.userId, userId),
  });

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const runs = await db
    .select()
    .from(runsTable)
    .where(eq(runsTable.userId, userId))
    .orderBy(runsTable.date);

  const { rewardTiersTable } = await import("@workspace/db");
  const { asc } = await import("drizzle-orm");
  const allTiers = await db
    .select()
    .from(rewardTiersTable)
    .where(eq(rewardTiersTable.active, true))
    .orderBy(asc(rewardTiersTable.milesRequired));

  const earnedTiers = allTiers.filter(t => member.totalMiles >= t.milesRequired);
  const nextTier = allTiers.find(t => member.totalMiles < t.milesRequired) ?? null;
  const milesUntilNext = nextTier ? nextTier.milesRequired - member.totalMiles : null;

  res.json({ member, runs: runs.reverse(), earnedTiers, nextTier, milesUntilNext });
});

// PATCH /api/admin/members/:userId — update any member's profile (admin only)
router.patch("/admin/members/:userId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  const { userId } = req.params;
  const member = await db.query.membersTable.findFirst({ where: eq(membersTable.userId, userId) });
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const { displayName, email, phone, emergencyContact, emergencyPhone } = req.body;
  if (displayName !== undefined && (typeof displayName !== "string" || displayName.trim().length === 0)) {
    res.status(400).json({ error: "displayName must be a non-empty string" });
    return;
  }

  const patch: Record<string, string | null> = {};
  if (displayName !== undefined) patch.displayName = displayName.trim();
  if (email !== undefined) patch.email = email || null;
  if (phone !== undefined) patch.phone = phone || null;
  if (emergencyContact !== undefined) patch.emergencyContact = emergencyContact || null;
  if (emergencyPhone !== undefined) patch.emergencyPhone = emergencyPhone || null;

  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const [updated] = await db.update(membersTable).set(patch).where(eq(membersTable.userId, userId)).returning();
  res.json(updated);
});

// POST /api/admin/import — bulk import runs from CSV data
router.post("/admin/import", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { rows } = req.body as {
    rows: Array<{
      email: string;
      displayName?: string;
      date: string;
      miles: number;
      notes?: string;
      phone?: string;
      emergencyContact?: string;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "rows array is required" });
    return;
  }

  const results: Array<{ row: number; email: string; status: "imported" | "error"; message?: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      if (!row.email || typeof row.email !== "string") {
        results.push({ row: rowNum, email: row.email ?? "", status: "error", message: "Missing email" });
        continue;
      }
      if (!row.miles || isNaN(Number(row.miles)) || Number(row.miles) <= 0) {
        results.push({ row: rowNum, email: row.email, status: "error", message: "Invalid miles value" });
        continue;
      }
      if (!row.date || typeof row.date !== "string") {
        results.push({ row: rowNum, email: row.email, status: "error", message: "Missing date" });
        continue;
      }

      const email = row.email.trim().toLowerCase();
      const miles = Number(row.miles);

      // Find or create member by email
      let member = await db.query.membersTable.findFirst({
        where: eq(membersTable.email, email),
      });

      if (!member) {
        const displayName = row.displayName?.trim() || email.split("@")[0] || "Runner";
        // Create a placeholder member (linked when they first log in)
        const [created] = await db
          .insert(membersTable)
          .values({
            userId: `imported_${crypto.randomUUID()}`,
            displayName,
            email,
            phone: row.phone?.trim() || null,
            emergencyContact: row.emergencyContact?.trim() || null,
            isAdmin: false,
          })
          .returning();
        member = created;
      } else {
        // Update phone/emergency contact if provided and not already set
        const updates: Record<string, string> = {};
        if (row.phone?.trim() && !member.phone) updates.phone = row.phone.trim();
        if (row.emergencyContact?.trim() && !member.emergencyContact) updates.emergencyContact = row.emergencyContact.trim();
        if (Object.keys(updates).length > 0) {
          const [updated] = await db
            .update(membersTable)
            .set(updates)
            .where(eq(membersTable.id, member.id))
            .returning();
          member = updated;
        }
      }

      // Insert the run
      await db.insert(runsTable).values({
        userId: member.userId,
        distanceMiles: miles,
        date: row.date,
        notes: row.notes?.trim() || null,
      });

      // Update member total miles
      await db
        .update(membersTable)
        .set({ totalMiles: sql`${membersTable.totalMiles} + ${miles}` })
        .where(eq(membersTable.userId, member.userId));

      results.push({ row: rowNum, email: row.email, status: "imported" });
    } catch (err) {
      results.push({ row: rowNum, email: row.email ?? "", status: "error", message: "Unexpected error" });
    }
  }

  const imported = results.filter((r) => r.status === "imported").length;
  const errors = results.filter((r) => r.status === "error").length;
  res.json({ imported, errors, results });
});

// POST /api/admin/members/merge — merge two member accounts into one
router.post("/admin/members/merge", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { primaryUserId, secondaryUserId } = req.body as {
    primaryUserId: string;
    secondaryUserId: string;
  };

  if (!primaryUserId || !secondaryUserId) {
    res.status(400).json({ error: "primaryUserId and secondaryUserId are required" });
    return;
  }
  if (primaryUserId === secondaryUserId) {
    res.status(400).json({ error: "Cannot merge a member with themselves" });
    return;
  }

  const primary = await db.query.membersTable.findFirst({
    where: eq(membersTable.userId, primaryUserId),
  });
  const secondary = await db.query.membersTable.findFirst({
    where: eq(membersTable.userId, secondaryUserId),
  });

  if (!primary) {
    res.status(404).json({ error: "Primary member not found" });
    return;
  }
  if (!secondary) {
    res.status(404).json({ error: "Secondary member not found" });
    return;
  }

  // Reassign all of secondary's runs to primary
  await db
    .update(runsTable)
    .set({ userId: primary.userId })
    .where(eq(runsTable.userId, secondary.userId));

  // Merge miles and fill in any missing contact info
  const mergedPhone = primary.phone || secondary.phone;
  const mergedEmergencyContact = primary.emergencyContact || secondary.emergencyContact;
  const mergedEmail = primary.email || secondary.email;

  const [merged] = await db
    .update(membersTable)
    .set({
      totalMiles: primary.totalMiles + secondary.totalMiles,
      phone: mergedPhone,
      emergencyContact: mergedEmergencyContact,
      email: mergedEmail,
    })
    .where(eq(membersTable.userId, primary.userId))
    .returning();

  // Delete secondary member
  await db.delete(membersTable).where(eq(membersTable.userId, secondary.userId));

  res.json({ merged, removedMemberId: secondary.id });
});


// GET /members/me/dependents
router.get("/members/me/dependents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const dependents = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.parentMemberId, member.id));

  res.json(dependents);
});

// POST /members/me/dependents
router.post("/members/me/dependents", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { displayName } = req.body as { displayName: string };
  if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
    res.status(400).json({ error: "displayName is required" });
    return;
  }

  const dependentUserId = `dependent_${crypto.randomUUID()}`;

  const [dependent] = await db
    .insert(membersTable)
    .values({
      userId: dependentUserId,
      displayName: displayName.trim(),
      parentMemberId: member.id,
      isAdmin: false,
    })
    .returning();

  res.status(201).json(dependent);
});

// DELETE /members/me/dependents/:dependentId
router.delete("/members/me/dependents/:dependentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const dependentId = parseInt(req.params.dependentId, 10);
  if (isNaN(dependentId)) {
    res.status(400).json({ error: "Invalid dependent ID" });
    return;
  }

  const dependent = await db.query.membersTable.findFirst({
    where: eq(membersTable.id, dependentId),
  });

  if (!dependent) {
    res.status(404).json({ error: "Dependent not found" });
    return;
  }

  if (dependent.parentMemberId !== member.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Delete their runs too
  await db.delete(runsTable).where(eq(runsTable.userId, dependent.userId));
  await db.delete(membersTable).where(eq(membersTable.id, dependentId));

  res.json({ success: true });
});

export default router;
export { getOrCreateMember };
