import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../lib/trpc.js";
import { db, rewardTiersTable, redemptionsTable, membersTable } from "@runclub/db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const rewardsRouter = router({
  tiers: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(rewardTiersTable)
      .where(
        and(
          eq(rewardTiersTable.organizationId, ctx.organizationId),
          eq(rewardTiersTable.active, true)
        )
      )
      .orderBy(rewardTiersTable.milesRequired);
  }),

  adminTiers: adminProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(rewardTiersTable)
      .where(eq(rewardTiersTable.organizationId, ctx.organizationId))
      .orderBy(rewardTiersTable.milesRequired);
  }),

  createTier: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        milesRequired: z.number().positive(),
        rewardType: z.enum(["coffee", "smoothie", "apparel", "custom"]),
        active: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [tier] = await db
        .insert(rewardTiersTable)
        .values({ ...input, organizationId: ctx.organizationId })
        .returning();
      return tier;
    }),

  updateTier: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        milesRequired: z.number().positive().optional(),
        rewardType: z.enum(["coffee", "smoothie", "apparel", "custom"]).optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(rewardTiersTable)
        .set(data)
        .where(
          and(
            eq(rewardTiersTable.id, id),
            eq(rewardTiersTable.organizationId, ctx.organizationId)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  redeem: protectedProcedure
    .input(z.object({ rewardTierId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [tier] = await db
        .select()
        .from(rewardTiersTable)
        .where(
          and(
            eq(rewardTiersTable.id, input.rewardTierId),
            eq(rewardTiersTable.organizationId, ctx.organizationId),
            eq(rewardTiersTable.active, true)
          )
        )
        .limit(1);

      if (!tier) throw new TRPCError({ code: "NOT_FOUND" });

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

      if (!member || member.totalMiles < tier.milesRequired) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Not enough miles" });
      }

      const [redemption] = await db
        .insert(redemptionsTable)
        .values({
          userId: ctx.userId,
          organizationId: ctx.organizationId,
          rewardTierId: input.rewardTierId,
        })
        .returning();

      return redemption;
    }),

  myRedemptions: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(redemptionsTable)
      .where(
        and(
          eq(redemptionsTable.userId, ctx.userId),
          eq(redemptionsTable.organizationId, ctx.organizationId)
        )
      );
  }),

  allRedemptions: adminProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(redemptionsTable)
      .where(eq(redemptionsTable.organizationId, ctx.organizationId));
  }),

  updateRedemptionStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["approved", "rejected"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(redemptionsTable)
        .set({ status: input.status, adminNotes: input.adminNotes ?? null, updatedAt: new Date() })
        .where(
          and(
            eq(redemptionsTable.id, input.id),
            eq(redemptionsTable.organizationId, ctx.organizationId)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
