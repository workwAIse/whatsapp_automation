import { describe, expect, it } from "vitest";
import { openDb, migrate } from "../src/store/db";
import { insertMessage, recordReply } from "../src/store/messages";
import { isRateLimited } from "../src/policy/rateLimit";

describe("rate limiting", () => {
  it("rate limits after max per hour", () => {
    const db = openDb(":memory:");
    migrate(db);

    const now = Date.parse("2026-03-19T10:30:00.000Z");
    for (let i = 0; i < 2; i++) {
      insertMessage(db, {
        id: `in${i}`,
        chatId: "mum",
        direction: "inbound",
        text: "x",
        timestampMs: now - 1000 * i,
        hash: `h${i}`,
        createdAtMs: now - 1000 * i,
      });
      recordReply(db, {
        inboundMessageId: `in${i}`,
        replyMessageId: `out${i}`,
        replyText: "ok",
        decisionReason: "ok",
        tags: [],
        createdAtMs: now - 1000 * i,
      });
    }

    expect(isRateLimited(db, "mum", now, { maxRepliesPerHour: 2, maxRepliesPerDay: 99 })).toBe(true);
    expect(isRateLimited(db, "mum", now, { maxRepliesPerHour: 3, maxRepliesPerDay: 99 })).toBe(false);
  });
});

