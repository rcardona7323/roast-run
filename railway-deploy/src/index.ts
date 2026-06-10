import { createApp } from "./app.js";
import { startCronJobs } from "./lib/cron.js";
import { logger } from "./lib/logger.js";

const PORT = Number(process.env.PORT ?? 8080);
const app = createApp();

app.listen(PORT, () => {
  logger.info({ port: PORT }, "API server started");
  startCronJobs();
});
