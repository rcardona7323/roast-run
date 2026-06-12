import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../lib/trpc.js";
import { db, membersTable, runsTable, redemptionsTable, rewardTiersTable } from "@runclub/db";
import { eq, and, or, desc, count, sum, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const membersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
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
    return member ?? null;
  }),

  getOrCreate: protectedProcedure
    .input(z.object({ displayName: z.string().min(1), email: z.string().email().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db
        .select()
        .from(membersTable)
        .where(
          and(
            eq(membersTable.userId, ctx.userId),
            eq(membersTable.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (existing[0]) return existing[0];

      const [created] = await db
        .insert(membersTable)
        .values({
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          displayName: input.displayName,
          email: input.email ?? null,
        })
        .returning();
      return created;
    }),

  list: adminProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(membersTable)
      .where(eq(membersTable.organizationId, ctx.organizationId));
  }),

  update: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(membersTable)
        .set(input)
        .where(
          and(
            eq(membersTable.userId, ctx.userId),
            eq(membersTable.organizationId, ctx.organizationId)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  // Dependent (family member) management
  dependents: protectedProcedure.query(async ({ ctx }) => {
    const [me] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(and(eq(membersTable.userId, ctx.userId), eq(membersTable.organizationId, ctx.organizationId)))
      .limit(1);
    if (!me) return [];
    return db
      .select()
      .from(membersTable)
      .where(and(eq(membersTable.parentMemberId, me.id), eq(membersTable.organizationId, ctx.organizationId)));
  }),

  addDependent: protectedProcedure
    .input(z.object({ displayName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [me] = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(and(eq(membersTable.userId, ctx.userId), eq(membersTable.organizationId, ctx.organizationId)))
        .limit(1);
      if (!me) throw new TRPCError({ code: "NOT_FOUND", message: "Your member profile not found" });

      const [dep] = await db
        .insert(membersTable)
        .values({
          userId: null,
          organizationId: ctx.organizationId,
          displayName: input.displayName,
          parentMemberId: me.id,
          isAdmin: false,
        })
        .returning();
      return dep;
    }),

  removeDependent: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [me] = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(and(eq(membersTable.userId, ctx.userId), eq(membersTable.organizationId, ctx.organizationId)))
        .limit(1);
      if (!me) throw new TRPCError({ code: "NOT_FOUND" });

      const [dep] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, input.memberId), eq(membersTable.parentMemberId, me.id)))
        .limit(1);
      if (!dep) throw new TRPCError({ code: "FORBIDDEN" });

      await db.delete(membersTable).where(eq(membersTable.id, input.memberId));
      return { success: true };
    }),

  detail: adminProcedure
    .input(z.object({ memberId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [member] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, input.memberId), eq(membersTable.organizationId, ctx.organizationId)))
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      // Dependents
      const dependents = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.parentMemberId, member.id), eq(membersTable.organizationId, ctx.organizationId)));

      // Runs belong to this member if tagged with their memberId, or (legacy
      // migrated rows) carry their userId with no memberId.
      const runOwnership = member.userId
        ? or(
            eq(runsTable.memberId, member.id),
            and(eq(runsTable.userId, member.userId), isNull(runsTable.memberId))
          )
        : eq(runsTable.memberId, member.id);

      // Recent runs (last 10)
      const recentRuns = await db.select().from(runsTable)
        .where(and(runOwnership, eq(runsTable.organizationId, ctx.organizationId)))
        .orderBy(desc(runsTable.date))
        .limit(10);

      // Run stats
      const [stats] = await db.select({
          totalRuns: count(runsTable.id),
          totalMiles: sum(runsTable.distanceMiles),
        }).from(runsTable)
        .where(and(runOwnership, eq(runsTable.organizationId, ctx.organizationId)));

      // Redemptions with tier names
      const redemptions = member.userId
        ? await db.select({ redemption: redemptionsTable, tier: rewardTiersTable })
            .from(redemptionsTable)
            .innerJoin(rewardTiersTable, eq(redemptionsTable.rewardTierId, rewardTiersTable.id))
            .where(and(eq(redemptionsTable.userId, member.userId), eq(redemptionsTable.organizationId, ctx.organizationId)))
            .orderBy(desc(redemptionsTable.createdAt))
        : [];

      // All tiers for progress view
      const tiers = await db.select().from(rewardTiersTable)
        .where(eq(rewardTiersTable.organizationId, ctx.organizationId))
        .orderBy(rewardTiersTable.milesRequired);

      return { member, dependents, recentRuns, stats, redemptions, tiers };
    }),

  setAdmin: adminProcedure
    .input(z.object({ memberId: z.number(), isAdmin: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(membersTable)
        .set({ isAdmin: input.isAdmin })
        .where(
          and(
            eq(membersTable.id, input.memberId),
            eq(membersTable.organizationId, ctx.organizationId)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
