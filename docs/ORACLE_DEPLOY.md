# Oracle Cloud Deployment

Deploy mama_whatsapp to an Oracle Cloud Always Free ARM VM so it runs 24/7 independent of your Mac.

## Prerequisites

- Oracle Cloud account (sign up at [cloud.oracle.com](https://cloud.oracle.com))
- Credit card for verification (Always Free resources are never charged)

## Phase 1: Provision VM

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com)
2. Create a Compute instance:
   - **Image**: Ubuntu 22.04
   - **Shape**: VM.Standard.A1.Flex (ARM Ampere)
   - **OCPUs**: 1
   - **Memory**: 6 GB
   - Add your SSH public key
3. Open port 22 in the instance's security list (VCN) for SSH
4. Note the **public IP** of the instance

## Phase 2: Server Setup

### 2.1 Connect and install Chromium dependencies

Puppeteer ships Chromium but Ubuntu needs shared libraries:

```bash
ssh ubuntu@<PUBLIC_IP>

sudo apt update
sudo apt install -y libgbm1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libnss3 libxss1 libx11-xcb1 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libxshmfence1 fonts-liberation
```

### 2.2 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.3 Deploy the app

**Option A: Git (if project is in a repository)**

```bash
git clone <your-repo-url> ~/mama_whatsapp
cd ~/mama_whatsapp
npm install
```

**Option B: rsync from Mac**

From your Mac:

```bash
rsync -avz --exclude node_modules --exclude .wa-session --exclude .data --exclude .env.local \
  /Users/alexbuchel/projects/mama_whatsapp/ ubuntu@<PUBLIC_IP>:~/mama_whatsapp/
```

Then on the server:

```bash
cd ~/mama_whatsapp
npm install
```

### 2.4 Create .env.local

On the server, create `~/mama_whatsapp/.env.local`:

```bash
# Required
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_key
AI_MODEL=gpt-4o-mini
MUM_CHAT_NAME=Mom
SELF_CHAT_NAME=Me

# Server settings
DRY_RUN=false
DB_PATH=./.data/mama.sqlite

# Optional: persistent session path (default: ./.wa-session)
# On server, use absolute path: /home/ubuntu/.mama-whatsapp/wa-session
WHATSAPP_USER_DATA_DIR=./.wa-session
```

### 2.5 First-time WhatsApp auth

SSH in and run once interactively to scan the QR code:

```bash
cd ~/mama_whatsapp
HEADLESS=true npm run tick
```

`qrcode-terminal` will render the QR in the terminal. Scan it from your phone. After success, the session is saved to `WHATSAPP_USER_DATA_DIR` and persists across restarts. Future runs are fully unattended.

## Phase 3: Schedule with cron

```bash
crontab -e
```

Add (replace `ubuntu` with your username if different):

```
# Hourly tick
0 * * * * /home/ubuntu/mama_whatsapp/deploy/run-tick.sh >> /home/ubuntu/mama_whatsapp/logs/tick.log 2>&1

# Daily summary at 21:05
5 21 * * * /home/ubuntu/mama_whatsapp/deploy/run-summary.sh >> /home/ubuntu/mama_whatsapp/logs/summary.log 2>&1
```

Create the logs directory:

```bash
mkdir -p ~/mama_whatsapp/logs
```

## Phase 4: Disable Mac scheduling

On your Mac:

```bash
launchctl unload ~/Library/LaunchAgents/com.mama.whatsapp.tick.plist
launchctl unload ~/Library/LaunchAgents/com.mama.whatsapp.summary.plist
```

## Session migration (optional)

To reuse your existing Mac session instead of a new QR scan:

1. On Mac: `rsync -avz .wa-session/ ubuntu@<PUBLIC_IP>:~/mama_whatsapp/.wa-session/`
2. On server: ensure `.wa-session` has correct permissions
3. Run `npm run tick`; if it connects without QR, migration succeeded

If WhatsApp rejects the session (e.g. different IP), delete `.wa-session` on the server and perform a fresh QR scan.

## Rollback

To switch back to Mac:

1. Reload launchd plists on Mac
2. Stop cron on Oracle: `crontab -r` or remove the mama_whatsapp lines
3. Run locally again

The SQLite DB and session on the server can be archived or ignored.
