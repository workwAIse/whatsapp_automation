# Google Cloud (GCP) e2-micro Deployment

Deploy mama_whatsapp to GCP's always-free e2-micro instance (1 vCPU, 1 GB RAM). The app is tuned for low memory.

## Prerequisites

- Google Cloud account (sign up at [cloud.google.com](https://cloud.google.com))
- Credit card for verification (free-tier resources are not charged)

## Phase 1: Provision VM

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable Compute Engine API
4. Create a VM instance:
   - **Name**: mama-whatsapp (or any)
   - **Region**: Pick one with free e2-micro (e.g. us-central1, us-east1)
   - **Machine type**: e2-micro (1 vCPU, 1 GB memory) — Always Free eligible
   - **Boot disk**: Ubuntu 22.04 LTS, 10 GB
   - **Firewall**: Allow HTTP/HTTPS traffic (optional), ensure SSH (port 22) is allowed
5. Add your SSH key (or use OS Login)
6. Click Create, note the **external IP**

## Phase 2: Server Setup

### 2.1 Connect and add swap (required for 1 GB RAM)

```bash
# Replace with your GCP username (often your email or 'ubuntu' depending on image)
gcloud compute ssh mama-whatsapp --zone=us-central1-a
# Or: ssh YOUR_USER@EXTERNAL_IP
```

On the VM:

```bash
# Add 1 GB swap so Chromium + Node fit in memory
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h  # verify swap is active
```

### 2.2 Install Chromium dependencies

```bash
sudo apt update
sudo apt install -y libgbm1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libnss3 libxss1 libx11-xcb1 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libxshmfence1 fonts-liberation
```

### 2.3 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.4 Deploy the app

**Option A: Git**

```bash
git clone <your-repo-url> ~/mama_whatsapp
cd ~/mama_whatsapp
npm install
```

**Option B: rsync from Mac**

From your Mac:

```bash
rsync -avz --exclude node_modules --exclude .wa-session --exclude .data --exclude .env.local \
  /Users/alexbuchel/projects/mama_whatsapp/ YOUR_USER@EXTERNAL_IP:~/mama_whatsapp/
```

On the VM:

```bash
cd ~/mama_whatsapp
npm install
```

### 2.5 Create .env.local

On the VM:

```bash
nano ~/mama_whatsapp/.env.local
```

Paste (adjust values):

```
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=your_key
AI_MODEL=gpt-4o-mini
MUM_CHAT_NAME=Mom
SELF_CHAT_NAME=Me
DRY_RUN=false
DB_PATH=./.data/mama.sqlite
WHATSAPP_USER_DATA_DIR=./.wa-session
```

### 2.6 First-time WhatsApp auth

SSH in and run once interactively:

```bash
cd ~/mama_whatsapp
./deploy/run-tick.sh
```

When the QR code appears, scan it from your phone. After success, the session is saved.

## Phase 3: Schedule with cron

```bash
mkdir -p ~/mama_whatsapp/logs
crontab -e
```

Add (adjust username/path):

```
0 * * * * /home/YOUR_USER/mama_whatsapp/deploy/run-tick.sh >> /home/YOUR_USER/mama_whatsapp/logs/tick.log 2>&1
5 21 * * * /home/YOUR_USER/mama_whatsapp/deploy/run-summary.sh >> /home/YOUR_USER/mama_whatsapp/logs/summary.log 2>&1
```

## Phase 4: Disable Mac scheduling

On your Mac:

```bash
launchctl unload ~/Library/LaunchAgents/com.mama.whatsapp.tick.plist
launchctl unload ~/Library/LaunchAgents/com.mama.whatsapp.summary.plist
```

## Memory tuning (already applied)

The code uses Chromium args and NODE_OPTIONS to stay within ~1 GB:
- Chromium: `--disable-gpu`, `--disable-dev-shm-usage`, `--js-flags=--max-old-space-size=128`, etc.
- Node: `NODE_OPTIONS=--max-old-space-size=256` in deploy scripts
- Swap: 1 GB (see Phase 2.1)

## Session migration (optional)

To reuse your Mac session:

1. On Mac: `rsync -avz .wa-session/ YOUR_USER@EXTERNAL_IP:~/mama_whatsapp/.wa-session/`
2. On VM: run `./deploy/run-tick.sh`; if it connects without QR, migration worked

## Rollback

To switch back to Mac:
1. Reload launchd plists
2. Remove cron entries on GCP
3. Run locally again
