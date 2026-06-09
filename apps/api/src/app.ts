import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/index.js";
import { createContext } from "./lib/trpc.js";
import { auth } from "./lib/auth.js";
import { handleWebhookEvent, stravaAuthUrl } from "./lib/strava.js";
import { logger } from "./lib/logger.js";
import { toNodeHandler } from "better-auth/node";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.APP_URL ?? "http://localhost:5173",
      credentials: true,
    })
  );

  app.use(pinoHttp({ logger }));
  app.use(express.json());

  // Better Auth handler — must come before tRPC
  app.all("/api/auth/*splat", toNodeHandler(auth));

  // tRPC
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req, res }) => createContext({ req, res }),
    })
  );

  // Strava OAuth
  app.get("/api/strava/connect", (req, res) => {
    const state = (req as express.Request & { session?: { userId?: string } }).session?.userId ?? "";
    res.redirect(stravaAuthUrl(state));
  });

  app.get("/api/strava/callback", async (req, res) => {
    const { code } = req.query;
    if (typeof code !== "string") {
      res.status(400).send("Missing code");
      return;
    }
    // Exchange handled in members.connectStrava — redirect to frontend
    res.redirect(`/strava/connect?code=${code}`);
  });

  // Strava webhook
  app.get("/api/strava/webhook", (req, res) => {
    const challenge = req.query["hub.challenge"];
    const token = req.query["hub.verify_token"];
    if (token !== process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
      res.status(403).send("Forbidden");
      return;
    }
    res.json({ "hub.challenge": challenge });
  });

  app.post("/api/strava/webhook", async (req, res) => {
    res.status(200).send("EVENT_RECEIVED");
    handleWebhookEvent(req.body).catch((err) =>
      logger.error({ err }, "Strava webhook processing failed")
    );
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
