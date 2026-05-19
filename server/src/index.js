import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load from repo root so all env vars are available regardless of CWD
dotenv.config({ path: resolve(__dirname, "../../.env") });

import app from "./app.js";
import { startPcSyncWorker, scheduleExistingOrgs } from "./workers/pcSyncWorker.js";
import { startPublishWorker, startPublishScheduler } from "./workers/publishWorker.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);

  // Start Planning Center BullMQ worker
  startPcSyncWorker();
  await scheduleExistingOrgs();

  // Start post publishing worker + scheduler
  startPublishWorker();
  startPublishScheduler();
});
