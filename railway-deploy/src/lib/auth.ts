import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, usersTable, sessionsTable, accountsTable, verificationsTable } from "../db/index.js";
import { resend, FROM_ADDRESS } from "./resend.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: usersTable,
      session: sessionsTable,
      account: accountsTable,
      verification: verificationsTable,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.APP_URL ?? "http://localhost:5173",
  trustedOrigins: [
    process.env.APP_URL ?? "http://localhost:5173",
    "https://roast-run-web.vercel.app",
    process.env.API_URL ?? "http://localhost:8080",
    "https://workspacerun-club-production.up.railway.app",
  ],
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: user.email,
        subject: "Reset your Coastal Crew Run Club password",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#C8611A;">Coastal Crew Run Club</h2>
            <p>Hi ${user.name || "there"},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one:</p>
            <p style="margin:28px 0;">
              <a href="${url}" style="background:#C8611A;color:#fff;padding:13px 28px;border-radius:999px;text-decoration:none;font-weight:700;">Reset Password</a>
            </p>
            <p style="color:#8C8378;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});

export type Auth = typeof auth;
