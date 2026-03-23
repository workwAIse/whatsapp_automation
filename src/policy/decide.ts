import { checkHardBlocks } from "./guardrails";
import { isWithinWindow, type TimeWindow } from "./timeWindow";
import type { ChatMessage, ReplyDecision } from "./types";

export type DecideInputs = {
  now: Date;
  /** When false, the time window check is skipped (reply anytime). */
  replyWindowEnabled: boolean;
  window: TimeWindow;
  inbound: ChatMessage;
  hasManualReplySinceInbound: boolean;
  alreadyRepliedToInbound: boolean;
  rateLimited: boolean;
};

export function decideReply(input: DecideInputs): ReplyDecision {
  if (input.inbound.direction !== "inbound") {
    return { action: "skip", reason: "Not an inbound message.", tags: ["not_inbound"] };
  }

  if (input.alreadyRepliedToInbound) {
    return { action: "skip", reason: "Already replied to this message.", tags: ["dedupe"] };
  }

  if (input.hasManualReplySinceInbound) {
    return {
      action: "skip",
      reason: "You already replied manually after this message.",
      tags: ["manual_reply_detected"],
    };
  }

  if (input.rateLimited) {
    return {
      action: "skip",
      reason: "Rate limit reached; will retry later.",
      tags: ["rate_limited"],
    };
  }

  if (input.replyWindowEnabled) {
    const within = isWithinWindow(input.now, input.window);
    if (!within) {
      return {
        action: "skip",
        reason: "Outside allowed reply window; will catch up later.",
        tags: ["outside_window"],
      };
    }
  }

  const guard = checkHardBlocks(input.inbound.text);
  if (!guard.ok) {
    return {
      action: "reply",
      replyText: guard.safeReply,
      reason: guard.reason,
      tags: ["guardrail_hard_block", ...guard.tags],
    };
  }

  return {
    action: "reply",
    replyText: "__LLM__", // placeholder; replaced by LLM reply generation
    reason: "Eligible for AI reply generation.",
    tags: ["eligible"],
  };
}

