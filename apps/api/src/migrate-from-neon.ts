/**
 * migrate-from-neon.ts — Neon → Local PostgreSQL migration
 * Run: cd apps/api && node_modules/.bin/tsx src/migrate-from-neon.ts
 * Dry: DRY_RUN=true node_modules/.bin/tsx src/migrate-from-neon.ts
 */

import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

const TARGET_ORG_ID = "hFfCJl992qaVlwTTVBeUV"; // Rick's Run Club
const DRY_RUN = process.env.DRY_RUN === "true";

const neonPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_xRKo9kmX3rnA@ep-green-thunder-aqaklw15.c-8.us-east-1.aws.neon.tech/neondb",
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const localPool = new Pool({ database: "runclub", max: 3 });

const log = (msg: string) => console.log(msg);

function stableId(seed: string): string {
  return crypto.createHash("sha256").update("neon_" + seed).digest("hex").slice(0, 28);
}

const tierIdMap = new Map<number, number>();

async function main() {
  log(`\n🚀 Roast & Run — Neon → Local migration`);
  log(`   Target org : ${TARGET_ORG_ID}`);
  log(`   Dry run    : ${DRY_RUN}\n`);

  const neon = await neonPool.connect();
  const local = await localPool.connect();

  try {
    const { rows: neonUsers }       = await neon.query("SELECT * FROM users");
    const { rows: neonMembers }     = await neon.query("SELECT * FROM members ORDER BY id");
    const { rows: neonRuns }        = await neon.query("SELECT * FROM runs ORDER BY id");
    const { rows: neonTiers }       = await neon.query("SELECT * FROM reward_tiers ORDER BY miles_required");
    const { rows: neonRedemptions } = await neon.query("SELECT * FROM redemptions ORDER BY id");

    log(`📦 Neon: ${neonUsers.length} users, ${neonMembers.length} members, ${neonRuns.length} runs, ${neonTiers.length} tiers, ${neonRedemptions.length} redemptions\n`);

    // Build user ID map
    const { rows: localUsers } = await local.query("SELECT id, email FROM users");
    const localUserByEmail = new Map(localUsers.map((u: any) => [u.email.toLowerCase(), u.id]));
    const userIdMap = new Map<string, string>();
    const newUsers: { id: string; name: string; email: string }[] = [];

    for (const nu of neonUsers) {
      const email = (nu.email ?? "").toLowerCase().trim();
      if (!email) continue;
      if (localUserByEmail.has(email)) {
        userIdMap.set(nu.id, localUserByEmail.get(email)!);
        log(`✅ Existing: ${email}`);
      } else {
        const localId = stableId(nu.id + email);
        userIdMap.set(nu.id, localId);
        const memberRow = neonMembers.find((m: any) => m.user_id === nu.id);
        const name = [nu.first_name, nu.last_name].filter(Boolean).join(" ").trim() || memberRow?.display_name || email.split("@")[0];
        newUsers.push({ id: localId, name, email });
        log(`🆕 New     : ${email} — ${name}`);
      }
    }

    // Insert new users
    log(`\n👤 ${newUsers.length} new users to create…`);
    if (!DRY_RUN) {
      for (const u of newUsers) {
        await local.query(
          `INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
           VALUES ($1,$2,$3,false,now(),now()) ON CONFLICT (email) DO NOTHING`,
          [u.id, u.name, u.email]
        );
      }
      log(`   ✓ Done`);
    }

    // Insert members
    log(`\n🏃 ${neonMembers.length} members…`);
    const memberIdMap = new Map<number, number>();
    if (!DRY_RUN) {
      for (const nm of neonMembers) {
        const localUserId = userIdMap.get(nm.user_id);
        if (!localUserId) { log(`   ⚠️  Skip ${nm.display_name} — no user`); continue; }
        const stravaTokens = nm.strava_access_token ? JSON.stringify({
          athleteId: nm.strava_athlete_id, athleteName: nm.strava_athlete_name,
          accessToken: nm.strava_access_token, refreshToken: nm.strava_refresh_token,
          expiresAt: nm.strava_token_expires_at,
        }) : null;
        const { rows } = await local.query(
          `INSERT INTO members (user_id,organization_id,display_name,email,phone,emergency_contact,emergency_phone,total_miles,joined_at,is_admin,strava_tokens)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (user_id,organization_id) DO UPDATE SET
             total_miles=EXCLUDED.total_miles, display_name=EXCLUDED.display_name,
             strava_tokens=EXCLUDED.strava_tokens
           RETURNING id`,
          [localUserId, TARGET_ORG_ID, nm.display_name, nm.email??null, nm.phone??null,
           nm.emergency_contact??null, nm.emergency_phone??null, nm.total_miles??0,
           nm.joined_at??new Date(), nm.is_admin??false, stravaTokens]
        );
        memberIdMap.set(nm.id, rows[0].id);
        log(`   ✓ ${nm.display_name} (${nm.total_miles} mi)`);
      }
    }

    // Insert runs
    log(`\n🏅 ${neonRuns.length} runs…`);
    let runsOk = 0, runsSkip = 0;
    if (!DRY_RUN) {
      for (const nr of neonRuns) {
        const localUserId = userIdMap.get(nr.user_id);
        if (!localUserId) { runsSkip++; continue; }
        if (nr.strava_activity_id) {
          await local.query(
            `INSERT INTO runs (user_id,organization_id,distance_miles,date,notes,source,strava_activity_id,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (user_id,strava_activity_id) WHERE strava_activity_id IS NOT NULL DO NOTHING`,
            [localUserId,TARGET_ORG_ID,nr.distance_miles,nr.date,nr.notes??null,nr.source??"manual",nr.strava_activity_id,nr.created_at??new Date()]
          );
        } else {
          await local.query(
            `INSERT INTO runs (user_id,organization_id,distance_miles,date,notes,source,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [localUserId,TARGET_ORG_ID,nr.distance_miles,nr.date,nr.notes??null,nr.source??"manual",nr.created_at??new Date()]
          );
        }
        runsOk++;
      }
      log(`   ✓ ${runsOk} inserted, ${runsSkip} skipped`);
    }

    // Insert reward tiers
    log(`\n🎁 ${neonTiers.length} reward tiers…`);
    if (!DRY_RUN) {
      for (const nt of neonTiers) {
        const { rows: ex } = await local.query(
          `SELECT id FROM reward_tiers WHERE organization_id=$1 AND name=$2`,
          [TARGET_ORG_ID, nt.name]
        );
        if (ex.length > 0) {
          tierIdMap.set(nt.id, ex[0].id);
          log(`   ⚠️  Exists: ${nt.name}`);
        } else {
          const { rows } = await local.query(
            `INSERT INTO reward_tiers (organization_id,name,description,miles_required,reward_type,active)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [TARGET_ORG_ID, nt.name, nt.description??"", nt.miles_required, nt.reward_type??"custom", nt.active??true]
          );
          tierIdMap.set(nt.id, rows[0].id);
          log(`   ✓ ${nt.name} (${nt.miles_required} mi)`);
        }
      }
    }

    // Insert redemptions
    log(`\n🎫 ${neonRedemptions.length} redemptions…`);
    let redeemsOk = 0;
    if (!DRY_RUN) {
      for (const nr of neonRedemptions) {
        const localUserId = userIdMap.get(nr.user_id);
        const localTierId = tierIdMap.get(nr.reward_tier_id);
        if (!localUserId || !localTierId) { log(`   ⚠️  Skip redemption`); continue; }
        await local.query(
          `INSERT INTO redemptions (user_id,organization_id,reward_tier_id,status,admin_notes,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [localUserId,TARGET_ORG_ID,localTierId,nr.status??"pending",nr.admin_notes??null,nr.created_at??new Date(),nr.updated_at??new Date()]
        );
        redeemsOk++;
      }
      log(`   ✓ ${redeemsOk} imported`);
    }

    log(`\n✅ Done!`);
    if (newUsers.length > 0) {
      log(`\n⚠️  These users need to use "Forgot password" at /auth to set a password:`);
      newUsers.forEach(u => log(`   • ${u.email} (${u.name})`));
    }

  } finally {
    neon.release();
    local.release();
    await neonPool.end();
    await localPool.end();
  }
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
