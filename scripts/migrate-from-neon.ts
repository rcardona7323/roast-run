/**
 * migrate-from-neon.ts
 * Migrates member data from the original Replit/Neon database into the
 * local PostgreSQL database for the specified organization.
 *
 * Usage:
 *   cd "Documents/Run Club"
 *   pnpm tsx scripts/migrate-from-neon.ts
 *
 * Set DRY_RUN=true to preview without writing anything.
 */

import postgres from "postgres";

// ── Config ───────────────────────────────────────────────────────────────
const TARGET_ORG_ID = "hFfCJl992qaVlwTTVBeUV"; // Rick's Run Club
const DRY_RUN = process.env.DRY_RUN === "true";

const NEON_URL =
  "postgresql://neondb_owner:npg_xRKo9kmX3rnA@ep-green-thunder-aqaklw15.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";

const LOCAL_URL = "postgresql://localhost/runclub";

// ── Connect ───────────────────────────────────────────────────────────────
const neon = postgres(NEON_URL, { ssl: "require", max: 3 });
const local = postgres(LOCAL_URL, { max: 3 });

// ── Helpers ───────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(msg);
}

function shortId(seed: string): string {
  // Deterministic 28-char ID from a seed (matches nanoid length Better Auth uses)
  const crypto = require("crypto");
  return crypto.createHash("sha256").update("neon_migrate_" + seed).digest("hex").slice(0, 28);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  log(`\n🚀 Roast & Run — Neon → Local migration`);
  log(`   Target org : ${TARGET_ORG_ID}`);
  log(`   Dry run    : ${DRY_RUN}\n`);

  // ── 1. Read Neon data ──────────────────────────────────────────────────
  const neonUsers = await neon`SELECT * FROM users`;
  const neonMembers = await neon`SELECT * FROM members`;
  const neonRuns = await neon`SELECT * FROM runs`;
  const neonTiers = await neon`SELECT * FROM reward_tiers`;
  const neonRedemptions = await neon`SELECT * FROM redemptions`;

  log(`📦 Neon data:`);
  log(`   ${neonUsers.length} users`);
  log(`   ${neonMembers.length} members`);
  log(`   ${neonRuns.length} runs`);
  log(`   ${neonTiers.length} reward tiers`);
  log(`   ${neonRedemptions.length} redemptions\n`);

  // ── 2. Load existing local users (keyed by email) ─────────────────────
  const localUsersRows = await local`SELECT id, email FROM users`;
  const localUserByEmail = new Map(localUsersRows.map((u) => [u.email, u.id]));

  // ── 3. Build user ID mapping: neonUserId → localUserId ────────────────
  const userIdMap = new Map<string, string>(); // neon id → local id
  const newUsers: { id: string; name: string; email: string }[] = [];

  for (const nu of neonUsers) {
    const email = nu.email?.toLowerCase().trim();
    if (!email) continue;

    if (localUserByEmail.has(email)) {
      // Already signed up locally — use their existing account
      userIdMap.set(nu.id, localUserByEmail.get(email)!);
      log(`✅ Existing user: ${email}`);
    } else {
      // New user — generate a deterministic local ID
      const localId = shortId(nu.id + email);
      userIdMap.set(nu.id, localId);
      const name =
        [nu.first_name, nu.last_name].filter(Boolean).join(" ").trim() ||
        neonMembers.find((m: any) => m.user_id === nu.id)?.display_name ||
        email.split("@")[0];
      newUsers.push({ id: localId, name, email });
      log(`🆕 New user    : ${email} → ${name}`);
    }
  }

  // ── 4. Insert new users ───────────────────────────────────────────────
  log(`\n👤 Inserting ${newUsers.length} new users…`);
  if (!DRY_RUN && newUsers.length > 0) {
    for (const u of newUsers) {
      await local`
        INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
        VALUES (${u.id}, ${u.name}, ${u.email}, false, now(), now())
        ON CONFLICT (email) DO NOTHING
      `;
    }
    log(`   ✓ Done`);
  }

  // ── 5. Insert members ─────────────────────────────────────────────────
  log(`\n🏃 Inserting ${neonMembers.length} members…`);
  const memberIdMap = new Map<number, number>(); // neon member id → local member id

  if (!DRY_RUN) {
    for (const nm of neonMembers) {
      const localUserId = userIdMap.get(nm.user_id);
      if (!localUserId) {
        log(`   ⚠️  Skipping member ${nm.display_name} — no matching user`);
        continue;
      }

      // Build strava_tokens JSONB if present
      const stravaTokens =
        nm.strava_access_token
          ? {
              athleteId: nm.strava_athlete_id,
              athleteName: nm.strava_athlete_name,
              accessToken: nm.strava_access_token,
              refreshToken: nm.strava_refresh_token,
              expiresAt: nm.strava_token_expires_at,
            }
          : null;

      const [inserted] = await local`
        INSERT INTO members (
          user_id, organization_id, display_name, email, phone,
          emergency_contact, emergency_phone, total_miles,
          joined_at, is_admin, strava_tokens
        ) VALUES (
          ${localUserId},
          ${TARGET_ORG_ID},
          ${nm.display_name},
          ${nm.email ?? null},
          ${nm.phone ?? null},
          ${nm.emergency_contact ?? null},
          ${nm.emergency_phone ?? null},
          ${nm.total_miles ?? 0},
          ${nm.joined_at ?? new Date()},
          ${nm.is_admin ?? false},
          ${stravaTokens ? local.json(stravaTokens) : null}
        )
        ON CONFLICT (user_id, organization_id) DO UPDATE SET
          total_miles = EXCLUDED.total_miles,
          display_name = EXCLUDED.display_name,
          phone = EXCLUDED.phone,
          emergency_contact = EXCLUDED.emergency_contact,
          emergency_phone = EXCLUDED.emergency_phone
        RETURNING id
      `;

      memberIdMap.set(nm.id, inserted.id);
      log(`   ✓ ${nm.display_name} (${nm.total_miles} mi)`);
    }
  }

  // ── 6. Insert runs ────────────────────────────────────────────────────
  log(`\n🏅 Inserting ${neonRuns.length} runs…`);
  let runsInserted = 0;
  let runsSkipped = 0;

  if (!DRY_RUN) {
    for (const nr of neonRuns) {
      const localUserId = userIdMap.get(nr.user_id);
      if (!localUserId) { runsSkipped++; continue; }

      await local`
        INSERT INTO runs (
          user_id, organization_id, distance_miles, date,
          notes, source, strava_activity_id, created_at
        ) VALUES (
          ${localUserId},
          ${TARGET_ORG_ID},
          ${nr.distance_miles},
          ${nr.date},
          ${nr.notes ?? null},
          ${nr.source ?? "manual"},
          ${nr.strava_activity_id ?? null},
          ${nr.created_at ?? new Date()}
        )
        ON CONFLICT (user_id, strava_activity_id)
        WHERE strava_activity_id IS NOT NULL
        DO NOTHING
      `;
      runsInserted++;
    }
    log(`   ✓ ${runsInserted} inserted, ${runsSkipped} skipped`);
  }

  // ── 7. Insert reward tiers ────────────────────────────────────────────
  log(`\n🎁 Inserting ${neonTiers.length} reward tiers…`);
  const tierIdMap = new Map<number, number>();

  if (!DRY_RUN) {
    // Clear existing tiers for this org first (avoid duplicates on re-run)
    const existingTiers = await local`
      SELECT id, name FROM reward_tiers WHERE organization_id = ${TARGET_ORG_ID}
    `;
    log(`   (${existingTiers.length} tiers already exist locally)`);

    for (const nt of neonTiers) {
      const [inserted] = await local`
        INSERT INTO reward_tiers (
          organization_id, name, description, miles_required, reward_type, active
        ) VALUES (
          ${TARGET_ORG_ID},
          ${nt.name},
          ${nt.description ?? ""},
          ${nt.miles_required},
          ${nt.reward_type ?? "custom"},
          ${nt.active ?? true}
        )
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      if (inserted) {
        tierIdMap.set(nt.id, inserted.id);
        log(`   ✓ ${nt.name} (${nt.miles_required} mi)`);
      } else {
        log(`   ⚠️  Skipped (duplicate): ${nt.name}`);
      }
    }
  }

  // ── 8. Insert redemptions ─────────────────────────────────────────────
  log(`\n🎫 Inserting ${neonRedemptions.length} redemptions…`);

  if (!DRY_RUN) {
    for (const nr of neonRedemptions) {
      const localUserId = userIdMap.get(nr.user_id);
      const localTierId = tierIdMap.get(nr.reward_tier_id);
      if (!localUserId || !localTierId) {
        log(`   ⚠️  Skipping redemption — missing user or tier mapping`);
        continue;
      }

      await local`
        INSERT INTO redemptions (
          user_id, organization_id, reward_tier_id, status, admin_notes, created_at, updated_at
        ) VALUES (
          ${localUserId},
          ${TARGET_ORG_ID},
          ${localTierId},
          ${nr.status ?? "pending"},
          ${nr.admin_notes ?? null},
          ${nr.created_at ?? new Date()},
          ${nr.updated_at ?? new Date()}
        )
        ON CONFLICT DO NOTHING
      `;
      log(`   ✓ redemption status=${nr.status}`);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────
  log(`\n✅ Migration complete!\n`);
  log(`📋 Summary:`);
  log(`   ${newUsers.length} new users created`);
  log(`   ${neonMembers.length} members imported`);
  log(`   ${runsInserted} runs imported`);
  log(`   ${neonTiers.length} reward tiers imported`);
  log(`   ${neonRedemptions.length} redemptions imported`);

  if (newUsers.length > 0) {
    log(`\n⚠️  New users need to set a password before they can sign in.`);
    log(`   Send them to your app's /auth page and have them use`);
    log(`   "Forgot password" with their email address.\n`);
    log(`   New users:`);
    newUsers.forEach((u) => log(`     ${u.email} — ${u.name}`));
  }

  await neon.end();
  await local.end();
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
