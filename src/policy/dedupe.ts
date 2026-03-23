import crypto from "node:crypto";

export function normalizeTextForDedupe(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function messageHash(input: {
  chatId: string;
  direction: "inbound" | "outbound";
  text: string;
  timestampMs?: number; // optional; omit for stable hash across replays
}): string {
  const normText = normalizeTextForDedupe(input.text);
  const payload = JSON.stringify({
    chatId: input.chatId,
    direction: input.direction,
    text: normText,
    timestampBucket: input.timestampMs ? Math.floor(input.timestampMs / 60_000) : null,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

