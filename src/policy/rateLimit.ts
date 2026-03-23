import type { Db } from "../store/db";

export type RateLimitPolicy = {
  maxRepliesPerHour: number;
  maxRepliesPerDay: number;
};

function hourKey(timestampMs: number): string {
  const d = new Date(timestampMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}`;
}

function dayKeyUtc(timestampMs: number): string {
  const d = new Date(timestampMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isRateLimited(db: Db, chatId: string, nowMs: number, policy: RateLimitPolicy): boolean {
  const hour = hourKey(nowMs);
  const day = dayKeyUtc(nowMs);

  const hourly = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM replies r
       JOIN messages m ON m.id = r.inbound_message_id
       WHERE m.chat_id = ?
         AND r.created_at_ms >= ?`
    )
    .get(chatId, nowMs - 60 * 60 * 1000) as { c: number };

  if ((hourly?.c ?? 0) >= policy.maxRepliesPerHour) return true;

  // Day-based on UTC for now; we’ll switch to timezone-based day_key later when we centralize day computation.
  const dayStartMs = Date.parse(`${day}T00:00:00.000Z`);
  const daily = db
    .prepare(
      `SELECT COUNT(*) AS c
       FROM replies r
       JOIN messages m ON m.id = r.inbound_message_id
       WHERE m.chat_id = ?
         AND r.created_at_ms >= ?`
    )
    .get(chatId, dayStartMs) as { c: number };

  return (daily?.c ?? 0) >= policy.maxRepliesPerDay;
}

