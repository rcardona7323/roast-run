import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { membersTable, runsTable, clubEventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateMember } from "./members";
import { logger } from "../lib/logger";

const router = Router();

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";
const STRAVA_ACTIVITY_URL = "https://www.strava.com/api/v3/activities";
const STRAVA_PUSH_SUBSCRIPTIONS_URL = "https://www.strava.com/api/v3/push_subscriptions";

const STRAVA_STATE_COOKIE = "strava_oauth_state";
const STRAVA_STATE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * The verify token is used to authenticate Strava's hub.challenge requests.
 * It can be set via STRAVA_WEBHOOK_VERIFY_TOKEN env var, or is derived
 * deterministically from the client secret so no extra configuration is needed.
 */
function getWebhookVerifyToken(): string {
  if (process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  }
  if (STRAVA_CLIENT_SECRET) {
    return crypto.createHash("sha256").update(`strava-webhook:${STRAVA_CLIENT_SECRET}`).digest("hex").slice(0, 40);
  }
  return "roast-and-run-webhook-token";
}

function getPublicBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (domains) return `https://${domains}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (devDomain) return `https://${devDomain}`;
  return `http://localhost:${process.env.PORT ?? 8080}`;
}

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setStateCookie(res: Response, state: string): void {
  res.cookie(STRAVA_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: STRAVA_STATE_TTL,
  });
}

async function refreshStravaToken(member: typeof membersTable.$inferSelect): Promise<string | null> {
  if (!member.stravaRefreshToken || !STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) return null;

  const now = Math.floor(Date.now() / 1000);
  if (member.stravaTokenExpiresAt && member.stravaTokenExpiresAt > now + 60) {
    return member.stravaAccessToken;
  }

  try {
    const res = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: member.stravaRefreshToken,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };

    await db
      .update(membersTable)
      .set({
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiresAt: data.expires_at,
      })
      .where(eq(membersTable.userId, member.userId));

    return data.access_token;
  } catch {
    return null;
  }
}

type StravaActivity = {
  id: number;
  type: string;
  sport_type: string;
  distance: number;
  start_date_local: string;
  name: string;
};

/**
 * Fetch a single Strava activity by ID and import it for the given member.
 * Returns true if a new run was inserted, false if it already existed or was skipped.
 */
async function importStravaActivityById(
  member: typeof membersTable.$inferSelect,
  activityId: string,
  accessToken: string,
): Promise<boolean> {
  const activityRes = await fetch(`${STRAVA_ACTIVITY_URL}/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!activityRes.ok) {
    logger.warn({ activityId, status: activityRes.status }, "Strava: failed to fetch activity");
    return false;
  }

  const activity = await activityRes.json() as StravaActivity;

  if (activity.type !== "Run" && activity.sport_type !== "Run") {
    return false;
  }

  const distanceMiles = activity.distance / 1609.344;
  const activityDate = activity.start_date_local.split("T")[0];

  // Auto-tag with club event if there's one scheduled on this date
  const clubEvent = await db.query.clubEventsTable.findFirst({
    where: eq(clubEventsTable.date, activityDate),
  });

  const [inserted] = await db
    .insert(runsTable)
    .values({
      userId: member.userId,
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      date: activityDate,
      notes: activity.name || null,
      source: "strava",
      stravaActivityId: activityId,
      clubEventId: clubEvent?.id ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (!inserted) return false;

  await db
    .update(membersTable)
    .set({ totalMiles: member.totalMiles + inserted.distanceMiles })
    .where(eq(membersTable.userId, member.userId));

  return true;
}

/**
 * Register or verify the Strava webhook subscription on startup.
 * Safe to call multiple times — will not create a duplicate subscription.
 */
export async function registerStravaWebhookSubscription(): Promise<void> {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    logger.info("Strava webhook: STRAVA_CLIENT_ID/SECRET not configured, skipping registration");
    return;
  }

  const callbackUrl = `${getPublicBaseUrl()}/api/strava/webhook`;
  const verifyToken = getWebhookVerifyToken();

  logger.info({ callbackUrl }, "Strava webhook: checking subscription");

  try {
    // Check for an existing subscription
    const listRes = await fetch(
      `${STRAVA_PUSH_SUBSCRIPTIONS_URL}?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`,
    );

    if (!listRes.ok) {
      logger.warn({ status: listRes.status }, "Strava webhook: failed to list subscriptions");
      return;
    }

    const existing = await listRes.json() as Array<{ id: number; callback_url: string }>;

    if (existing.length > 0) {
      const sub = existing[0];
      if (sub.callback_url === callbackUrl) {
        logger.info({ subscriptionId: sub.id }, "Strava webhook: subscription already registered with correct URL");
        return;
      }

      // Callback URL changed (e.g. domain changed) — delete and re-register
      logger.info({ subscriptionId: sub.id, oldUrl: sub.callback_url, newUrl: callbackUrl }, "Strava webhook: callback URL changed, recreating subscription");
      await fetch(`${STRAVA_PUSH_SUBSCRIPTIONS_URL}/${sub.id}?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`, {
        method: "DELETE",
      });
    }

    // Register new subscription
    const createRes = await fetch(STRAVA_PUSH_SUBSCRIPTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        callback_url: callbackUrl,
        verify_token: verifyToken,
      }),
    });

    if (!createRes.ok) {
      const body = await createRes.text();
      logger.warn({ status: createRes.status, body }, "Strava webhook: failed to register subscription");
      return;
    }

    const created = await createRes.json() as { id: number };
    logger.info({ subscriptionId: created.id, callbackUrl }, "Strava webhook: subscription registered");
  } catch (err) {
    logger.error({ err }, "Strava webhook: error during subscription registration");
  }
}

// ---------------------------------------------------------------------------
// Strava webhook endpoints (no session auth — verified by verify_token / event signature)
// ---------------------------------------------------------------------------

/**
 * GET /strava/webhook
 * Strava sends a hub.challenge to this URL when creating a subscription.
 * We must respond with the challenge value if our verify token matches.
 */
router.get("/strava/webhook", (req, res) => {
  const mode = req.query["hub.mode"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;
  const verifyToken = req.query["hub.verify_token"] as string | undefined;

  if (mode !== "subscribe") {
    res.status(400).json({ error: "Invalid hub.mode" });
    return;
  }

  if (!challenge) {
    res.status(400).json({ error: "Missing hub.challenge" });
    return;
  }

  if (verifyToken !== getWebhookVerifyToken()) {
    req.log.warn({ verifyToken }, "Strava webhook: verify token mismatch");
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json({ "hub.challenge": challenge });
});

/**
 * POST /strava/webhook
 * Strava posts activity events here. We handle 'activity' create events
 * to automatically import new runs for connected members.
 */
router.post("/strava/webhook", async (req, res) => {
  // Always acknowledge immediately — Strava retries if we don't respond within 2s
  res.sendStatus(200);

  const event = req.body as {
    object_type?: string;
    aspect_type?: string;
    object_id?: number;
    owner_id?: number;
  };

  if (event.object_type !== "activity" || event.aspect_type !== "create") {
    return;
  }

  const athleteId = String(event.owner_id ?? "");
  const activityId = String(event.object_id ?? "");

  if (!athleteId || !activityId) {
    req.log.warn({ event }, "Strava webhook: missing owner_id or object_id");
    return;
  }

  try {
    const member = await db.query.membersTable.findFirst({
      where: eq(membersTable.stravaAthleteId, athleteId),
    });

    if (!member) {
      req.log.info({ athleteId }, "Strava webhook: no member found for athlete, ignoring");
      return;
    }

    const accessToken = await refreshStravaToken(member);
    if (!accessToken) {
      req.log.warn({ athleteId, memberId: member.id }, "Strava webhook: could not get access token for member");
      return;
    }

    const imported = await importStravaActivityById(member, activityId, accessToken);

    req.log.info({ athleteId, activityId, imported }, "Strava webhook: processed activity event");
  } catch (err) {
    req.log.error({ err, athleteId, activityId }, "Strava webhook: error processing event");
  }
});

// ---------------------------------------------------------------------------
// Authenticated Strava endpoints
// ---------------------------------------------------------------------------

router.get("/strava/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({
    connected: !!member.stravaAthleteId,
    athleteId: member.stravaAthleteId ?? null,
    athleteName: member.stravaAthleteName ?? null,
  });
});

router.get("/strava/connect", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    res.status(503).json({ error: "Strava integration not configured" });
    return;
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/api/strava/callback`;

  // Generate and store a one-time state nonce to prevent CSRF/account-linking attacks
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });

  res.redirect(`${STRAVA_AUTH_URL}?${params.toString()}`);
});

router.get("/strava/callback", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/api/login?returnTo=/profile");
    return;
  }

  const { code, error, state } = req.query as { code?: string; error?: string; state?: string };

  // Validate state to prevent CSRF/account-linking attacks
  const expectedState = req.cookies?.[STRAVA_STATE_COOKIE];
  res.clearCookie(STRAVA_STATE_COOKIE, { path: "/" });

  if (!expectedState || !state || state !== expectedState) {
    req.log.warn({ state, expectedState }, "Strava OAuth state mismatch — possible CSRF attempt");
    res.redirect("/profile?strava=error");
    return;
  }

  if (error || !code) {
    res.redirect("/profile?strava=error");
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.redirect("/profile?strava=error");
    return;
  }

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    res.redirect("/profile?strava=error");
    return;
  }

  try {
    const origin = getOrigin(req);
    const redirectUri = `${origin}/api/strava/callback`;

    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      req.log.error({ status: tokenRes.status }, "Strava token exchange failed");
      res.redirect("/profile?strava=error");
      return;
    }

    const data = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: { id: number; firstname: string; lastname: string };
    };

    const athleteName = `${data.athlete.firstname} ${data.athlete.lastname}`.trim();

    await db
      .update(membersTable)
      .set({
        stravaAthleteId: String(data.athlete.id),
        stravaAthleteName: athleteName,
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiresAt: data.expires_at,
      })
      .where(eq(membersTable.userId, member.userId));

    res.redirect("/profile?strava=connected");
  } catch (err) {
    req.log.error({ err }, "Strava callback error");
    res.redirect("/profile?strava=error");
  }
});

router.post("/strava/disconnect", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  await db
    .update(membersTable)
    .set({
      stravaAthleteId: null,
      stravaAthleteName: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiresAt: null,
    })
    .where(eq(membersTable.userId, member.userId));

  res.json({ success: true });
});

router.post("/strava/sync", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const member = await getOrCreateMember(req);
  if (!member) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!member.stravaAthleteId) {
    res.status(400).json({ error: "Strava account not connected" });
    return;
  }

  const { afterDate } = req.body as { afterDate?: string };

  const accessToken = await refreshStravaToken(member);
  if (!accessToken) {
    res.status(400).json({ error: "Failed to get Strava access token. Please reconnect your account." });
    return;
  }

  let afterTimestamp: number | undefined;
  if (afterDate) {
    const d = new Date(afterDate);
    if (!isNaN(d.getTime())) {
      afterTimestamp = Math.floor(d.getTime() / 1000);
    }
  }

  try {
    // Fetch all pages of activities (Strava paginates at 200 per page)
    const allActivities: StravaActivity[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const params = new URLSearchParams({
        per_page: String(perPage),
        page: String(page),
      });
      if (afterTimestamp) params.set("after", String(afterTimestamp));

      const activitiesRes = await fetch(`${STRAVA_ACTIVITIES_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!activitiesRes.ok) {
        res.status(502).json({ error: "Failed to fetch activities from Strava" });
        return;
      }

      const batch = await activitiesRes.json() as StravaActivity[];
      if (!Array.isArray(batch) || batch.length === 0) break;

      allActivities.push(...batch);

      // If we got fewer than perPage, there are no more pages
      if (batch.length < perPage) break;
      page++;
    }

    const runActivities = allActivities.filter(
      (a) => a.type === "Run" || a.sport_type === "Run"
    );

    let importedCount = 0;
    const freshMember = await db.query.membersTable.findFirst({
      where: eq(membersTable.userId, member.userId),
    });
    let currentTotalMiles = freshMember?.totalMiles ?? member.totalMiles;

    for (const activity of runActivities) {
      const distanceMiles = activity.distance / 1609.344;
      const activityDate = activity.start_date_local.split("T")[0];
      const stravaActivityId = String(activity.id);

      try {
        const [inserted] = await db
          .insert(runsTable)
          .values({
            userId: member.userId,
            distanceMiles: Math.round(distanceMiles * 100) / 100,
            date: activityDate,
            notes: activity.name || null,
            source: "strava",
            stravaActivityId,
          })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          currentTotalMiles += inserted.distanceMiles;
          importedCount++;
        }
      } catch {
        // Skip on any unexpected error (e.g. race condition on unique constraint)
      }
    }

    if (importedCount > 0) {
      await db
        .update(membersTable)
        .set({ totalMiles: currentTotalMiles })
        .where(eq(membersTable.userId, member.userId));
    }

    res.json({ imported: importedCount });
  } catch (err) {
    req.log.error({ err }, "Strava sync error");
    res.status(502).json({ error: "Failed to communicate with Strava" });
  }
});

export default router;
