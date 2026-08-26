#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "[1/3] Backend…"
cd backend
[ ! -d node_modules ] && npm install --no-audit --no-fund
[ ! -f .env ] && cp .env.example .env
cd ..

echo "[2/3] Frontend…"
cd frontend
[ ! -d node_modules ] && npm install --no-audit --no-fund
# Always proxy via Vite. A leftover VITE_API_URL=http://localhost:4000
# causes "Failed to fetch" when the API is still starting.
printf 'VITE_API_URL=\n' > .env
cd ..

echo "[3/3] Starting API then website…"
(cd backend && npm run dev) &

echo "Waiting for http://127.0.0.1:4000/api/health …"
for i in $(seq 1 45); do
  if curl -sf http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo "API ready."
    break
  fi
  sleep 2
done

(cd frontend && npm run dev) &
echo ""
echo "  Store:  http://localhost:5173"
echo "  Admin:  http://localhost:5173/admin"
echo "  Login:  admin@hushae.local"
echo "  Pass:   admin123"
echo ""
wait
