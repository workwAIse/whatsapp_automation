import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

export function openDb(dbPath: string): Db {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrate(db: Db): void {
  // Load schema.sql from disk at runtime.
  // This keeps migrations simple for now (single-file schema for MVP).
  const schemaPath = path.join(process.cwd(), "src", "store", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  db.exec(sql);
}

