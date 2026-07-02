import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import { auth } from "./auth.js";
import { db } from "@runclub/db";
import { membersTable } from "@runclub/db/schema";
import { and, eq } from "drizzle-orm";

export type Context = {
  req: Request;
  res: Response;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  organizationId: string | null;
};

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  const session = await auth.api.getSession({ headers: req.headers as unknown as Headers });
  const organizationId = (req.headers["x-organization-id"] as string) ?? null;

  return {
    req,
    res,
    userId: session?.user.id ?? null,
    userEmail: session?.user.email ?? null,
    userName: session?.user.name ?? null,
    organizationId,
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires login but no org context (for org create/list before an org is selected)
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || !ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
      organizationId: ctx.organizationId,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const [member] = await db
    .select()
    .from(membersTable)
    .where(
      and(
        eq(membersTable.userId, ctx.userId!),
        eq(membersTable.organizationId, ctx.organizationId!)
      )
    )
    .limit(1);

  if (!member?.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({ ctx: { ...ctx, member } });
});
