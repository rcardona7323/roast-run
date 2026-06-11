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
  baseURL: process.env.API_URL ?? "http://localhost:8080",
  trustedOrigins: [
    process.env.APP_URL ?? "http://localhost:5173",
    "https://roast-run-web.vercel.app",
  ],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirectURI: `${process.env.APP_URL ?? "http://localhost:5173"}/api/auth/callback/google`,
    },
  },
});

export type Auth = typeof auth;
