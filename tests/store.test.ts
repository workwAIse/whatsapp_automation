import { describe, expect, it } from "vitest";
import { openDb, migrate } from "../src/store/db";
import { hasReplyForInbound, insertMessage, recordReply } from "../src/store/messages";

describe("store", () => {
  it("records replies for inbound messages", () => {
    const db = openDb(":memory:");
    migrate(db);

    insertMessage(db, {
      id: "in1",
      chatId: "mum",
      direction: "inbound",
      text: "hello",
      timestampMs: 1,
      hash: "h",
      createdAtMs: 1,
    });

    expect(hasReplyForInbound(db, "in1")).toBe(false);

    recordReply(db, {
      inboundMessageId: "in1",
      replyMessageId: "out1",
      replyText: "hi",
      decisionReason: "ok",
      tags: ["eligible"],
      createdAtMs: 2,
    });

    expect(hasReplyForInbound(db, "in1")).toBe(true);
  });
});

