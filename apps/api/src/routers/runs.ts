import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../lib/trpc.js";
import { db, runsTable, membersTable, checkInsTable } from "@runclub/db";
import { eq, and, or, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Returns the caller's own member record
async function getMyMember(userId: string, organizationId: string) {
  const [m] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.userId, userId), eq(membersTable.organizationId, organizationId)))
    .limit(1);
  return m ?? null;
}

// Returns a dependent member only if it belongs to the caller
async function getDependent(memberId: number, parentMemberId: number, organizationId: string) {
  const [m] = await db
    .select()
    .from(membersTable)
    .where(
      and(
        eq(membersTable.id, memberId),
        eq(membersTable.parentMemberId, parentMemberId),
        eq(membersTable.organizationId, organizationId)
      )
    )
    .limit(1);
  return m ?? null;
}

async function updateMemberMiles(memberId: number, delta: number) {
  const [m] = await db.select({ totalMiles: membersTable.totalMiles }).from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
  if (m) {
    await db.update(membersTable).set({ totalMiles: Math.max(0, m.totalMiles + delta) }).where(eq(membersTable.id, memberId));
  }
}

export const runsRouter = router({
  // List runs for current user + all their dependents
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const me = await getMyMember(ctx.userId, ctx.organizationId);
      if (!me) return [];

      // Get dependent member IDs
      const dependents = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(and(eq(membersTable.parentMemberId, me.id), eq(membersTable.organizationId, ctx.organizationId)));

      const dependentIds = dependents.map((d) => d.id);

      // Fetch runs: mine (by userId) + dependents (by memberId)
      const allRuns = await db
        .select({
          id: runsTable.id,
          userId: runsTable.userId,
          memberId: runsTable.memberId,
          organizationId: runsTable.organizationId,
          distanceMiles: runsTable.distanceMiles,
          date: runsTable.date,
          notes: runsTable.notes,
          source: runsTable.source,
          createdAt: runsTable.createdAt,
          memberName: membersTable.displayName,
        })
        .from(runsTable)
        .leftJoin(membersTable, eq(runsTable.memberId, membersTable.id))
        .where(
          and(
            eq(runsTable.organizationId, ctx.organizationId),
            or(
              eq(runsTable.userId, ctx.userId),
              ...(dependentIds.length > 0 ? dependentIds.map((id) => eq(runsTable.memberId, id)) : [isNull(runsTable.memberId)])
            )
          )
        )
        .orderBy(desc(runsTable.date))
        .limit(input.limit);

      return allRuns.map((r) => ({
        ...r,
        memberName: r.memberName ?? null,
        isDependent: r.memberId !== null && dependentIds.includes(r.memberId),
      }));
    }),

  create: protectedProcedure
    .input(z.object({
      distanceMiles: z.number().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
      clubEventId: z.number().optional(),
      forMemberId: z.number().optional(), // if logging for a dependent
    }))
    .mutation(async ({ ctx, input }) => {
      const me = await getMyMember(ctx.userId, ctx.organizationId);
      if (!me) throw new TRPCError({ code: "NOT_FOUND", message: "Member profile not found" });

      let targetMember = me;

      if (input.forMemberId && input.forMemberId !== me.id) {
        const dep = await getDependent(input.forMemberId, me.id, ctx.organizationId);
        if (!dep) throw new TRPCError({ code: "FORBIDDEN", message: "Not your dependent" });
        targetMember = dep;
      }

      // Miles only count when you were at run club: require a check-in
      // (by the logged-in member — covers their dependents too) for that date.
      const [checkIn] = await db
        .select({ id: checkInsTable.id })
        .from(checkInsTable)
        .where(and(eq(checkInsTable.memberId, me.id), eq(checkInsTable.date, input.date)))
        .limit(1);
      if (!checkIn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only log miles for days you checked in at run club. Scan the check-in QR when you arrive!",
        });
      }

      const [run] = await db
        .insert(runsTable)
        .values({
          userId: ctx.userId,
          memberId: targetMember.id,
          organizationId: ctx.organizationId,
          distanceMiles: input.distanceMiles,
          date: input.date,
          notes: input.notes ?? null,
          source: "manual",
          clubEventId: input.clubEventId ?? null,
        })
        .returning();

      await updateMemberMiles(targetMember.id, input.distanceMiles);
      return run;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const me = await getMyMember(ctx.userId, ctx.organizationId);
      if (!me) throw new TRPCError({ code: "NOT_FOUND" });

      const [run] = await db
        .select()
        .from(runsTable)
        .where(and(eq(runsTable.id, input.id), eq(runsTable.organizationId, ctx.organizationId)))
        .limit(1);

      if (!run) throw new TRPCError({ code: "NOT_FOUND" });

      // Allow delete if it's your own run or a dependent's run
      const isOwn = run.userId === ctx.userId;
      const isDependentRun = run.memberId !== null && run.memberId !== me.id;
      if (isDependentRun) {
        const dep = await getDependent(run.memberId!, me.id, ctx.organizationId);
        if (!dep) throw new TRPCError({ code: "FORBIDDEN" });
      } else if (!isOwn) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.delete(runsTable).where(eq(runsTable.id, input.id));

      const targetMemberId = run.memberId ?? me.id;
      await updateMemberMiles(targetMemberId, -run.distanceMiles);

      return { success: true };
    }),

  listAll: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(runsTable)
        .where(eq(runsTable.organizationId, ctx.organizationId))
        .orderBy(desc(runsTable.date))
        .limit(input.limit);
    }),

  // Admin: log a run on behalf of any member (e.g. login trouble, no account)
  adminCreate: adminProcedure
    .input(z.object({
      memberId: z.number(),
      distanceMiles: z.number().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [member] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, input.memberId), eq(membersTable.organizationId, ctx.organizationId)))
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });

      const [run] = await db
        .insert(runsTable)
        .values({
          // runs.user_id is NOT NULL; for members without accounts the admin is the owner
          userId: member.userId ?? ctx.userId,
          memberId: member.id,
          organizationId: ctx.organizationId,
          distanceMiles: input.distanceMiles,
          date: input.date,
          notes: input.notes ?? null,
          source: "manual",
        })
        .returning();

      await updateMemberMiles(member.id, input.distanceMiles);
      return run;
    }),

  // Admin: delete any run in the organization
  adminDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [run] = await db
        .select()
        .from(runsTable)
        .where(and(eq(runsTable.id, input.id), eq(runsTable.organizationId, ctx.organizationId)))
        .limit(1);
      if (!run) throw new TRPCError({ code: "NOT_FOUND" });

      await db.delete(runsTable).where(eq(runsTable.id, input.id));

      let targetMemberId = run.memberId;
      if (targetMemberId === null) {
        const [owner] = await db
          .select({ id: membersTable.id })
          .from(membersTable)
          .where(and(eq(membersTable.userId, run.userId), eq(membersTable.organizationId, ctx.organizationId)))
          .limit(1);
        targetMemberId = owner?.id ?? null;
      }
      if (targetMemberId !== null) {
        await updateMemberMiles(targetMemberId, -run.distanceMiles);
      }
      return { success: true };
    }),
});
