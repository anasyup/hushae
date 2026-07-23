# V É L O U R A — Second Skin, First Choice.

A complete, full-stack, premium innerwear e-commerce platform (Phase 1: Pakistan).
React storefront + admin console · Express REST API · MongoDB Atlas-ready.

---

## What's inside

| Layer | Tech |
|---|---|
| Storefront | React 18, Vite, Tailwind CSS, Framer Motion, Lucide icons |
| Admin console | Same React app at `/admin` — separate visuals, role-guarded |
| Backend | Node.js, Express, Mongoose, JWT auth, bcrypt hashing |
| Database | MongoDB — **embedded** for zero-config local dev (no install needed), **Atlas** for staging/production |
| Catalog | 10 categories · **100 products** (women 50 / men 50) · 4 images each · tiers · fabric tech badges |

```
veloura/
├── backend/     Express API, models, seed (admin + settings + 10 categories + 100 products)
├── frontend/    Customer site + admin dashboard + i18n (EN/اردو) + cart/wishlist/recently-viewed
├── start-dev.bat   ← Windows: double-click to run everything
├── start-dev.sh    ← macOS/Linux
└── README.md
```

---

## Quick start (Windows)

1. Install **Node.js 20+** — https://nodejs.org (LTS)
2. Double-click **`start-dev.bat`**
3. Wait for the two windows (first run downloads embedded MongoDB ~90 MB once, plus npm packages)
4. Open **http://localhost:5173**

> The embedded database is in-memory: data resets when the API stops. For persistent data, set `MONGODB_URI` (below).

### Manual start (two terminals)

```bat
cd veloura\backend
copy .env.example .env
npm install
npm run dev        → API on http://localhost:4000
```

```bat
cd veloura\frontend
copy .env.example .env
npm install
npm run dev        → Storefront on http://localhost:5173
```

---

## Logins & testing

**Admin console** → http://localhost:5173/admin
- Email: `admin@veloura.pk` · Password: `VelouraAdmin@123` (from `backend/.env` — change before launch)

**Try the full flow**
1. Shop → open a product → add to cart → checkout as **guest**
2. Use any phone like `0300 1234567`, pick COD or JazzCash
3. Copy your order number (`VL-YYYYMMDD-XXXXXX`) from the confirmation page
4. Track it at `/track` (order number + phone)
5. In `/admin/orders` move it through statuses — the customer timeline updates instantly
6. Low-stock items (≤5) appear on the admin dashboard automatically

---

## Environment

`backend/.env`:

| Key | Default | Notes |
|---|---|---|
| `PORT` | `4000` | API port |
| `MONGODB_URI` | *(empty)* | Empty → embedded dev DB. Atlas string for real DB (below) |
| `JWT_SECRET` | dev value | **Change for production** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@veloura.pk` / `VelouraAdmin@123` | Seed creates this admin |

`frontend/.env`: `VITE_API_URL=http://localhost:4000` (in local dev the Vite proxy also works)

### MongoDB Atlas (persistent data)

1. Create a free cluster at https://cloud.mongodb.com
2. Database user + Network Access (allow your IP / 0.0.0.0/0 for servers)
3. Copy the connection string into `backend/.env`:
   `MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/veloura`
4. Seed it once: `cd backend && npm run seed`
5. `npm run dev` — same code, real database.

---

## API overview

```
Auth       POST /api/auth/register · POST /api/auth/login · GET /api/auth/me
Categories GET /api/categories[?gender=] · POST/PUT/DELETE (admin)
Products   GET /api/products[?gender&category&tier&size&color&badge&q&sort] · GET /api/products/:slug
           GET /api/products/admin/list · POST/PUT/DELETE (admin, soft delete)
Orders     POST /api/orders · GET /api/orders/track?orderNumber=&phone=
           GET /api/orders/admin · GET /api/orders/admin/:id
           PATCH /api/orders/admin/:id/status · PATCH /api/orders/admin/:id/payment
Admin      GET /api/admin/dashboard · GET /api/admin/customers
Settings   GET /api/settings · PUT /api/settings (admin)
Wishlist   GET/POST/DELETE /api/wishlist[/:productId] (auth)
Customer   GET /api/customer/orders · GET/PUT /api/customer/profile
```

Server-side guarantees: prices & stock are recomputed from the database at checkout (client prices are never trusted), stock is decremented atomically, out-of-stock lines are rejected, and order numbers are unique (`VL-YYYYMMDD-XXXXXX`).

---

## Design system — "Silk Eclipse"

Obsidian `#0D0D0D` · Alabaster `#FBF9F6` · Satin Silk `#E6DCD2` · Smoked Ash `#69625F` · Olive Sage `#8F9C8B`
Tenor Sans (display) · Inter (UI) · Noto Nastaliq Urdu (اردو labels, header toggle)
Blur-up image loading, skeleton shimmer, drawer cart, free-shipping progress — no dark mode, no emojis, no cheap motion.

---

## Payments & shipping (v1)

- **COD / JazzCash / EasyPaisa / Bank Transfer** — method is stored with the order; online methods stay `Pending` until admin verifies and marks `Paid` (optional transaction ID field at checkout).
- Flat shipping **PKR 350** · **Free over PKR 4,999** (both editable in Admin → Settings).
- No coupons, no WhatsApp confirmations, no dark mode in v1 (by design).

---

## Deployment notes

- **Database:** MongoDB Atlas (steps above)
- **Backend:** Render/Railway — start command `node src/server.js`, set all env vars, `MONGODB_URI` required
- **Frontend:** Vercel — build `npm run build`, output `dist`, set `VITE_API_URL` to the backend URL,
  and add a SPA rewrite (`/* → /index.html`) so client routes work on refresh
- Product imagery currently uses verified Unsplash placeholders — swap URLs (or upload finals) per product in the admin. No imagery is bundled/locally hosted.

---

## Project scripts

| Location | Command | Purpose |
|---|---|---|
| `backend/` | `npm run dev` / `npm start` | API with/without auto-reload |
| `backend/` | `npm run seed` | Seed an Atlas/prod database (`MONGODB_URI` required) |
| `frontend/` | `npm run dev` | Storefront dev server |
| `frontend/` | `npm run build` / `npm run preview` | Production build / preview |

Built with care — discreet always. 🖤 *(this emoji stays out of the UI, promise)*
