import { db, runsTable, membersTable, clubEventsTable } from "@runclub/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger.js";

const STRAVA_BASE = "https://www.strava.com/api/v3";

export function stravaAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/strava/callback`,
    response_type: "code",
    scope: "activity:read_all",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: number;
    athlete: { id: number; firstname: string; lastname: string };
  }>;
}

export async function refreshTokenIfNeeded(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}) {
  if (Date.now() / 1000 < tokens.expiresAt - 300) return tokens;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Strava token refresh failed");
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

export async function handleWebhookEvent(event: {
  object_type: string;
  aspect_type: string;
  object_id: number;
  owner_id: number;
}) {
  if (event.object_type !== "activity" || event.aspect_type !== "create") return;

  const stravaAthleteId = String(event.owner_id);
  const stravaActivityId = String(event.object_id);

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.stravaAthleteId, stravaAthleteId))
    .limit(1);

  if (!member?.stravaTokens) {
    logger.warn({ stravaAthleteId }, "No member found for strava athlete");
    return;
  }

  const tokens = member.stravaTokens as {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };

  const refreshed = await refreshTokenIfNeeded(tokens);

  const actRes = await fetch(`${STRAVA_BASE}/activities/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${refreshed.accessToken}` },
  });
  if (!actRes.ok) return;

  const activity = (await actRes.json()) as {
    distance: number;
    start_date_local: string;
    name: string;
    type: string;
  };

  if (!["Run", "VirtualRun"].includes(activity.type)) return;

  const distanceMiles = activity.distance / 1609.34;
  const date = activity.start_date_local.slice(0, 10);

  const [event_] = await db
    .select()
    .from(clubEventsTable)
    .where(
      and(
        eq(clubEventsTable.organizationId, member.organizationId),
        eq(clubEventsTable.date, date)
      )
    )
    .limit(1);

  await db
    .insert(runsTable)
    .values({
      userId: member.userId!,
      organizationId: member.organizationId,
      distanceMiles,
      date,
      source: "strava",
      stravaActivityId,
      clubEventId: event_?.id ?? null,
    })
    .onConflictDoNothing();

  const [updated] = await db
    .select({ totalMiles: membersTable.totalMiles })
    .from(membersTable)
    .where(eq(membersTable.id, member.id));

  await db
    .update(membersTable)
    .set({ totalMiles: (updated?.totalMiles ?? 0) + distanceMiles })
    .where(eq(membersTable.id, member.id));

  if (refreshed !== tokens) {
    await db
      .update(membersTable)
      .set({ stravaTokens: refreshed })
      .where(eq(membersTable.id, member.id));
  }
}
