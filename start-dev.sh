#!/usr/bin/env bash
# HUSHAE — one-command local start (macOS/Linux)
cd "$(dirname "$0")"

(cd backend && [ ! -d node_modules ] && npm install --no-audit --no-fund; [ ! -f .env ] && cp .env.example .env)
(cd frontend && [ ! -d node_modules ] && npm install --no-audit --no-fund; [ ! -f .env ] && cp .env.example .env)

(cd backend && npm run dev) &
sleep 4
(cd frontend && npm run dev) &
echo "HUSHAE — Storefront: http://localhost:5173 | Admin: http://localhost:5173/admin"
wait
