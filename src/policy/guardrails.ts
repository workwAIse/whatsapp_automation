const HARD_BLOCK_PATTERNS: Array<{ tag: string; re: RegExp }> = [
  // Scheduling/meetings
  { tag: "meeting", re: /\b(meeting|meet up|meetup|appointment|schedule)\b/i },
  // Calls/promises
  { tag: "call", re: /\b(call you|phone you|give you a call|ring you)\b/i },
  { tag: "promise_call", re: /\b(i('| a)m|i will)\s+(call|phone)\b/i },
  { tag: "promise", re: /\b(i promise|i will definitely|i swear)\b/i },
  // Money / payments
  { tag: "money", re: /\b(send money|transfer|bank|paypal|venmo|pay you)\b/i },
  // Legal/medical commitments
  { tag: "legal", re: /\b(lawyer|legal|court|contract)\b/i },
  { tag: "medical", re: /\b(doctor|hospital|prescription|diagnosis)\b/i },
];

export type GuardrailResult =
  | { ok: true; tags: string[] }
  | { ok: false; tags: string[]; reason: string; safeReply: string };

export function checkHardBlocks(inboundText: string): GuardrailResult {
  const hits = HARD_BLOCK_PATTERNS.filter((p) => p.re.test(inboundText)).map((p) => p.tag);
  if (hits.length === 0) return { ok: true, tags: [] };

  return {
    ok: false,
    tags: hits,
    reason: "Inbound message appears to request commitments we must not make automatically.",
    safeReply:
      "I saw this — I’m not able to schedule things or promise calls by myself. Can you please ask Alex directly so he can confirm?",
  };
}

