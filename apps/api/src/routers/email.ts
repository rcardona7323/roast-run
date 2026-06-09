import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../lib/trpc.js";
import { db, membersTable, organizationsTable } from "@runclub/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { resend, FROM_ADDRESS } from "../lib/resend.js";
import { weeklyUpdateHtml } from "../lib/email-templates.js";

export const emailRouter = router({
  /**
   * Send a weekly update email to all members with a valid email address.
   * Returns per-recipient success/failure so the admin can see a summary.
   */
  sendWeeklyUpdate: adminProcedure
    .input(
      z.object({
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!process.env.RESEND_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "RESEND_API_KEY is not configured on the server.",
        });
      }

      // Load org name
      const [org] = await db
        .select({ name: organizationsTable.name })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, ctx.organizationId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      // Load all members with an email
      const members = await db
        .select({
          id: membersTable.id,
          displayName: membersTable.displayName,
          email: membersTable.email,
          totalMiles: membersTable.totalMiles,
        })
        .from(membersTable)
        .where(
          and(
            eq(membersTable.organizationId, ctx.organizationId),
            isNotNull(membersTable.userId), // humans only, no dependents
            isNotNull(membersTable.email)
          )
        );

      if (members.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No members with email addresses found.",
        });
      }

      const appUrl = process.env.APP_URL ?? "https://app.solbowls.com";

      const results: { email: string; name: string; ok: boolean; error?: string }[] = [];

      // Send individually so each gets their personalised miles
      for (const member of members) {
        if (!member.email) continue;
        try {
          await resend.emails.send({
            from: FROM_ADDRESS,
            to: member.email,
            subject: input.subject,
            html: weeklyUpdateHtml({
              orgName: org.name,
              subject: input.subject,
              body: input.body,
              memberName: (member.displayName ?? "Runner").split(" ")[0],
              totalMiles: member.totalMiles ?? 0,
              appUrl,
            }),
          });
          results.push({ email: member.email, name: member.displayName ?? "", ok: true });
        } catch (err) {
          results.push({
            email: member.email,
            name: member.displayName ?? "",
            ok: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      const sent = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok).length;

      return { sent, failed, results };
    }),

  /** Send a test email only to the logged-in admin */
  sendTestEmail: adminProcedure
    .input(
      z.object({
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_placeholder_key_not_configured") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "RESEND_API_KEY is not configured on the server.",
        });
      }

      const [org] = await db
        .select({ name: organizationsTable.name })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, ctx.organizationId))
        .limit(1);

      // Get the admin's own member record for their email + name
      const [me] = await db
        .select({ displayName: membersTable.displayName, email: membersTable.email, totalMiles: membersTable.totalMiles })
        .from(membersTable)
        .where(and(eq(membersTable.userId, ctx.userId), eq(membersTable.organizationId, ctx.organizationId)))
        .limit(1);

      if (!me?.email) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Your member profile has no email address on file.",
        });
      }

      const appUrl = process.env.APP_URL ?? "https://app.solbowls.com";

      await resend.emails.send({
        from: FROM_ADDRESS,
        to: me.email,
        subject: `[TEST] ${input.subject}`,
        html: weeklyUpdateHtml({
          orgName: org?.name ?? "Coastal Crew Run Club",
          subject: input.subject,
          body: input.body,
          memberName: (me.displayName ?? "Admin").split(" ")[0],
          totalMiles: me.totalMiles ?? 0,
          appUrl,
        }),
      });

      return { email: me.email };
    }),

  /** Preview the rendered HTML for one member (useful in development) */
  previewWeeklyUpdate: adminProcedure
    .input(
      z.object({
        subject: z.string(),
        body: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [org] = await db
        .select({ name: organizationsTable.name })
        .from(organizationsTable)
        .where(eq(organizationsTable.id, ctx.organizationId))
        .limit(1);

      return weeklyUpdateHtml({
        orgName: org?.name ?? "Coastal Crew Run Club",
        subject: input.subject,
        body: input.body,
        memberName: "You",
        totalMiles: 42.5,
        appUrl: process.env.APP_URL ?? "https://app.solbowls.com",
      });
    }),
});
