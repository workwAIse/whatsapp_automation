import { describe, expect, it } from "vitest";
import { parseModelReply } from "../src/ai/replySchema";

describe("parseModelReply", () => {
  it("accepts valid JSON with should_send=true and non-null reply", () => {
    const raw = JSON.stringify({
      category: "EMOTIONAL",
      risk: "MEDIUM",
      should_send: true,
      mark_unread: false,
      escalate: false,
      reply: "Hallo Mama",
    });
    const res = parseModelReply(raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.reply).toBe("Hallo Mama");
    }
  });

  it("rejects when should_send=false but reply is non-null", () => {
    const raw = JSON.stringify({
      category: "INFO",
      risk: "LOW",
      should_send: false,
      mark_unread: false,
      escalate: false,
      reply: "should be null",
    });
    const res = parseModelReply(raw);
    expect(res.ok).toBe(false);
  });

  it("rejects invalid JSON", () => {
    const res = parseModelReply("{not json");
    expect(res.ok).toBe(false);
  });
});

