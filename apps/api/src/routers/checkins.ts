import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../lib/trpc.js";
import { db, membersTable, checkInsTable, organizationsTable } from "@runclub/db";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Check-in window settings, stored in organizations.settings.checkin
type CheckinSettings = {
  days: number[]; // 0=Sun … 6=Sat
  startHour: number; // 0-23, club's local time
  endHour: number;
  timezone: string;
};

const DEFAULT_SETTINGS: CheckinSettings = {
  days: [5], // Friday
  startHour: 6,
  endHour: 9,
  timezone: "America/New_York",
};

function checkinSettings(org: { settings: unknown } | undefined): CheckinSettings {
  const saved = (org?.settings as { checkin?: Partial<CheckinSettings> } | null)?.checkin ?? {};
  return { ...DEFAULT_SETTINGS, ...saved };
}

// Current date / weekday / hour in the club's timezone
function clubNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: weekdays[get("weekday")] ?? 0,
    hour: parseInt(get("hour"), 10) + parseInt(get("minute"), 10) / 60,
  };
}

function windowOpen(s: CheckinSettings) {
  const now = clubNow(s.timezone);
  return { ...now, open: s.days.includes(now.weekday) && now.hour >= s.startHour && now.hour < s.endHour };
}

async function getOrg(organizationId: string) {
  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, organizationId))
    .limit(1);
  return org;
}

async function getMyMember(userId: string, organizationId: string) {
  const [m] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.userId, userId), eq(membersTable.organizationId, organizationId)))
    .limit(1);
  return m ?? null;
}

export const checkinsRouter = router({
  // Window status + whether the caller has checked in today
  status: protectedProcedure.query(async ({ ctx }) => {
    const org = await getOrg(ctx.organizationId);
    const settings = checkinSettings(org);
    const win = windowOpen(settings);
    const me = await getMyMember(ctx.userId, ctx.organizationId);
    let checkedInToday = false;
    if (me) {
      const [row] = await db
        .select({ id: checkInsTable.id })
        .from(checkInsTable)
        .where(and(eq(checkInsTable.memberId, me.id), eq(checkInsTable.date, win.date)))
        .limit(1);
      checkedInToday = !!row;
    }
    return { open: win.open, date: win.date, checkedInToday, settings };
  }),

  // Member scans the poster QR → lands here
  checkIn: protectedProcedure.mutation(async ({ ctx }) => {
    const org = await getOrg(ctx.organizationId);
    const settings = checkinSettings(org);
    const win = windowOpen(settings);
    if (!win.open) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Check-in is only open during run club hours. See you there!",
      });
    }
    const me = await getMyMember(ctx.userId, ctx.organizationId);
    if (!me) throw new TRPCError({ code: "NOT_FOUND", message: "Member profile not found" });

    await db
      .insert(checkInsTable)
      .values({ memberId: me.id, organizationId: ctx.organizationId, date: win.date })
      .onConflictDoNothing();
    return { date: win.date };
  }),

  // Admin: manually check a member in (phone trouble, no account, etc.)
  adminCheckIn: adminProcedure
    .input(z.object({ memberId: z.number(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [member] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, input.memberId), eq(membersTable.organizationId, ctx.organizationId)))
        .limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });

      const org = await getOrg(ctx.organizationId);
      const date = input.date ?? clubNow(checkinSettings(org).timezone).date;
      await db
        .insert(checkInsTable)
        .values({ memberId: member.id, organizationId: ctx.organizationId, date })
        .onConflictDoNothing();
      return { date };
    }),

  // Admin: who's checked in today
  todayList: adminProcedure.query(async ({ ctx }) => {
    const org = await getOrg(ctx.organizationId);
    const today = clubNow(checkinSettings(org).timezone).date;
    return db
      .select({
        id: checkInsTable.id,
        memberId: membersTable.id,
        displayName: membersTable.displayName,
        createdAt: checkInsTable.createdAt,
      })
      .from(checkInsTable)
      .innerJoin(membersTable, eq(membersTable.id, checkInsTable.memberId))
      .where(and(eq(checkInsTable.organizationId, ctx.organizationId), eq(checkInsTable.date, today)))
      .orderBy(desc(checkInsTable.createdAt));
  }),

  // Admin: update the check-in window
  updateSettings: adminProcedure
    .input(
      z.object({
        days: z.array(z.number().min(0).max(6)).min(1),
        startHour: z.number().min(0).max(23),
        endHour: z.number().min(1).max(24),
        timezone: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const org = await getOrg(ctx.organizationId);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      const settings = { ...((org.settings as object) ?? {}), checkin: input };
      await db
        .update(organizationsTable)
        .set({ settings, updatedAt: new Date() })
        .where(eq(organizationsTable.id, ctx.organizationId));
      return { ok: true };
    }),
});
