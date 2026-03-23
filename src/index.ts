import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config";
import { runDailySummary } from "./jobs/dailySummary";
import { runHourlyTick } from "./jobs/hourlyTick";

async function main() {
  // Prefer .env.local if present, otherwise fall back to .env
  const envLocal = path.join(process.cwd(), ".env.local");
  const envDefault = path.join(process.cwd(), ".env");
  const envPath = fs.existsSync(envLocal) ? envLocal : envDefault;
  dotenv.config({ path: envPath });

  const cfg = loadConfig(process.env);
  const cmd = process.argv[2] ?? "tick";

  if (cmd === "tick") {
    await runHourlyTick(cfg);
    return;
  }

  if (cmd === "summary") {
    await runDailySummary(cfg);
    return;
  }

  throw new Error(`Unknown command: ${cmd} (expected: tick | summary)`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

