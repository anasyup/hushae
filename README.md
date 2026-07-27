# HUSHAE — Second Skin, First Choice.

A complete, full-stack, premium innerwear e-commerce platform (Phase 1: Pakistan).
React storefront + admin console · Express REST API · MongoDB Atlas.

**Live:** [https://hushae.vercel.app](https://hushae.vercel.app)

---

## What's inside

| Layer | Tech |
|---|---|
| Storefront | React 18, Vite, Tailwind CSS, Framer Motion, Lucide icons |
| Admin console | Same React app at `/admin` — role-guarded, Shopify-style UI |
| Backend | Node.js, Express, Mongoose, JWT auth, bcrypt hashing |
| Database | MongoDB Atlas |

```
hushae/
├── api/          Vercel serverless entry (wraps Express)
├── backend/      Express API, models, routes
├── frontend/     React storefront + admin dashboard (English only)
├── start-dev.bat ← Windows: double-click to run everything locally
├── start-dev.sh  ← macOS/Linux
└── README.md
```

---

## Quick start (Windows)

1. Install **Node.js 20+** — https://nodejs.org (LTS)
2. Copy `backend/.env.example` → `backend/.env` and fill in your real values (see below)
3. Double-click **`start-dev.bat`**
4. Wait for the two terminal windows (first run installs npm packages)
5. Open **http://localhost:5173**

> If `MONGODB_URI` is empty in `backend/.env`, an embedded in-memory MongoDB starts automatically (data resets on restart). Set the Atlas connection string in `.env` for shared/persistent data.

### Manual start (two terminals)

```bat
cd hushae\backend
copy .env.example .env
notepad .env       :: set your MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm install
npm run dev        :: API on http://localhost:4000
```

```bat
cd hushae\frontend
npm install
npm run dev        :: storefront on http://localhost:5173
```

---

## Logins & testing

**Live admin console** → https://hushae.vercel.app/admin

Login credentials are provisioned per-deployment. The values in `backend/.env.example` are **placeholders only** — they are not real credentials. Set your own via env vars before running locally.

### Local seed (fresh empty database only)

If you want the demo catalog inserted on first run:

1. Set in `backend/.env`:
   ```
   ADMIN_EMAIL=admin@hushae.pk
   ADMIN_PASSWORD=<a-strong-password-you-choose>
   SEED_ON_START=true
   ```
2. Make sure the connected DB is completely empty (no users, no products).
3. Start the backend — 10 categories + demo products get inserted, admin user is created.
4. **Turn `SEED_ON_START=false`** afterwards so it never runs again.

---

## MongoDB Atlas (production)

1. Create a free cluster at https://cloud.mongodb.com
2. Add a database user + Network Access (allow your Vercel IP range or 0.0.0.0/0)
3. Copy the connection string into `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/hushae
   ```
4. Deploy — same code, real database.

---

## API overview

```
Auth       POST /api/auth/login · POST /api/auth/change-password · POST /api/auth/change-username
Categories GET /api/categories · POST/PUT/DELETE (admin)
Products   GET /api/products[?gender&category&tier&q&sort&tag] · GET /api/products/:slug
           GET /api/products/trending · GET /api/products/:slug/related
           POST/PUT/DELETE (admin) · PATCH /api/products/bulk · PATCH /api/products/:id/stock
Orders     POST /api/orders · GET /api/orders/track?orderNumber=&phone=
           GET/PATCH /api/orders/admin/* (admin, incl. verify-cod, tracking, notes)
Admin      GET /api/admin/dashboard · GET /api/admin/customers · GET /api/admin/insights
Settings   GET /api/settings · PUT /api/settings (admin)
Wishlist   GET/POST/DELETE /api/wishlist[/:productId] (auth)
Customer   GET /api/customer/orders · GET/PUT /api/customer/profile
Collections GET /api/collections · admin CRUD
Payments   POST /api/payments/initiate/:orderId · callbacks for JazzCash + SafePay
Backup     GET /api/backup/download · POST /api/backup/restore (admin)
SEO        GET /robots.txt · GET /sitemap.xml (dynamic)
```

Server-side guarantees: prices + stock are recomputed from the database at checkout (client prices are never trusted), stock is decremented atomically, out-of-stock lines are rejected with specific error reasons, and order numbers are unique.

---

## Design system

- Colours: obsidian `#111111`, alabaster `#F7F5F1`, cream `#EFEAE3`, sage `#8F9C8B`, clay `#B3927E`
- Storefront fonts: Cormorant Garamond (display) + Inter (UI)
- Admin fonts: Inter throughout (Shopify-style, clean)
- Full-screen hero video, cursor-follow product zoom, auto-sliding featured marquee, mobile bottom nav, discreet-packaging branding

---

## Payments & shipping

- **COD** (default) · **JazzCash HPP** · **SafePay** (Visa/Mastercard)
- Real gateway signatures verified server-side; credentials pending business docs
- Flat PKR 350 shipping · Free over PKR 4,999 (editable in Admin → Shipping)
- 14-day exchange · Discreet, unmarked parcels always

---

## Deployment

- **Frontend + API:** Vercel (single project — `vercel.json` rewrites route `/api/*` to Express serverless, everything else to `index.html`)
- **Database:** MongoDB Atlas
- **Env vars on Vercel:** `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`

---

## Project scripts

| Location | Command | Purpose |
|---|---|---|
| `backend/` | `npm run dev` / `npm start` | API with/without watch |
| `backend/` | `npm run seed` | Seed a fresh empty Atlas DB (requires `SEED_ON_START=true` in newer builds) |
| `frontend/` | `npm run dev` | Storefront dev server |
| `frontend/` | `npm run build` | Production build |
| repo root | `start-dev.bat` / `start-dev.sh` | Boot both backend + frontend in one command |

---

Built with care — discreet always.
