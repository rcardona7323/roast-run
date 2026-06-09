import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../lib/trpc.js";
import { db, clubEventsTable } from "@runclub/db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const eventsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(clubEventsTable)
      .where(eq(clubEventsTable.organizationId, ctx.organizationId));
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [event] = await db
        .insert(clubEventsTable)
        .values({ ...input, organizationId: ctx.organizationId, description: input.description ?? null })
        .returning();
      return event;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(clubEventsTable)
        .set(data)
        .where(
          and(
            eq(clubEventsTable.id, id),
            eq(clubEventsTable.organizationId, ctx.organizationId)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(clubEventsTable)
        .where(
          and(
            eq(clubEventsTable.id, input.id),
            eq(clubEventsTable.organizationId, ctx.organizationId)
          )
        );
      return { success: true };
    }),
});
