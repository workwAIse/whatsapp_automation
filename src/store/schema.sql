PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  text TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_time ON messages(chat_id, timestamp_ms);
CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages(hash);

CREATE TABLE IF NOT EXISTS replies (
  inbound_message_id TEXT NOT NULL PRIMARY KEY,
  reply_message_id TEXT,
  reply_text TEXT NOT NULL,
  decision_reason TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  FOREIGN KEY (inbound_message_id) REFERENCES messages(id)
);

CREATE TABLE IF NOT EXISTS summary_events (
  id TEXT PRIMARY KEY,
  day_key TEXT NOT NULL, -- e.g. 2026-03-19 in MAMA_TIMEZONE
  chat_id TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  kind TEXT NOT NULL, -- freeform: "hike", "mood", "request", etc.
  payload_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_summary_day ON summary_events(day_key);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

