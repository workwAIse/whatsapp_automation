export type Direction = "inbound" | "outbound";

export type ChatMessage = {
  id: string;
  chatId: string;
  chatName?: string;
  direction: Direction;
  from?: string;
  text: string;
  timestampMs: number;
};

export type ReplyDecision =
  | {
      action: "reply";
      replyText: string;
      reason: string;
      tags: string[];
    }
  | {
      action: "skip";
      reason: string;
      tags: string[];
    };

