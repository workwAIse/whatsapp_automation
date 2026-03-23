# mama_whatsapp

Automation that checks a specific WhatsApp chat (your mum) and drafts/sends replies via your OpenAI-compatible endpoint, with guardrails and a daily summary to your own chat.

## What this does (MVP)

- **Hourly**: open WhatsApp Web, read recent messages in `MUM_CHAT_NAME`, decide whether to reply, optionally send.
- **Daily**: generate a short summary of what happened today and send it to `SELF_CHAT_NAME`.

## Safety behavior

- **Reply window**: optional time window (09:00–21:00) — disabled by default; set `MAMA_REPLY_WINDOW_ENABLED=true` in `.env.local` to enable.
- **No duplicate replies**: records inbound messages and replies in SQLite.
- **Manual override**: if you replied manually after an inbound message, the bot skips replying to that inbound message.
- **Hard blocks**: tries to avoid commitments (meetings, calls, money, legal/medical commitments). If triggered, it sends a safe deflection.
- **Dry run**: default `DRY_RUN=true` means it will **not send** messages, only log what it would do.

## Setup

### 1) Install deps

```bash
npm install
```

### 2) Create your `.env`

```bash
cp .env.example .env
```

Fill in:
- `AI_BASE_URL` (must include `/v1`)
- `AI_API_KEY`
- `MUM_CHAT_NAME` (exact chat title as it appears in WhatsApp Web)
- `SELF_CHAT_NAME` (chat title where you want the daily summary)

### 3) First-time WhatsApp login

Run once with a visible browser so you can scan the QR code:

```bash
npm run tick
```

Once logged in, the session is stored in `WHATSAPP_USER_DATA_DIR` (default `./.wa-session`).

## Run

- **Hourly tick (one-shot)**:

```bash
npm run tick
```

- **Daily summary (one-shot)**:

```bash
npm run summary
```

## Enable actual sending

Set:

```bash
DRY_RUN=false
```

## macOS scheduling with `launchd`

### 1) Copy plists

```bash
mkdir -p ~/Library/LaunchAgents
cp launchd/com.mama.whatsapp.*.plist ~/Library/LaunchAgents/
```

### 2) IMPORTANT: Update paths in the plist files

The plist templates currently assume:
- repo path: `/Users/alexbuchel/projects/mama_whatsapp`
- npm path: `/usr/local/bin/npm`

If your paths differ, edit:
- `launchd/com.mama.whatsapp.tick.plist`
- `launchd/com.mama.whatsapp.summary.plist`

### 3) Load the jobs

```bash
launchctl load ~/Library/LaunchAgents/com.mama.whatsapp.tick.plist
launchctl load ~/Library/LaunchAgents/com.mama.whatsapp.summary.plist
```

To unload:

```bash
launchctl unload ~/Library/LaunchAgents/com.mama.whatsapp.tick.plist
launchctl unload ~/Library/LaunchAgents/com.mama.whatsapp.summary.plist
```

Logs:
- tick: `/tmp/mama_whatsapp_tick.*.log`
- summary: `/tmp/mama_whatsapp_summary.*.log`

## Server deployment

For 24/7 operation independent of your Mac:
- **Google Cloud (1 GB free)**: [docs/GCP_DEPLOY.md](docs/GCP_DEPLOY.md)
- **Oracle Cloud**: [docs/ORACLE_DEPLOY.md](docs/ORACLE_DEPLOY.md)

Repo: https://github.com/workwAIse/whatsapp_automation

## Notes / limitations

- This uses **unofficial WhatsApp Web automation**. It can break if WhatsApp changes UI and may carry account risk.
- If your Mac is **locked**, jobs still run. If it’s **asleep**, jobs pause until wake, then catch up on the next run.

