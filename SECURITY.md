# HUSHAE — Security posture & credential placement

Written at the end of Sprint 2M Part B. Every statement here was **probed
against a running server**, not read off the source. Where something is
unverified it says so.

---

## 1. Where credentials go

Nothing below needs new code. The wiring exists; only the values are missing.

### 1.1 SMTP (email)

Emails are currently a **no-op**: password reset, email verification, order
confirmations and review/loyalty notifications all return an honest 503 rather
than pretending to send. `backend/src/utils/mailer.js` and every template are
already written.

Set these as **Vercel environment variables** (Project → Settings →
Environment Variables), never in a committed file:

| Variable | Example | Notes |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | `465` if using SSL |
| `SMTP_SECURE` | `false` | `true` only for port 465 |
| `SMTP_USER` | `orders@hushae.pk` | |
| `SMTP_PASS` | *app password* | Gmail/Workspace requires an **App Password**, not the account password |
| `SMTP_FROM` | `HUSHAE <orders@hushae.pk>` | |
| `ADMIN_ALERT_EMAIL` | `owner@hushae.pk` | where new-order alerts land |

`backend/src/utils/accountPolicy.js` checks
`SMTP_HOST && SMTP_USER && SMTP_PASS` to decide whether email features are
available, so all three must be present or the app correctly stays in no-op
mode.

After setting them: redeploy, then confirm a password-reset request returns
200 instead of 503.

### 1.2 Analytics

**Verified present and working** (they read from settings and load only after
cookie consent — `frontend/src/components/Analytics.jsx` refuses to load
anything until `hushae.consent` is stored, which is the privacy-safe default):

| Platform | Setting key | Ready |
|---|---|---|
| Google Analytics 4 | `integrations.analytics.gaId` | ✅ wired |
| Google Tag Manager | `integrations.analytics.gtmId` | ✅ wired |
| Meta Pixel | `integrations.analytics.metaPixelId` | ✅ wired |
| TikTok Pixel | `integrations.analytics.tiktokPixelId` | ✅ wired |
| **Microsoft Clarity** | — | ❌ **not wired** |

**Microsoft Clarity is NOT implemented.** There is no `clarity` key in the
Settings schema and no loader in `Analytics.jsx`. This was checked by grepping
both files; it is a genuine gap, not an oversight in this document. Adding it
is a small change (one settings field + one loader block following the same
consent-gated pattern as the others) and has deliberately not been made,
because Part B was instructed not to touch analytics wiring.

Where the merchant enters the IDs: **Admin → Integrations**
(`/admin/apps`, `frontend/src/admin/Apps.jsx`).

The CSP already permits all four origins, so no header change is needed when
the IDs are added.

### 1.3 Payment gateways

Entered in **Admin → Payments** (`/admin/payments`) and stored in
`settings.integrations.payments`. As of Sprint 2M these are **redacted from
the public API** — see finding 1 below. Enter them with confidence.

---

## 2. Audit results — Sprint 2M Part B

### Verified correct (no change needed)

| Area | Evidence |
|---|---|
| Password storage | bcrypt cost 10, never compared in plaintext |
| Privilege escalation | A JWT forged with `role:'admin'` for a real customer was **403** on `/cms/pages`, `/orders/manage`, `/backup`. `adminOnly` re-reads the user from the DB and does not trust the claim. |
| NoSQL injection | `{"email":{"$gt":""},"password":{"$gt":""}}` → 401, not a bypass. `middleware/sanitize.js` strips `$`-prefixed and dotted keys from body, query and params globally. |
| Login brute force | 429 after 12 attempts / 10 min / IP. *An earlier 10-attempt probe passed only because 10 < 12 — the boundary was re-tested.* |
| OTP | DB-backed resend cooldown, 5 wrong guesses per code |
| File upload | mime allow-list, 8 MB single / 45 MB total, admin-only |
| CSRF | No cookies anywhere; auth is a `Bearer` header, so classic CSRF does not apply |
| CORS | Origin is reflected, but `allow-credentials` is **not** set and auth is header-based, so a hostile origin cannot read an authenticated response. Confirmed: evil origin → 401. |
| Secrets in git | No `.env` committed, no hardcoded keys, no insecure JWT fallback |
| Stack traces | Never returned |

### Fixed in Sprint 2M Part B

**Finding 1 — public `/api/settings` served every secret.** *(highest severity)*
The endpoint is public by necessity and returned the entire 23 KB document
unredacted, including `safepay.secret`, `safepay.apiKey`,
`jazzcash.password`, `jazzcash.integritySalt`, `email.pass` and
`storefrontLock.password`. All empty at the time, which is the only reason it
was not already an incident — the first live key pasted into the admin panel
would have been published to every visitor.
Fixed by redacting nine paths to `''` (shape preserved so no frontend
optional-chain changes branch), adding derived booleans (`configured`,
`hasPassword`) so the storefront can still tell a gateway is set up, and adding
an admin-only `GET /api/settings/admin` for the four screens that edit them.
Verified by planting real-looking secrets: 0 of 7 appear publicly, all still
visible to an admin.

**Finding 2 — the storefront password gate was decorative.**
`StoreLock.jsx` compared the typed password in the browser against a value the
public API published, so anyone could read it and walk in. It also rendered the
whole shop *behind* the overlay (reachable via dev tools or a screen reader)
and stored the real password in `localStorage`.
Fixed: verification moved to `POST /api/settings/unlock`, rate limited 10 / 10
min / IP; children no longer rendered behind the gate; a flag is stored instead
of the password.

**Finding 3 — 500s echoed internal library messages.**
`{"password":{"$ne":"x"}}` returned `Illegal arguments: object, string` — a
bcrypt internal. Deliberate 4xx messages still pass through (they are written
for the user); unexpected 500s now return a generic line and log the real error.

**Finding 4 — unlimited newsletter inserts.** 8/8 POSTs returned 201 from one
IP. Now 10 per hour per IP.

### Added — Content Security Policy

The one missing header. Built from a measured inventory of every external
origin the app actually uses, not a template. Shipped as
**`Content-Security-Policy-Report-Only`** on purpose: a CSP that blocks a
payment script is worse than no CSP. Promote to enforcing after observing real
traffic for violations.

`'unsafe-inline'` is required for `script-src` and `style-src` because the
analytics bootstraps inject inline snippets and framer-motion writes inline
styles. `index.html` itself contains zero inline script or style.

---

## 3. Known and accepted

- **Rate limiting is per serverless instance** (in-memory `Map`). A determined
  attacker spreading requests across instances gets a higher effective limit.
  A shared store (Redis/Upstash) would fix it; not worth the dependency at
  this traffic level, and the DB-backed OTP cooldown is not affected.
- **`cors({ origin: true })`** reflects any origin. Safe today for the reasons
  above; if cookie auth is ever introduced this **must** be tightened first.
- **MongoDB password rotation** was chosen in an earlier sprint and a new
  password was never supplied.
- **`settings.contactEmail`** is still `care@veloura.pk`.

---

## Credential rotation — 2026-08-16 (pre-launch)

Performed ahead of the public launch:

1. **Admin password** — rotated via `POST /api/auth/change-password`. The old
   pre-launch password no longer authenticates. New value stored only as the
   Vercel `ADMIN_PASSWORD` environment variable.
2. **JWT_SECRET** — rotated to a fresh 64-char hex on Vercel; all previously
   issued session tokens were invalidated.
3. **Repo hygiene** — `backend/.env.example` now ships placeholders only (it
   previously contained the live MongoDB connection string, JWT secret and
   admin password). The README no longer documents the admin password location
   as the repo.

Still to do (requires access outside this repo):
- **MongoDB Atlas password** — rotate the database user password at
  cloud.mongodb.com → Database Access, then update the Vercel `MONGODB_URI`
  env var to match. (The old Atlas URI exists in git history.)
- Consider scrubbing git history (e.g. `git filter-repo`) if full removal of
  historical secret strings is required.
