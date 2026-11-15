#!/usr/bin/env bash
# One-shot setup for hosting Foghorn on a boat.dev sandbox.
#   boat new --name foghorn-live --host 8787:public --file setup.sh=deploy/boat-setup.sh --setup-file deploy/boat-setup.sh
set -euo pipefail
cd /home/user
rm -rf foghorn && git clone --depth 1 https://github.com/vnmoorthy/foghorn.git
cd foghorn/web
npm ci --no-audit --no-fund
npx vite build
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
pkill -f "server/index.ts" || true
nohup env PORT=8787 NODE_ENV=production FOGHORN_ON_BOAT=1 FOGHORN_NO_VM=1 CHROME_PATH="$CHROME" npx tsx server/index.ts > /home/user/foghorn.log 2>&1 &
for i in $(seq 1 60); do curl -sf localhost:8787/api/status >/dev/null && { echo "FOGHORN_READY"; exit 0; }; sleep 2; done
echo "FOGHORN_START_FAILED"; tail -40 /home/user/foghorn.log; exit 1
