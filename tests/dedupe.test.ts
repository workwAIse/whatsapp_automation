import { describe, expect, it } from "vitest";
import { messageHash, normalizeTextForDedupe } from "../src/policy/dedupe";

describe("dedupe helpers", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeTextForDedupe("  Hello   Mum \n")).toBe("hello mum");
  });

  it("hash is stable for same normalized text", () => {
    const h1 = messageHash({ chatId: "c1", direction: "inbound", text: "Hello  Mum" });
    const h2 = messageHash({ chatId: "c1", direction: "inbound", text: "hello mum " });
    expect(h1).toBe(h2);
  });

  it("hash differs across chats", () => {
    const h1 = messageHash({ chatId: "c1", direction: "inbound", text: "hello" });
    const h2 = messageHash({ chatId: "c2", direction: "inbound", text: "hello" });
    expect(h1).not.toBe(h2);
  });
});

