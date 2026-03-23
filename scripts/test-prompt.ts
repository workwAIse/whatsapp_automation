import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { buildReplySystemPrompt, buildReplyUserPrompt } from "../src/ai/prompts";
import { OpenAIClient } from "../src/ai/openaiClient";
import { loadConfig } from "../src/config";
import type { ChatMessage } from "../src/policy/types";

const envLocal = path.join(process.cwd(), ".env.local");
const envDefault = path.join(process.cwd(), ".env");
dotenv.config({ path: fs.existsSync(envLocal) ? envLocal : envDefault });

const cfg = loadConfig(process.env);
const ai = new OpenAIClient({ baseUrl: cfg.AI_BASE_URL, apiKey: cfg.AI_API_KEY });

async function test(label: string, messages: ChatMessage[]) {
  const content = await ai.chatCompletionsCreate({
    model: cfg.AI_MODEL,
    messages: [
      { role: "system", content: buildReplySystemPrompt() },
      { role: "user", content: buildReplyUserPrompt({ chatName: "Mama", messages }) },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });
  console.log(`\n--- ${label} ---`);
  console.log(JSON.parse(content));
}

const msg1: ChatMessage = {
  id: "1", chatId: "c", direction: "inbound", from: "mama", timestampMs: 1000,
  text: "Hey Schatz, mir geht's garnicht gut und das weißt du. Nieren, Zähne und der Diabetes. Gestern war jch erst wieser beim Arzt. Ich möchte, dass du das verstehst und da jetzt auch für mich da bist. Da musst du auch Verantwortung zeigen. Wir müssen ganz dringend telefonieren.",
};

const msg2: ChatMessage = {
  id: "2", chatId: "c", direction: "inbound", from: "mama", timestampMs: 2000,
  text: "Jetzt ist auch mein Drucker kaputt. Da steht Gerät nicht verfügbar. Du musst mir das unbedingt bei Anydesk helfen. Heute, das ist ganz wichtig. Ich kann um 17:30 Uhr und muss dann zu Edith. Ich muss den weg und die Unterlagen für morgen für den Arzt ausdrucken",
};

const reply1: ChatMessage = {
  id: "3", chatId: "c", direction: "outbound", from: "alex", timestampMs: 3000,
  text: "Das mit den Nieren und den Zähnen klingt wirklich belastend, das ist gerade viel auf einmal. Bin gerade unterwegs, aber ich rufe dich an sobald ich kann.",
};

const msg3: ChatMessage = {
  id: "4", chatId: "c", direction: "inbound", from: "mama", timestampMs: 4000,
  text: "Alexander! Du nimmst das garnicht ernst. Für mich ist das ein sehr dringendes Anliegen",
};

const reply2: ChatMessage = {
  id: "5", chatId: "c", direction: "outbound", from: "alex", timestampMs: 5000,
  text: "Das ist ärgerlich mit dem Drucker, gerade wenn du die Unterlagen für den Arzt brauchst. Bin gerade unterwegs, ich melde mich wegen Anydesk sobald ich kann.",
};

(async () => {
  await test("Message 1: Health + call request", [msg1]);
  await test("Message 2: Printer (after reply to msg1)", [msg1, reply1, msg2]);
  await test("Message 3: Frustration follow-up", [msg1, reply1, msg2, reply2, msg3]);
})();
