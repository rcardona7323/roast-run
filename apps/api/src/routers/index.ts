import { router } from "../lib/trpc.js";
import { membersRouter } from "./members.js";
import { runsRouter } from "./runs.js";
import { rewardsRouter } from "./rewards.js";
import { eventsRouter } from "./events.js";
import { organizationsRouter } from "./organizations.js";
import { dashboardRouter } from "./dashboard.js";
import { leaderboardRouter } from "./leaderboard.js";
import { emailRouter } from "./email.js";

export const appRouter = router({
  members: membersRouter,
  runs: runsRouter,
  rewards: rewardsRouter,
  events: eventsRouter,
  organizations: organizationsRouter,
  dashboard: dashboardRouter,
  leaderboard: leaderboardRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;
