// NOTE: WhatsApp Web DOM changes frequently; keep selectors centralized.

export const Selectors = {
  // Landing / login
  qrCanvas: "canvas",

  // Main app shell
  appLoadedMarker: 'div[role="application"]',

  // Search for chat
  chatSearchButton: 'button[aria-label="Search or start new chat"]',
  chatSearchInput: 'div[contenteditable="true"][data-tab="3"]',

  // Chat list items
  chatList: 'div[role="grid"]',

  // Chat header (to confirm we opened the right chat)
  chatTitle: 'header span[dir="auto"]',

  // Chat header menu (for mark-as-unread via menu)
  chatHeaderMenuButton: 'header [aria-label="Chat menu"], header [aria-label="More options"]',
  chatHeaderMenuUnreadItem: 'div[role="menuitem"]:has-text("Mark as unread")',

  // Message composer + send
  composer: 'footer div[contenteditable="true"][role="textbox"]',
  sendButton: 'button[aria-label="Send"]',

  // Messages
  // WhatsApp uses message-in/message-out wrappers
  // We support both legacy class-based bubbles and newer testid-based containers.
  messageIn: "div.message-in, div[data-testid='msg-container']",
  messageOut: "div.message-out, div[data-testid='msg-container']",
  messageText: "span.selectable-text, span[dir='ltr'], span[dir='auto']",
  copyableText: "div.copyable-text, div[data-testid='msg-container']",
};

