import { describe, expect, it } from "vitest";
import { decideReply } from "../src/policy/decide";
import type { ChatMessage } from "../src/policy/types";

function inbound(text: string, timestampMs: number): ChatMessage {
  return {
    id: "m1",
    chatId: "mum",
    direction: "inbound",
    text,
    timestampMs,
  };
}

describe("policy decideReply", () => {
  it("skips outside allowed window when replyWindowEnabled=true", () => {
    const res = decideReply({
      now: new Date("2026-03-19T22:30:00.000Z"),
      replyWindowEnabled: true,
      window: { timezone: "Europe/Berlin", startHourInclusive: 9, endHourExclusive: 21 },
      inbound: inbound("hi", Date.now()),
      hasManualReplySinceInbound: false,
      alreadyRepliedToInbound: false,
      rateLimited: false,
    });
    expect(res.action).toBe("skip");
    expect(res.tags).toContain("outside_window");
  });

  it("does not skip outside window when replyWindowEnabled=false", () => {
    const res = decideReply({
      now: new Date("2026-03-19T22:30:00.000Z"),
      replyWindowEnabled: false,
      window: { timezone: "Europe/Berlin", startHourInclusive: 9, endHourExclusive: 21 },
      inbound: inbound("hi", Date.now()),
      hasManualReplySinceInbound: false,
      alreadyRepliedToInbound: false,
      rateLimited: false,
    });
    expect(res.action).toBe("reply");
  });

  it("skips if manual reply already happened", () => {
    const res = decideReply({
      now: new Date("2026-03-19T10:00:00.000Z"),
      replyWindowEnabled: false,
      window: { timezone: "Europe/Berlin", startHourInclusive: 9, endHourExclusive: 21 },
      inbound: inbound("hi", Date.now()),
      hasManualReplySinceInbound: true,
      alreadyRepliedToInbound: false,
      rateLimited: false,
    });
    expect(res.action).toBe("skip");
    expect(res.tags).toContain("manual_reply_detected");
  });

  it("hard-blocks meeting/call promises with safe reply", () => {
    const res = decideReply({
      now: new Date("2026-03-19T10:00:00.000Z"),
      replyWindowEnabled: false,
      window: { timezone: "Europe/Berlin", startHourInclusive: 9, endHourExclusive: 21 },
      inbound: inbound("Can we schedule a meeting and you call me later?", Date.now()),
      hasManualReplySinceInbound: false,
      alreadyRepliedToInbound: false,
      rateLimited: false,
    });
    expect(res.action).toBe("reply");
    if (res.action === "reply") {
      expect(res.replyText).toMatch(/ask Alex directly/i);
    }
    expect(res.tags).toContain("guardrail_hard_block");
  });

  it("skips when rate limited", () => {
    const res = decideReply({
      now: new Date("2026-03-19T10:00:00.000Z"),
      replyWindowEnabled: false,
      window: { timezone: "Europe/Berlin", startHourInclusive: 9, endHourExclusive: 21 },
      inbound: inbound("hi", Date.now()),
      hasManualReplySinceInbound: false,
      alreadyRepliedToInbound: false,
      rateLimited: true,
    });
    expect(res.action).toBe("skip");
    expect(res.tags).toContain("rate_limited");
  });
});

