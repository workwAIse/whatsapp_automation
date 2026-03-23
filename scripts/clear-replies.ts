/**
 * One-off: clear all reply records so the next tick will treat the latest
 * inbound message as unreplied (e.g. after a dry-run or for re-testing).
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { openDb, migrate } from "../src/store/db";

const envLocal = path.join(process.cwd(), ".env.local");
const envDefault = path.join(process.cwd(), ".env");
const envPath = fs.existsSync(envLocal) ? envLocal : envDefault;
dotenv.config({ path: envPath });

const dbPath = process.env.DB_PATH ?? "./.data/mama.sqlite";
const db = openDb(dbPath);
migrate(db);

const before = db.prepare("SELECT COUNT(*) AS c FROM replies").get() as { c: number };
db.prepare("DELETE FROM replies").run();
const after = db.prepare("SELECT COUNT(*) AS c FROM replies").get() as { c: number };

console.log(`[clear-replies] deleted ${before.c - after.c} reply record(s). Next tick will consider inbound messages as unreplied.`);
