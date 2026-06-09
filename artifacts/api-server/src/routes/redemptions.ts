import { Router } from "express";
import { db } from "@workspace/db";
import { redemptionsTable, rewardTiersTable, membersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { getOrCreateMember } from "./members";
import { sendEmail, buildApprovalEmail } from "../lib/email";
import { sendWeeklyDigest } from "../lib/scheduler";
import { logger } from "../lib/logger";

const router = Router();

router.get("/redemptions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const redemptions = await db
    .select({
      id: redemptionsTable.id,
      userId: redemptionsTable.userId,
      rewardTierId: redemptionsTable.rewardTierId,
      rewardTierName: rewardTiersTable.name,
      status: redemptionsTable.status,
      adminNotes: redemptionsTable.adminNotes,
      createdAt: redemptionsTable.createdAt,
      updatedAt: redemptionsTable.updatedAt,
    })
    .from(redemptionsTable)
    .leftJoin(rewardTiersTable, eq(redemptionsTable.rewardTierId, rewardTiersTable.id))
    .where(eq(redemptionsTable.userId, member.userId))
    .orderBy(redemptionsTable.createdAt);

  res.json(redemptions.reverse());
});

router.post("/redemptions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { rewardTierId, forUserId } = req.body;
  if (!rewardTierId || typeof rewardTierId !== "number") {
    res.status(400).json({ error: "rewardTierId is required" });
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
    if (!member.isAdmin && dependent.parentMemberId !== member.id) {
      res.status(403).json({ error: "You can only request redemptions for your own dependents" });
      return;
    }
    targetMember = dependent;
  }

  const tier = await db.query.rewardTiersTable.findFirst({
    where: eq(rewardTiersTable.id, rewardTierId),
  });

  if (!tier || !tier.active) {
    res.status(404).json({ error: "Reward tier not found or inactive" });
    return;
  }

  if (targetMember.totalMiles < tier.milesRequired) {
    res.status(400).json({ error: "Not enough miles to redeem this reward" });
    return;
  }

  const [redemption] = await db
    .insert(redemptionsTable)
    .values({
      userId: targetMember.userId,
      rewardTierId,
    })
    .returning();

  res.status(201).json({
    ...redemption,
    rewardTierName: tier.name,
  });
});

// GET /members/me/dependents/:dependentId/redemptions
router.get("/members/me/dependents/:dependentId/redemptions", async (req, res) => {
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

  if (!member.isAdmin && dependent.parentMemberId !== member.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const redemptions = await db
    .select({
      id: redemptionsTable.id,
      userId: redemptionsTable.userId,
      rewardTierId: redemptionsTable.rewardTierId,
      rewardTierName: rewardTiersTable.name,
      status: redemptionsTable.status,
      adminNotes: redemptionsTable.adminNotes,
      createdAt: redemptionsTable.createdAt,
      updatedAt: redemptionsTable.updatedAt,
    })
    .from(redemptionsTable)
    .leftJoin(rewardTiersTable, eq(redemptionsTable.rewardTierId, rewardTiersTable.id))
    .where(eq(redemptionsTable.userId, dependent.userId))
    .orderBy(redemptionsTable.createdAt);

  res.json(redemptions.reverse());
});

router.get("/redemptions/all", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const redemptions = await db
    .select({
      id: redemptionsTable.id,
      userId: redemptionsTable.userId,
      rewardTierId: redemptionsTable.rewardTierId,
      rewardTierName: rewardTiersTable.name,
      memberDisplayName: membersTable.displayName,
      memberEmail: membersTable.email,
      status: redemptionsTable.status,
      adminNotes: redemptionsTable.adminNotes,
      createdAt: redemptionsTable.createdAt,
      updatedAt: redemptionsTable.updatedAt,
    })
    .from(redemptionsTable)
    .leftJoin(rewardTiersTable, eq(redemptionsTable.rewardTierId, rewardTiersTable.id))
    .leftJoin(membersTable, eq(redemptionsTable.userId, membersTable.userId))
    .orderBy(redemptionsTable.createdAt);

  res.json(redemptions.reverse());
});

router.patch("/redemptions/:redemptionId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const redemptionId = parseInt(req.params.redemptionId, 10);
  if (isNaN(redemptionId)) {
    res.status(400).json({ error: "Invalid redemption ID" });
    return;
  }

  const { status, adminNotes } = req.body;
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "status must be approved or rejected" });
    return;
  }

  const [updated] = await db
    .update(redemptionsTable)
    .set({ status, adminNotes: adminNotes ?? null, updatedAt: new Date() })
    .where(eq(redemptionsTable.id, redemptionId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Redemption not found" });
    return;
  }

  res.json(updated);

  // Fire-and-forget email notification when a redemption is approved
  if (status === "approved") {
    try {
      const [redemptionRow] = await db
        .select({
          userId: redemptionsTable.userId,
          rewardTierName: rewardTiersTable.name,
          memberEmail: membersTable.email,
          memberName: membersTable.displayName,
          totalMiles: membersTable.totalMiles,
        })
        .from(redemptionsTable)
        .leftJoin(rewardTiersTable, eq(redemptionsTable.rewardTierId, rewardTiersTable.id))
        .leftJoin(membersTable, eq(redemptionsTable.userId, membersTable.userId))
        .where(eq(redemptionsTable.id, redemptionId));

      if (redemptionRow?.memberEmail && redemptionRow.memberName) {
        const allTiers = await db
          .select()
          .from(rewardTiersTable)
          .where(eq(rewardTiersTable.active, true))
          .orderBy(asc(rewardTiersTable.milesRequired));

        const totalMiles = redemptionRow.totalMiles ?? 0;
        const nextTier = allTiers.find(t => totalMiles < t.milesRequired) ?? null;
        const milesUntilNext = nextTier ? nextTier.milesRequired - totalMiles : null;

        await sendEmail({
          to: redemptionRow.memberEmail,
          subject: `Your reward has been approved — ${redemptionRow.rewardTierName ?? "reward"}`,
          html: buildApprovalEmail({
            memberName: redemptionRow.memberName,
            rewardName: redemptionRow.rewardTierName ?? "your reward",
            totalMiles,
            nextTierName: nextTier?.name ?? null,
            milesUntilNext,
          }),
        });
      }
    } catch (err) {
      req.log.error({ err }, "Failed to send approval email");
    }
  }
});

// POST /api/admin/send-weekly-digest — trigger the weekly digest immediately (for testing)
router.post("/admin/send-weekly-digest", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const result = await sendWeeklyDigest();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: "Digest send failed", detail: err?.message });
  }
});

// POST /api/admin/test-email — send a test email and return the raw Resend response
router.post("/admin/test-email", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Not authenticated" }); return; }
  const me = await getOrCreateMember(req);
  if (!me?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  const to = req.body?.to ?? me.email;
  if (!to) { res.status(400).json({ error: "No email address — provide { to: 'email' } in body or ensure your member has an email" }); return; }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "RESEND_API_KEY is not set on the server" }); return; }

  const from = process.env.EMAIL_FROM ?? "Roast & Run <onboarding@resend.dev>";

  logger.info({ to, from }, "Sending test email");

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: "Test email from Roast & Run ☕",
        html: "<p>This is a test email from your Roast & Run app. If you can read this, email delivery is working!</p>",
      }),
    });

    const resendBody = await resendRes.json();
    res.status(resendRes.ok ? 200 : 502).json({
      ok: resendRes.ok,
      status: resendRes.status,
      resend: resendBody,
      sentFrom: from,
      sentTo: to,
    });
  } catch (err: any) {
    res.status(500).json({ error: "fetch to Resend failed", detail: err?.message });
  }
});

export default router;
