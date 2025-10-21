#!/usr/bin/env bash
set -e
ROOT=$(pwd)
LOG=debug-local.log
echo "Debug run at $(date)" > $LOG

echo "1) Node version" | tee -a $LOG
node -v 2>&1 | tee -a $LOG

echo "2) NPM version" | tee -a $LOG
npm -v 2>&1 | tee -a $LOG

echo "3) Install dependencies (npm ci)" | tee -a $LOG
npm ci 2>&1 | tee -a $LOG || { echo "npm ci failed" | tee -a $LOG; exit 1; }

echo "4) Show npm scripts" | tee -a $LOG
npm run --silent 2>&1 | tee -a $LOG || true

echo "5) Typecheck (if tsconfig exists)" | tee -a $LOG
if [ -f tsconfig.json ]; then
  npx tsc --noEmit 2>&1 | tee -a $LOG || echo "tsc reported errors" | tee -a $LOG
else
  echo "no tsconfig.json, skipping typecheck" | tee -a $LOG
fi

echo "6) Build" | tee -a $LOG
npm run build 2>&1 | tee -a $LOG || echo "build failed (captured)" | tee -a $LOG

echo "7) Dev start (background for 8s health check)" | tee -a $LOG
if npm run | grep -q "dev"; then
  (npm run dev &) 2>&1 | tee -a $LOG || true
  sleep 8
  echo "dev process snapshot:" | tee -a $LOG
  ps aux | head -n 20 | tee -a $LOG
else
  echo "no dev script defined, skipping" | tee -a $LOG
fi

echo "8) Vite CSS check (search for styles.css imports)" | tee -a $LOG
grep -R --line-number "styles.css" . || true

echo "Debug finished. Log: $ROOT/$LOG"
