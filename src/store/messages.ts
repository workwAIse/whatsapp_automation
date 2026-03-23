import type { Db } from "./db";

export type StoredMessage = {
  id: string;
  chatId: string;
  direction: "inbound" | "outbound";
  text: string;
  timestampMs: number;
  hash: string;
  createdAtMs: number;
};

export function insertMessage(db: Db, msg: StoredMessage): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO messages
      (id, chat_id, direction, text, timestamp_ms, hash, created_at_ms)
     VALUES
      (@id, @chatId, @direction, @text, @timestampMs, @hash, @createdAtMs)`
  );
  stmt.run(msg);
}

export function hasMessage(db: Db, id: string): boolean {
  const row = db.prepare(`SELECT 1 AS ok FROM messages WHERE id = ?`).get(id) as { ok: 1 } | undefined;
  return Boolean(row?.ok);
}

export function recordReply(db: Db, input: {
  inboundMessageId: string;
  replyMessageId?: string | null;
  replyText: string;
  decisionReason: string;
  tags: string[];
  createdAtMs: number;
}): void {
  db.prepare(
    `INSERT OR REPLACE INTO replies
      (inbound_message_id, reply_message_id, reply_text, decision_reason, tags_json, created_at_ms)
     VALUES
      (@inboundMessageId, @replyMessageId, @replyText, @decisionReason, @tagsJson, @createdAtMs)`
  ).run({
    inboundMessageId: input.inboundMessageId,
    replyMessageId: input.replyMessageId ?? null,
    replyText: input.replyText,
    decisionReason: input.decisionReason,
    tagsJson: JSON.stringify(input.tags),
    createdAtMs: input.createdAtMs,
  });
}

export function hasReplyForInbound(db: Db, inboundMessageId: string): boolean {
  const row = db
    .prepare(`SELECT 1 AS ok FROM replies WHERE inbound_message_id = ?`)
    .get(inboundMessageId) as { ok: 1 } | undefined;
  return Boolean(row?.ok);
}

export function getLastOutboundTimestampMs(db: Db, chatId: string): number | null {
  const row = db
    .prepare(
      `SELECT timestamp_ms AS ts
       FROM messages
       WHERE chat_id = ? AND direction = 'outbound'
       ORDER BY timestamp_ms DESC
       LIMIT 1`
    )
    .get(chatId) as { ts: number } | undefined;
  return row?.ts ?? null;
}

export function hasOutboundAfter(db: Db, chatId: string, afterTimestampMs: number): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS ok
       FROM messages
       WHERE chat_id = ?
         AND direction = 'outbound'
         AND timestamp_ms > ?
       LIMIT 1`
    )
    .get(chatId, afterTimestampMs) as { ok: 1 } | undefined;
  return Boolean(row?.ok);
}

