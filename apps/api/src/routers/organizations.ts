import { z } from "zod";
import { router, protectedProcedure, adminProcedure, authedProcedure } from "../lib/trpc.js";
import { db, organizationsTable, membersTable } from "@runclub/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const organizationsRouter = router({
  // List orgs the current user belongs to (no orgId needed)
  mine: authedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({ org: organizationsTable })
      .from(membersTable)
      .innerJoin(organizationsTable, eq(membersTable.organizationId, organizationsTable.id))
      .where(eq(membersTable.userId, ctx.userId));
    return rows.map((r) => r.org);
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, ctx.organizationId))
      .limit(1);
    if (!org) throw new TRPCError({ code: "NOT_FOUND" });
    return org;
  }),

  create: authedProcedure
    .input(z.object({ name: z.string().min(1), slug: z.string().min(2).regex(/^[a-z0-9-]+$/), displayName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const id = nanoid();
      const [org] = await db
        .insert(organizationsTable)
        .values({ id, name: input.name, slug: input.slug, ownerId: ctx.userId })
        .returning();

      // Auto-enroll creator as admin member
      await db.insert(membersTable).values({
        userId: ctx.userId,
        organizationId: id,
        displayName: input.displayName,
        isAdmin: true,
      });

      return org;
    }),

  // Public-ish: look up a café by slug (anyone signed in can call this)
  bySlug: authedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const [org] = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.slug, input.slug))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "No café found with that link." });
      return org;
    }),

  // Join an existing org as a new member
  join: authedProcedure
    .input(z.object({ organizationId: z.string(), displayName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Make sure org exists
      const [org] = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, input.organizationId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      // Idempotent — if already a member, just return the org
      const [existing] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.userId, ctx.userId), eq(membersTable.organizationId, input.organizationId)))
        .limit(1);
      if (existing) return org;

      // Claim an existing account-less member record with a matching email
      // (admin-entered members keep their mileage history when they sign up)
      if (ctx.userEmail) {
        const [claimable] = await db
          .select()
          .from(membersTable)
          .where(
            and(
              eq(membersTable.organizationId, input.organizationId),
              isNull(membersTable.userId),
              isNull(membersTable.parentMemberId),
              sql`lower(${membersTable.email}) = ${ctx.userEmail.toLowerCase()}`
            )
          )
          .limit(1);
        if (claimable) {
          await db
            .update(membersTable)
            .set({ userId: ctx.userId })
            .where(eq(membersTable.id, claimable.id));
          return org;
        }
      }

      await db.insert(membersTable).values({
        userId: ctx.userId,
        organizationId: input.organizationId,
        displayName: input.displayName,
        isAdmin: false,
      });

      return org;
    }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        settings: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(organizationsTable)
        .set({ ...input, updatedAt: new Date() })
        .where(
          and(
            eq(organizationsTable.id, ctx.organizationId),
            eq(organizationsTable.ownerId, ctx.userId)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "FORBIDDEN" });
      return updated;
    }),
});
