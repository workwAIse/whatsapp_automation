import { z } from "zod";

export type OpenAIClientConfig = {
  baseUrl: string; // e.g. https://your.endpoint/v1
  apiKey: string;
};

export type ChatCompletionRequest = {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  response_format?: { type: "json_object" };
};

const ChatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.string().optional(),
          content: z.string().nullable(),
        }),
      })
    )
    .min(1),
});

export class OpenAIClient {
  constructor(private cfg: OpenAIClientConfig) {}

  async chatCompletionsCreate(req: ChatCompletionRequest): Promise<string> {
    // Support baseUrl with or without trailing /v1.
    const base = this.cfg.baseUrl.endsWith("/")
      ? this.cfg.baseUrl
      : this.cfg.baseUrl + "/";
    const url = new URL("chat/completions", base).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${text || res.statusText}`);
    }

    const json = await res.json();
    const parsed = ChatCompletionResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`AI response shape invalid: ${parsed.error.message}`);
    }

    const content = parsed.data.choices[0]?.message?.content;
    if (!content) throw new Error("AI response had empty content.");
    return content;
  }
}

