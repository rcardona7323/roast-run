import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, usersTable, sessionsTable, accountsTable, verificationsTable } from "../db/index.js";

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
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});

export type Auth = typeof auth;
