import { describe, expect, it } from "vitest";
import { OpenAIClient } from "../src/ai/openaiClient";

describe("OpenAIClient", () => {
  it("parses content from a valid response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "hello" } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    try {
      const c = new OpenAIClient({ baseUrl: "https://example.com/v1", apiKey: "k" });
      const content = await c.chatCompletionsCreate({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
      });
      expect(content).toBe("hello");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

