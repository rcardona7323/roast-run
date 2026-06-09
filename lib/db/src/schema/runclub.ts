import { pgTable, text, serial, integer, real, boolean, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  profileImageUrl: text("profile_image_url"),
  totalMiles: real("total_miles").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
  parentMemberId: integer("parent_member_id"),
  stravaAthleteId: text("strava_athlete_id"),
  stravaAthleteName: text("strava_athlete_name"),
  stravaAccessToken: text("strava_access_token"),
  stravaRefreshToken: text("strava_refresh_token"),
  stravaTokenExpiresAt: integer("strava_token_expires_at"),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, joinedAt: true, totalMiles: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;

export const clubEventsTable = pgTable("club_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClubEventSchema = createInsertSchema(clubEventsTable).omit({ id: true, createdAt: true });
export type InsertClubEvent = z.infer<typeof insertClubEventSchema>;
export type ClubEvent = typeof clubEventsTable.$inferSelect;

export const runsTable = pgTable("runs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  distanceMiles: real("distance_miles").notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  source: text("source").notNull().default("manual"),
  stravaActivityId: text("strava_activity_id"),
  clubEventId: integer("club_event_id"),
}, (table) => [
  uniqueIndex("runs_user_strava_activity_idx").on(table.userId, table.stravaActivityId),
]);

export const insertRunSchema = createInsertSchema(runsTable).omit({ id: true, createdAt: true });
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Run = typeof runsTable.$inferSelect;

export const rewardTiersTable = pgTable("reward_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  milesRequired: real("miles_required").notNull(),
  rewardType: text("reward_type").notNull(), // coffee | smoothie | apparel | custom
  active: boolean("active").notNull().default(true),
});

export const insertRewardTierSchema = createInsertSchema(rewardTiersTable).omit({ id: true });
export type InsertRewardTier = z.infer<typeof insertRewardTierSchema>;
export type RewardTier = typeof rewardTiersTable.$inferSelect;

export const redemptionsTable = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  rewardTierId: integer("reward_tier_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRedemptionSchema = createInsertSchema(redemptionsTable).omit({ id: true, createdAt: true, updatedAt: true, status: true, adminNotes: true });
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
export type Redemption = typeof redemptionsTable.$inferSelect;
