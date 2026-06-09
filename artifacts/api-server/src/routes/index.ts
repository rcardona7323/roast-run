import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import membersRouter from "./members";
import runsRouter from "./runs";
import rewardTiersRouter from "./rewardTiers";
import redemptionsRouter from "./redemptions";
import leaderboardRouter from "./leaderboard";
import dashboardRouter from "./dashboard";
import stravaRouter from "./strava";
import clubEventsRouter from "./clubEvents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(membersRouter);
router.use(runsRouter);
router.use(rewardTiersRouter);
router.use(redemptionsRouter);
router.use(leaderboardRouter);
router.use(dashboardRouter);
router.use(stravaRouter);
router.use(clubEventsRouter);

export default router;
