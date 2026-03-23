import { OpenAIClient } from "../ai/openaiClient";
import { buildReplySystemPrompt, buildReplyUserPrompt } from "../ai/prompts";
import { parseModelReply } from "../ai/replySchema";
import { decideReply } from "../policy/decide";
import { messageHash } from "../policy/dedupe";
import { isRateLimited } from "../policy/rateLimit";
import type { AppConfig } from "../config";
import type { ChatMessage } from "../policy/types";
import { openDb, migrate } from "../store/db";
import { hasOutboundAfter, hasReplyForInbound, insertMessage, recordReply } from "../store/messages";
import { getPrivateChatByName, getRecentMessagesForChat, initWWebClient, sendChatMessage } from "../whatsapp/wwebClient";

export async function runHourlyTick(cfg: AppConfig): Promise<void> {
  console.log("[tick] starting hourly tick");
  const db = openDb(cfg.DB_PATH);
  migrate(db);

  console.log("[tick] initializing whatsapp-web.js client");
  const client = await initWWebClient(cfg);

  console.log("[tick] resolving chat by name:", cfg.MUM_CHAT_NAME);
  const chat = await getPrivateChatByName(client, cfg.MUM_CHAT_NAME);
  if (!chat) {
    console.log("[tick] chat not found, exiting");
    await client.destroy();
    return;
  }

  const recent = await getRecentMessagesForChat(client, chat, 30);
  console.log("[tick] read recent messages:", recent.length);

  const now = new Date();
  const ai = new OpenAIClient({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY });

  const messages: ChatMessage[] = recent.map((m) => ({ ...m }));

  console.log(
    "[tick] recent messages snapshot:",
    messages.map((m) => ({
      dir: m.direction,
      from: m.from,
      text: m.text,
      ts: new Date(m.timestampMs).toISOString(),
    }))
  );

  // Persist messages to DB for dedupe/manual-reply detection.
  for (const m of messages) {
    insertMessage(db, {
      id: m.id,
      chatId: m.chatId,
      direction: m.direction,
      text: m.text,
      timestampMs: m.timestampMs,
      hash: messageHash({ chatId: m.chatId, direction: m.direction, text: m.text }),
      createdAtMs: Date.now(),
    });
  }

  // Collect all unreplied inbound messages with non-empty text, oldest first.
  const inboundCandidates = messages
    .filter(
      (m) =>
        m.direction === "inbound" &&
        m.text.trim().length > 0 &&
        !hasReplyForInbound(db, m.id) &&
        !hasOutboundAfter(db, m.chatId, m.timestampMs)
    )
    .sort((a, b) => a.timestampMs - b.timestampMs);

  if (inboundCandidates.length === 0) {
    console.log("[tick] no unreplied inbound messages found, exiting");
    await client.destroy();
    return;
  }

  console.log("[tick] processing", inboundCandidates.length, "unreplied inbound(s)");
  let sentCount = 0;

  for (const inbound of inboundCandidates) {
    // Re-check rate limit before each reply (counts grow as we send).
    if (isRateLimited(db, inbound.chatId, Date.now(), {
      maxRepliesPerHour: cfg.MAX_REPLIES_PER_HOUR,
      maxRepliesPerDay: cfg.MAX_REPLIES_PER_DAY,
    })) {
      console.log("[tick] rate limit reached, stopping for this tick");
      break;
    }

    const decision = decideReply({
      now,
      replyWindowEnabled: cfg.MAMA_REPLY_WINDOW_ENABLED,
      window: {
        timezone: cfg.MAMA_TIMEZONE,
        startHourInclusive: cfg.MAMA_ALLOWED_START_HOUR,
        endHourExclusive: cfg.MAMA_ALLOWED_END_HOUR,
      },
      inbound,
      alreadyRepliedToInbound: false,
      hasManualReplySinceInbound: false,
      rateLimited: false,
    });

    if (decision.action === "skip") {
      console.log("[tick] skip inbound", inbound.id, "->", decision.reason, decision.tags);
      continue;
    }

    let replyText = decision.replyText;
    let tags = decision.tags;

    if (replyText === "__LLM__") {
      // Build context: thread up to and including this inbound message.
      const contextMessages = messages.filter((m) => m.timestampMs <= inbound.timestampMs).slice(-30);

      console.log("[tick] calling AI model for inbound:", inbound.text.slice(0, 60));
      try {
        const content = await ai.chatCompletionsCreate({
          model: cfg.AI_MODEL,
          messages: [
            { role: "system", content: buildReplySystemPrompt() },
            { role: "user", content: buildReplyUserPrompt({ chatName: cfg.MUM_CHAT_NAME, messages: contextMessages }) },
          ],
          temperature: 0.4,
          response_format: { type: "json_object" },
        });

        const parsed = parseModelReply(content);
        if (!parsed.ok) {
          console.error("[model] invalid JSON for inbound", inbound.id, ":", parsed.error);
          continue;
        }

        const m = parsed.value;
        console.log("[tick] model response:", JSON.stringify({
          category: m.category,
          risk: m.risk,
          should_send: m.should_send,
          escalate: m.escalate,
          reply: m.reply ? "(present)" : null,
        }));
        tags = [...tags, m.category, `risk_${m.risk}`];

        if (!m.should_send || m.escalate || m.category === "NOTFALL") {
          console.log("[tick] model decided NOT to send for inbound", inbound.id);
          continue;
        }

        if (!m.reply || !m.reply.trim()) {
          console.error("[model] should_send=true but reply empty for inbound", inbound.id);
          continue;
        }

        replyText = m.reply.trim();
      } catch (err) {
        console.error("[tick] AI call failed for inbound", inbound.id, ":", err);
        continue;
      }
    }

    if (!cfg.DRY_RUN) {
      try {
        console.log("[tick] sending reply for inbound", inbound.id, ":", replyText);
        await sendChatMessage(client, chat, replyText);
        recordReply(db, {
          inboundMessageId: inbound.id,
          replyMessageId: null,
          replyText,
          decisionReason: decision.reason,
          tags,
          createdAtMs: Date.now(),
        });
        sentCount++;

        // Append synthetic outbound to in-memory messages so subsequent
        // iterations include our reply in the model's context window.
        messages.push({
          id: `synth-out-${Date.now()}`,
          chatId: inbound.chatId,
          chatName: inbound.chatName,
          direction: "outbound",
          text: replyText,
          timestampMs: Date.now(),
        });
      } catch (err) {
        console.error("[tick] send failed for inbound", inbound.id, ":", err);
        continue;
      }
    } else {
      console.log("[DRY_RUN] would reply to inbound", inbound.id, ":", replyText);
    }
  }

  console.log("[tick] done; sent", sentCount, "reply(ies). Destroying whatsapp-web.js client.");
  await client.destroy();
}
