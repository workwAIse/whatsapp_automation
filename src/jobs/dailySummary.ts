import { OpenAIClient } from "../ai/openaiClient";
import { buildDailySummarySystemPrompt } from "../ai/prompts";
import type { AppConfig } from "../config";
import { openDb, migrate } from "../store/db";
import { getPrivateChatByName, initWWebClient, sendChatMessage } from "../whatsapp/wwebClient";

type SummaryJson = { summaryText: string; highlights?: string[] };

export async function runDailySummary(cfg: AppConfig): Promise<void> {
  const db = openDb(cfg.DB_PATH);
  migrate(db);

  // Pull last ~24h messages for mum chat (MVP: based on timestamp_ms)
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const rows = db
    .prepare(
      `SELECT direction, text, timestamp_ms
       FROM messages
       WHERE chat_id = ? AND timestamp_ms >= ?
       ORDER BY timestamp_ms ASC`
    )
    .all(cfg.MUM_CHAT_NAME, since) as Array<{ direction: "inbound" | "outbound"; text: string; timestamp_ms: number }>;

  const transcript = rows
    .map((r) => `${r.direction === "inbound" ? "Mum" : "Alex"}: ${r.text}`)
    .join("\n");

  const ai = new OpenAIClient({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY });
  const content = await ai.chatCompletionsCreate({
    model: cfg.AI_MODEL,
    messages: [
      { role: "system", content: buildDailySummarySystemPrompt() },
      { role: "user", content: transcript ? `Transcript:\n${transcript}` : "No messages recorded today." },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const parsed = safeJsonParse<SummaryJson>(content);
  const summaryText = parsed?.summaryText?.trim() || content.trim();

  const client = await initWWebClient(cfg);
  const chat = await getPrivateChatByName(client, cfg.SELF_CHAT_NAME);
  if (!chat) {
    console.log("[summary] self chat not found, exiting");
    await client.destroy();
    return;
  }

  if (!cfg.DRY_RUN) {
    await sendChatMessage(client, chat, `Daily mum summary:\n\n${summaryText}`);
  } else {
    console.log("[DRY_RUN] would send daily summary:", summaryText);
  }

  await client.destroy();
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

