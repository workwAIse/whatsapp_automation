import qrcode from "qrcode-terminal";
import { Client, LocalAuth, type Chat, type Message } from "whatsapp-web.js";
import type { AppConfig } from "../config";
import type { ChatMessage } from "../policy/types";

export type WWebClient = Client;

export async function initWWebClient(cfg: AppConfig): Promise<WWebClient> {
  // Server mode: HEADLESS=true or NODE_ENV=production (no display)
  const headless =
    process.env.HEADLESS === "true" || process.env.NODE_ENV === "production";

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: "mama-whatsapp",
      dataPath: cfg.WHATSAPP_USER_DATA_DIR,
    }),
    puppeteer: {
      headless,
      args: headless
        ? [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-translate",
            "--no-first-run",
            "--disable-features=TranslateUI",
            "--disable-ipc-flooding-protection",
            "--js-flags=--max-old-space-size=128",
          ]
        : [],
    },
  });

  client.on("qr", (qr) => {
    console.log("[wweb] QR code received. Scan this from your phone:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("[wweb] client is ready");
  });

  client.on("auth_failure", (msg) => {
    console.error("[wweb] auth failure:", msg);
  });

  console.log("[wweb] initializing client…");
  await client.initialize();

  // wait until state is READY
  return new Promise<WWebClient>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("wweb client READY timeout")), 120_000);
    client.once("ready", () => {
      clearTimeout(timeout);
      resolve(client);
    });
  });
}

export async function getPrivateChatByName(client: WWebClient, name: string): Promise<Chat | null> {
  const chats = await client.getChats();
  const match = chats.find((c) => !c.isGroup && c.name === name);
  if (!match) {
    console.warn("[wweb] no chat found for name:", name);
    return null;
  }
  console.log("[wweb] resolved chat", name, "->", match.id._serialized);
  return match;
}

export async function getRecentMessagesForChat(
  client: WWebClient,
  chat: Chat,
  limit: number
): Promise<ChatMessage[]> {
  const msgs: Message[] = await chat.fetchMessages({ limit });
  console.log("[wweb] fetched messages for chat", chat.id._serialized, "count:", msgs.length);

  return msgs.map((m) => ({
    id: m.id._serialized,
    chatId: chat.id._serialized,
    chatName: chat.name,
    direction: m.fromMe ? "outbound" : "inbound",
    from: m.from,
    text: m.body || "",
    timestampMs: (m.timestamp || 0) * 1000,
  }));
}

export async function sendChatMessage(client: WWebClient, chat: Chat, text: string): Promise<void> {
  console.log("[wweb] sending message to chat", chat.id._serialized, "text:", text.slice(0, 60));
  const sent = await chat.sendMessage(text);
  console.log("[wweb] message sent, id:", sent.id._serialized);
  // Brief pause to let the message reach WhatsApp servers before client teardown.
  await new Promise((r) => setTimeout(r, 2000));
}

