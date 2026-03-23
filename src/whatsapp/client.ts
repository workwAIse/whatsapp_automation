import { chromium, type BrowserContext, type Page } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { Selectors } from "./selectors";
import type { ChatMessage } from "../policy/types";

export type WhatsAppClientConfig = {
  userDataDir: string;
  headless: boolean;
};

export type LocatedChat = {
  chatId: string; // best-effort stable id (we'll use chat title for now)
  chatName: string;
};

export class WhatsAppClient {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(private cfg: WhatsAppClientConfig) {}

  async start(): Promise<void> {
    const absProfile = path.isAbsolute(this.cfg.userDataDir)
      ? this.cfg.userDataDir
      : path.join(process.cwd(), this.cfg.userDataDir);
    fs.mkdirSync(absProfile, { recursive: true });

    this.context = await chromium.launchPersistentContext(absProfile, {
      headless: this.cfg.headless,
      viewport: { width: 1280, height: 900 },
    });

    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    await this.page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded" });
    await this.page.waitForTimeout(1500);
  }

  async stop(): Promise<void> {
    await this.context?.close();
    this.context = null;
    this.page = null;
  }

  /**
   * Wait until WhatsApp Web is logged in and main UI is ready.
   * If not logged in, user must scan QR in headed mode.
   */
  async waitUntilReady(timeoutMs = 120_000): Promise<void> {
    const page = this.mustPage();
    // Newer WhatsApp Web builds don't always expose stable roles/labels.
    // Wait for an element that only appears once the main chat UI is rendered:
    // either the sidebar search input or the message composer.
    await Promise.race([
      page.waitForSelector(Selectors.chatSearchInput, { timeout: timeoutMs }),
      page.waitForSelector(Selectors.composer, { timeout: timeoutMs }),
    ]);
  }

  /**
   * Opens a chat by searching its title.
   * Returns best-effort chat identity (title-based).
   */
  async openChatByName(chatName: string): Promise<LocatedChat> {
    const page = this.mustPage();

    // Focus search (UI variants exist; we use the search input directly).
    const input = await page.waitForSelector(Selectors.chatSearchInput, { timeout: 10_000 });
    await input.click();
    await input.fill("");
    await input.type(chatName, { delay: 30 });

    // After typing, the chat list is filtered. Click the first visible row in the list.
    await page.waitForSelector(Selectors.chatList, { timeout: 10_000 });
    const firstRow = page.locator(`${Selectors.chatList} div[role="row"]`).first();
    await firstRow.waitFor({ timeout: 10_000 });
    await firstRow.click();

    // Give WhatsApp a moment to render the conversation pane, then assume we are in the right chat.
    await page.waitForTimeout(500);
    return { chatId: chatName, chatName };
  }

  async sendMessage(text: string): Promise<void> {
    const page = this.mustPage();
    const composer = await page.waitForSelector(Selectors.composer, { timeout: 10_000 });
    await composer.click();
    await composer.fill("");
    await composer.type(text, { delay: 10 });

    const send = await page.$(Selectors.sendButton);
    if (send) {
      await send.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForTimeout(500);
  }

  /**
   * Best-effort \"Mark as unread\" for the currently open chat.
   * This uses the chat header menu; it may need selector updates if WhatsApp changes UI.
   */
  async markChatUnread(): Promise<void> {
    const page = this.mustPage();
    const menuBtn = await page.$(Selectors.chatHeaderMenuButton);
    if (!menuBtn) {
      throw new Error("chatHeaderMenuButton not found");
    }
    await menuBtn.click();
    await page.waitForTimeout(200);

    const item = await page.$(Selectors.chatHeaderMenuUnreadItem);
    if (!item) {
      throw new Error("Mark as unread menu item not found");
    }
    await item.click();
    await page.waitForTimeout(200);
  }

  /**
   * Best-effort read of the most recent messages in the currently open chat.
   * This is intentionally conservative and may return fewer than requested.
   */
  async readRecentMessages(limit = 20): Promise<ChatMessage[]> {
    const page = this.mustPage();

    const nodes = page.locator(`${Selectors.messageIn}, ${Selectors.messageOut}`);
    const count = await nodes.count();
    console.log("[whatsapp] found message nodes:", count);
    const start = Math.max(0, count - limit);

    const out: ChatMessage[] = [];
    for (let i = start; i < count; i++) {
      const node = nodes.nth(i);
      const klass = (await node.getAttribute("class")) ?? "";
      const direction = klass.includes("message-out") ? "outbound" : "inbound";

      // Pull the plain-text timestamp header (data-pre-plain-text) when available.
      const copyable = node.locator(Selectors.copyableText).first();
      const pre = (await copyable.getAttribute("data-pre-plain-text")) ?? "";
      const ts = parseTimestampFromPrePlainText(pre) ?? Date.now();

      const text = (await node.locator(Selectors.messageText).allInnerTexts()).join("\n").trim();
      if (!text) continue;

      // Message IDs are not exposed reliably; we create a stable-ish ID from pre+text+direction.
      const id = `${direction}:${hashish(pre + "|" + text)}`;
      out.push({
        id,
        chatId: "__open_chat__",
        direction,
        text,
        timestampMs: ts,
      });
    }

    return out;
  }

  private mustPage(): Page {
    if (!this.page) throw new Error("WhatsApp client not started.");
    return this.page;
  }
}

function parseTimestampFromPrePlainText(pre: string): number | null {
  // Example formats seen:
  // "[10:43, 19/03/2026] Mum: message"
  // We parse "HH:MM, DD/MM/YYYY" in local timezone as best effort.
  const m = pre.match(/\[(\d{1,2}):(\d{2}),\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\]/);
  if (!m) return null;
  const [, hh, mm, dd, mo, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mm), 0, 0);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function hashish(s: string): string {
  // Small non-crypto hash for IDs; ok for dedupe within this app.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

