# HUSHAE ADMIN PANEL — CURRENT STATE FORENSIC DOCUMENTATION

**Document Date:** 2026-08-25  
**Auditor:** Forensic Read-Only Audit  
**Classification:** REALITY DOCUMENT — NOT A SPECIFICATION  

---

## 1. DEPLOYMENT IDENTITY

| Field | Value |
|-------|-------|
| **Production URL** | https://hushae1.vercel.app/ |
| **Admin URL** | https://hushae1.vercel.app/admin |
| **Storefront URL** | https://hushae1.vercel.app/ |
| **Health Endpoint** | https://hushae1.vercel.app/api/health (HTTP 200) |
| **Deployed Commit SHA** | `049b5da5f7fb` (Phase 10 certification) |
| **Branch** | `agent/phase9-platform` |
| **Vercel Project ID** | `prj_PT3qTxo3balj0naeCNlztIYrZO9G` |
| **Latest Deploy ID** | `dpl_A6HteoSqe4GqCMzzkACsdZQECNuL` |
| **Deploy State** | READY |
| **Environment** | Vercel Serverless (Node.js) |
| **Database** | MongoDB Atlas (connected — verified via health endpoint) |

### Branch Mismatch Note
Production is deployed from `agent/phase9-platform`, NOT from `main`. The `main` branch contains Phases 1-4 (original codebase). Phases 5-10 exist on feature branches that were deployed directly to production via Vercel deployment API with production alias.

---

## 2. EXECUTIVE SUMMARY

### What Exists
A comprehensive commerce admin panel with 68 screen components, 57 database models, 44 route files, and 28 utility modules. The system covers product management, order processing, customer management, marketing, finance, analytics, and platform extensibility.

### What Works (REAL — Production Verified)
- **Authentication** — JWT login, MFA (2FA email codes), session management, RBAC (6 roles)
- **Dashboard** — KPI cards, charts, recent orders, best sellers, low stock, pipeline
- **Orders** — List, detail, status management, invoice, payment verification, production workflow
- **Products** — List, editor (sections: basic/media/pricing/variants/inventory/organization/publishing)
- **Customers** — List with segments, Customer 360 (profile, orders, activity, wishlist, cart, reviews, loyalty, notes, consent)
- **Marketing** — Overview dashboard with real metrics, promotions, discounts/coupons, email campaigns, banners
- **Finance** — P&L dashboard, order profitability, profit by product/customer, COD exposure, break-even
- **Analytics** — Overview with KPIs, sales trends, customer analytics, product performance, cohorts, country breakdown
- **Settings** — Hub with 12+ sub-pages (store, payments, shipping, email, cart, checkout, accounts, reviews, loyalty, security, taxes)
- **Integrations/Platform** — Registry (7 built-in), webhook event log, API key management, system health, backup schedule, audit log
- **Theme Editor** — Section-based editor with drag/drop, preview, version history
- **CMS** — Pages, redirects, blog, FAQ
- **Search Analytics** — Top searches, zero-result analysis

### What Partially Works
- **Payment Gateways** — JazzCash + SafePay adapters exist with real HMAC signing, but NO verified merchant credentials in production. Status: ARCHITECTURE READY, NOT LIVE CONNECTED
- **WhatsApp** — Meta Cloud API adapter exists, no verified credentials. Status: ARCHITECTURE READY
- **SMTP Email** — nodemailer infrastructure exists, configurable via admin. Delivery depends on merchant SMTP credentials
- **Backup Scheduling** — Schedule model exists, manual trigger works, but no automated cron execution configured
- **Extension Lifecycle** — Install/configure/enable/disable/uninstall implemented in code, but no third-party extensions actually installed

### What Is UI-Only
- **Bundles** route → renders Promotions component (same screen, different filter)
- **Flash Sales** route → renders Promotions component (same screen, different filter)
- **Orders Legacy** route → older Orders component still registered

### What Is Architecture-Ready Only
- **Plugin/Extension System** — Level 4 (manifest + lifecycle + events + scopes) in code, but Level 0 in practice (no third-party extensions exist)
- **Webhook Retry** — Exponential backoff processor exists, but no background job runner to trigger it automatically
- **OAuth** — Not implemented; integrations use API key/credential config

### What Is Missing
- No Pakistan courier API integration (manual shipping only)
- No SMS provider connected
- No public app marketplace
- No real-time monitoring/alerting
- No automated external backup (S3/GCS)
- No predictive analytics

### What Is Fake/Placeholder
- **Nothing is fake.** All metrics shown in admin dashboards are calculated from real database queries. No fabricated conversion rates, ROAS, or open rates.

### Overall System Maturity
**Production-grade commerce admin** with comprehensive feature coverage. Core commerce (products, orders, customers) is mature. Marketing, finance, and analytics are functional. Platform extensibility is architecturally sophisticated but has zero real-world extensions. Payment/shipping integrations are code-complete but not connected to live providers.

---

## 3. COMPLETE ADMIN INFORMATION ARCHITECTURE

Generated from actual `App.jsx` route definitions and `AdminLayout.jsx` navigation:

```
HUSHAE ADMIN (/admin)
│
├── Login (/admin/login)
│   └── AdminLogin.jsx — email/password + 2FA
│
├── Dashboard (/admin)
│   └── Dashboard.jsx — KPIs, charts, pipeline, recent orders
│
├── ORDERS
│   ├── Orders (/admin/orders) — OrdersDesk.jsx (workflow-driven)
│   ├── Order Detail (/admin/orders/:id) — OrderDetail.jsx
│   ├── Order Invoice (/admin/orders/:id/invoice) — OrderInvoice.jsx
│   ├── Draft Order (/admin/orders/new) — DraftOrder.jsx
│   ├── Orders Legacy (/admin/orders-legacy) — Orders.jsx (older version)
│   ├── Verification Queue (/admin/verification-queue) — VerificationQueue.jsx
│   └── Payments (/admin/payments) — Payments.jsx
│
├── PRODUCTS
│   ├── Products (/admin/products) — Products.jsx
│   ├── Product Editor (/admin/products/:id) — ProductForm.jsx
│   ├── Categories (/admin/categories) — Categories.jsx
│   ├── Collections (/admin/collections) — Collections.jsx
│   ├── Reviews (/admin/reviews) — Reviews.jsx
│   └── Questions (/admin/questions) — Questions.jsx
│
├── CUSTOMERS
│   ├── Customers (/admin/customers) — Customers.jsx
│   ├── Customer 360 (/admin/customers/:id) — CustomerDetail.jsx
│   ├── Customer Groups (/admin/customers/groups) — CustomerGroups.jsx
│   └── Loyalty (/admin/loyalty) — Loyalty.jsx
│
├── MARKETING
│   ├── Marketing Overview (/admin/marketing) — Marketing.jsx
│   ├── Promotions (/admin/promotions) — Promotions.jsx
│   ├── Promotion Editor (/admin/promotions/:id) — PromotionEdit.jsx
│   ├── Discounts (/admin/discounts) — Discounts.jsx
│   ├── Bundles (/admin/bundles) → Promotions.jsx (same)
│   ├── Flash Sales (/admin/flash-sales) → Promotions.jsx (same)
│   ├── Email Campaigns (/admin/email-campaigns) — EmailCampaigns.jsx
│   ├── Banners (/admin/banners) — BannerList.jsx
│   ├── Banner Slots (/admin/banners/slots) — BannerSlots.jsx
│   ├── Banner Editor (/admin/banners/:id) — BannerEdit.jsx
│   ├── Automation (/admin/marketing/settings) — MarketingSettings.jsx
│   ├── Performance (/admin/marketing/analytics) — MarketingAnalytics.jsx
│   └── Abandoned Carts (/admin/abandoned-carts) — AbandonedCarts.jsx
│
├── STOREFRONT
│   ├── Online Store (/admin/store) — OnlineStore.jsx
│   ├── Content (/admin/content) — Content.jsx
│   ├── Theme Editor (/admin/theme) — ThemeEditor.jsx
│   ├── Theme Sections (/admin/theme-sections) — ThemeEditorApp.jsx
│   ├── Navigation (/admin/navigation) — Navigation.jsx
│   ├── Pages (/admin/cms) — Cms.jsx
│   ├── Page Editor (/admin/cms/:id) — CmsEdit.jsx
│   ├── Redirects (/admin/cms/redirects) — CmsRedirects.jsx
│   ├── Blog (/admin/blog) — Blog.jsx
│   ├── Blog Editor (/admin/blog/:id) — BlogEdit.jsx
│   ├── FAQ (/admin/faq) — Faq.jsx
│   └── Markets (/admin/markets) — Markets.jsx
│
├── OPERATIONS
│   ├── Commerce Ops (/admin/ops) — CommerceOps.jsx
│   ├── Inventory (/admin/ops/inventory) — CommerceOps (stock tab)
│   ├── Returns (/admin/ops/returns) — CommerceOps (returns tab)
│   ├── Communications (/admin/ops/comms) — CommerceOps (comms tab)
│   └── Risk (/admin/ops/risk) — CommerceOps (risk tab)
│
├── FINANCE
│   ├── Finance & P&L (/admin/finance) — Finance.jsx
│   └── Taxes (/admin/settings/taxes) — Taxes.jsx
│
├── ANALYTICS
│   ├── Analytics (/admin/analytics) — Analytics.jsx
│   ├── Insights (/admin/insights) — Insights.jsx
│   ├── Reports (/admin/reports) — Reports.jsx
│   ├── Search Analytics (/admin/search-analytics) — SearchAnalytics.jsx
│   ├── Live View (/admin/live) — LiveView.jsx
│   └── Growth (/admin/growth) — Growth.jsx
│
├── PLATFORM
│   ├── Integrations (/admin/apps) — Apps.jsx (6 tabs)
│   └── Backup (/admin/backup) — Backup.jsx
│
└── SETTINGS
    ├── Settings Hub (/admin/settings) — SettingsHub.jsx
    ├── Store Details (/admin/settings/store) — SettingsStore.jsx
    ├── Payments (/admin/settings/payments) — SettingsPayments.jsx
    ├── Shipping (/admin/settings/shipping) — SettingsShipping.jsx
    ├── Email (/admin/settings/email) — SettingsEmail.jsx
    ├── Cart (/admin/settings/cart) — SettingsCart.jsx
    ├── Checkout (/admin/settings/checkout) — SettingsCheckout.jsx
    ├── Accounts (/admin/settings/accounts) — SettingsAccounts.jsx
    ├── Experience (/admin/settings/experience) — SettingsCX.jsx
    ├── Reviews (/admin/settings/reviews) — SettingsReviews.jsx
    ├── Loyalty (/admin/settings/loyalty) — SettingsLoyalty.jsx
    ├── Search (/admin/settings/search) — SettingsSearch.jsx
    └── Security (/admin/settings/security) — SettingsSecurity.jsx
```

---

## 4. CODE STRUCTURE

### Repository Layout

```
hushae/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── app.js             # Express app setup, route registration (44 routes)
│   │   ├── server.js          # HTTP server, MongoDB connection
│   │   ├── config.js          # Environment configuration
│   │   ├── models/            # 57 Mongoose models
│   │   ├── routes/            # 44 route files
│   │   ├── middleware/        # auth, rateLimit, sanitize
│   │   └── utils/             # 28 utility modules
│   └── package.json
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx            # Route definitions (~80 admin routes)
│   │   ├── main.jsx           # Entry point, CSS imports
│   │   ├── admin/             # 68 admin screen components
│   │   │   ├── components/    # PageHeader
│   │   │   │   └── ui/       # 13 shared UI components
│   │   │   ├── dashboard/     # Dashboard sub-components (11 files)
│   │   │   ├── orders/        # Order sub-components
│   │   │   ├── finance/       # Finance sub-components
│   │   │   ├── analytics/     # Analytics sub-components
│   │   │   ├── promotions/    # Promotion sub-components
│   │   │   ├── cms/           # CMS sub-components
│   │   │   └── settings/      # Settings sub-components
│   │   ├── components/        # Storefront shared components
│   │   ├── theme-editor/      # Theme editor engine
│   │   ├── store/             # Zustand state management
│   │   ├── lib/               # Utilities (format, adminTheme)
│   │   ├── api/               # API client
│   │   ├── admin-v2.css       # Design System V2 tokens
│   │   ├── admin-v2-override.css  # Global dark→light overrides
│   │   ├── admin-dark.css     # Legacy dark theme
│   │   ├── admin-light.css    # Legacy light theme
│   │   └── index.css          # Global styles (57K lines)
│   ├── tailwind.config.js     # Tailwind configuration
│   └── vite.config.js
│
├── tests/                      # Automated test suites (8 .mjs files)
├── qa/                         # Screenshot evidence
│   ├── phase5-screenshots/    # 132 before/after screenshots
│   ├── phase6-screenshots/    # 36 marketing screenshots
│   ├── phase7-screenshots/    # 24 finance screenshots
│   ├── phase8-screenshots/    # 36 analytics screenshots
│   ├── phase9-screenshots/    # 24 platform screenshots
│   └── current-admin/         # 24 current production screenshots
│
├── PHASE-5-REPORT.md through PHASE-10-FINAL-CERTIFICATION.md
└── vercel.json                # Vercel deployment configuration
```

### Scale

| Metric | Count |
|--------|-------|
| Backend Models | 57 |
| Backend Routes | 44 files |
| Backend Utils | 28 modules |
| Backend Middleware | 3 |
| Frontend Admin Screens | 68 |
| Frontend UI Components | 13 |
| Frontend Admin Sub-components | ~40 |
| Frontend Routes (admin) | ~80 |
| CSS Files | 6 |
| Test Suites | 8 |
| Total Backend Lines | ~25,000+ |
| Total Frontend Lines | ~35,000+ |

---

## 5. DATABASE MODELS (57 Total)

### Core Commerce
| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Customer/admin accounts | email, phone, password, role, consent, sessions, tags |
| **Product** | Product catalog | name, price, compareAtPrice, costPrice, images, variants, sizes, colors, stock, categorySlug, status |
| **Category** | Product categories | name, slug, gender, parent |
| **Collection** | Product collections | name, products[], type (manual/smart) |
| **Order** | Customer orders | orderNumber, items[], total, subtotal, discount, tax, shippingCharge, status, stage, paymentMethod, paymentStatus, customerInfo |
| **OrderPayment** | Payment verification ledger | order, method, amount, state (Pending→Verified→Confirmed), transactionId, gatewayResponse |
| **OrderTimeline** | Order event history | order, event, note, actor |
| **OrderNotification** | Order notification tracking | order, channel, status |
| **OrderPrint** | Print job tracking | order, type, status |
| **OrderIssue** | Order problems | order, type, resolution |

### Refunds & Returns
| Model | Purpose |
|-------|---------|
| **RefundLedger** | Refund records (order, amount, method, currency) |
| **ReturnCase** | RMA workflow (requested→approved→received→refund→completed) |

### Marketing
| Model | Purpose |
|-------|---------|
| **Promotion** | Auto-applied promotions (type: flash/percent/fixed/bxgy/bundle/freeship/tiered) |
| **PromotionUse** | Promotion redemption tracking with idempotency |
| **Discount** | Coupon codes (code, type, value, minSubtotal, maxUses, targeting) |
| **EmailCampaign** | Email campaigns with draft/send workflow, recipient snapshots |
| **EmailTemplate** | Reusable email templates |
| **CampaignLaunch** | Campaign orchestration |
| **Banner** | Storefront banners (slot, media, CTA, schedule, device targeting) |
| **BannerSlot** | Banner placement positions |
| **Subscriber** | Newsletter subscribers |
| **AbandonedCart** | Abandoned cart tracking with recovery |

### Customers
| Model | Purpose |
|-------|---------|
| **CustomerActivity** | Customer event tracking (viewed, cart, checkout, purchase) |
| **CustomerNote** | Internal customer notes |
| **CustomerGroup** | Rule-based customer segments |
| **LoyaltyAccount** | Loyalty points/credit |
| **LoyaltyLedger** | Loyalty transaction history |

### Operations
| Model | Purpose |
|-------|---------|
| **InventoryBalance** | Stock levels per product/warehouse |
| **StockMovement** | Stock transaction history |
| **Warehouse** | Warehouse locations |
| **PurchaseOrder** | Purchase order management |
| **Supplier** | Supplier records |
| **ShippingProfile** | Shipping rate configurations |
| **TaxZone** | Tax rate zones |
| **Expense** | Business expense tracking (Phase 7) |

### Platform
| Model | Purpose |
|-------|---------|
| **Integration** | Extension registry (manifest, permissions, lifecycle, health) |
| **WebhookEvent** | Webhook event log with retry/dead-letter |
| **ApiKey** | Scoped API key management (SHA-256 hashed) |
| **ExtensionEvent** | Extension event subscriptions |
| **BackupSchedule** | Automated backup scheduling |
| **AuditLog** | System audit trail |
| **Settings** | Store configuration (single document, nested structure) |

### Content
| Model | Purpose |
|-------|---------|
| **CmsPage** | CMS pages with versioning |
| **CmsVersion** | Page version history |
| **BlogPost** | Blog articles |
| **Redirect** | URL redirects |
| **Theme** | Storefront theme configuration |

### Tracking & Analytics
| Model | Purpose |
|-------|---------|
| **PageView** | Frontend event tracking (pageview, cart, checkout) |
| **SearchLog** | Search query logging |
| **Review** | Product reviews |
| **Question** | Product Q&A |

### Infrastructure
| Model | Purpose |
|-------|---------|
| **Upload** | File upload records |
| **UploadChunk** | Chunked upload support |
| **OtpCode** | OTP verification codes |
| **SavedFilter** | Saved admin filters |
| **Comms** | Communication templates + consent + logs |
| **GiftCard** | Gift card management |

---

## 6. BACKEND API ROUTES (44 Route Files)

| Route File | Mount Path | Auth | Key Endpoints |
|-----------|------------|------|---------------|
| auth | /api/auth | Public | login, register, 2fa/request, 2fa/verify, password/reset |
| products | /api/products | Mixed | list, detail, create, update, delete, duplicate, stock |
| orders | /api/orders | Mixed | create (checkout), list, detail, status update, tracking |
| ordersAdmin | /api/orders/manage | Admin | admin order management, bulk operations |
| ordersInsights | /api/orders/insights | Admin | order analytics, dashboard signals |
| customer360 | /api/customers | Admin | customer list, detail, segments, consent, notes, tags |
| customer | /api/customer | Auth | customer self-service (profile, orders, wishlist) |
| customerGroups | /api/customer-groups | Admin | group CRUD, member evaluation |
| categories | /api/categories | Mixed | list, CRUD |
| collections | /api/collections | Mixed | list, CRUD |
| promotions | /api/promotions | Mixed | CRUD, quote, toggle, bulk, preview, stats |
| discounts | /api/discounts | Mixed | validate, CRUD (enhanced targeting) |
| payments | /api/payments | Mixed | initiate, callback/jazzcash, callback/safepay, admin config |
| banners | /api/banners | Mixed | public list, admin CRUD, slots, impression/click tracking |
| emailCampaigns | /api/email-campaigns | Admin | CRUD, preview, send, cancel |
| emailTemplates | /api/email-templates | Admin | template CRUD |
| marketing | /api/marketing/automation | Admin | dashboard metrics |
| finance | /api/finance | Admin | dashboard, order-profitability, profit-by-product, profit-by-customer, cod-exposure, break-even, shipping-report, tax-report, expenses, cashflow, export |
| analytics | /api/analytics | Admin | overview, sales, customers, cohorts, products, orders, returns, marketing, countries |
| dashboardSignals | /api/dashboard | Admin | alerts, insights, goal, compare |
| search | /api/search/admin | Admin | stats, data-quality, export |
| searchPublic | /api/search | Public | search products |
| track | /api/track | Public | event tracking, admin live view |
| theme | /api/theme | Mixed | theme CRUD, sections, publish, versions |
| cms | /api/cms | Mixed | pages CRUD, redirects, versions |
| blog | /api/blog | Mixed | posts CRUD |
| reviews | /api/reviews | Mixed | review CRUD, moderation |
| questions | /api/questions | Mixed | Q&A CRUD |
| settings | /api/settings | Admin | store settings CRUD |
| security | /api/security | Admin | audit-logs, users CRUD, JWT rotation, fraud |
| backup | /api/backup | Admin | export, download, restore, snapshots |
| platform | /api/platform | Admin | integrations, webhooks, API keys, extensions, backup schedule, health, audit |
| ops | /api/ops | Admin | warehouses, stock, purchasing, returns, comms, risk, shipping, tax |
| loyalty | /api/loyalty | Mixed | account, ledger, redeem |
| abandonedCart | /api/abandoned-cart | Mixed | track, admin list, send recovery, auto-send |
| subscribers | /api/subscribers | Public | subscribe |
| wishlist | /api/wishlist | Auth | add, remove, list |
| uploads | /api/uploads | Mixed | upload, chunked upload |
| locations | /api/locations | Public | province/city data |
| geo | /api/geo | Public | geolocation |
| otp | /api/otp | Public | request, verify |
| discovery | /api/discovery | Public | product recommendations |
| seo | / | Public | sitemap, robots.txt |
| admin | /api/admin | Admin | dashboard data |

---

## 7. AUTHENTICATION & RBAC

### Roles (6)
| Role | Permissions |
|------|-------------|
| **admin** | orders, products, content, discounts, reviews, customers, settings, security, backup |
| **Owner** | Same as admin |
| **Manager** | orders, products, content, discounts, reviews, customers |
| **Staff** | orders, reviews, customers |
| **Warehouse** | orders, products |
| **Support** | orders, customers, reviews |

### Authentication Mechanism
- **JWT tokens** with configurable expiry (default 90 days, "remember me" 30 days)
- **Session tracking** via `jti` (JWT ID) stored in `user.sessions[]` (max 10 devices)
- **Device revocation** — removing jti from sessions array invalidates token
- **2FA** — Email-based 6-digit code with SHA-256 hashed storage, 5-minute expiry
- **Password** — bcrypt hashing
- **Rate limiting** — Applied to auth, search, tracking, campaign endpoints

### Middleware Stack
```
Request → CORS → JSON parser (10mb limit) → sanitize → rateLimit → auth (protect) → adminOnly → requirePermission(scope) → Route handler
```

---

## 8. INTEGRATION STATUS

| Integration | Type | Adapter | Connected | Production Live | Status |
|------------|------|---------|-----------|-----------------|--------|
| COD | Payment | Built-in | N/A | ✅ Yes | **REAL** |
| JazzCash | Payment | `paymentGateways.js` | ❌ No credentials | ❌ No | **ARCHITECTURE READY** |
| SafePay (Visa/MC) | Payment | `paymentGateways.js` | ❌ No credentials | ❌ No | **ARCHITECTURE READY** |
| Bank Transfer | Payment | Built-in | N/A | ✅ Yes | **REAL** |
| Manual Shipping | Shipping | Built-in | N/A | ✅ Yes | **REAL** |
| Pakistan Courier API | Shipping | None | ❌ Not implemented | ❌ No | **NOT IMPLEMENTED** |
| SMTP Email | Communication | `mailer.js` (nodemailer) | ⚠️ Configurable | ⚠️ If configured | **CONFIGURABLE** |
| WhatsApp | Communication | `whatsapp.js` | ❌ No credentials | ❌ No | **ARCHITECTURE READY** |
| SMS | Communication | `sms.js` | ❌ No credentials | ❌ No | **ARCHITECTURE READY** |
| Extension Registry | Platform | `Integration` model | ✅ Built-in | ✅ Yes | **REAL** (registry only) |
| Extension Lifecycle | Platform | `extensionLifecycle.js` | ✅ Code exists | ⚠️ No extensions installed | **REAL** (unused) |
| Event Bus | Platform | `extensionLifecycle.emitEvent()` | ✅ Code exists | ⚠️ No subscribers | **REAL** (unused) |
| Webhook Retry | Platform | `webhookRetry.js` | ✅ Code exists | ⚠️ No cron trigger | **REAL** (manual only) |

### Plugin/Extension System Maturity: **Level 4 in code, Level 1 in practice**
- Level 4 capabilities exist: manifest validation, install/configure/enable/disable/uninstall lifecycle, event subscriptions, scoped API access
- Level 1 reality: Only built-in integrations registered, no third-party extensions

---

## 9. THEME EDITOR

### Architecture
```
Admin Theme Editor (ThemeEditor.jsx + ThemeEditorApp.jsx)
    ↓ API calls
/api/theme (routes/theme.js)
    ↓ CRUD
Theme model (sections[], settings, versions)
    ↓ Publish
Published theme stored in Theme model
    ↓ Storefront reads
Storefront components render from published theme data
```

### Capabilities

| Feature | Status | Evidence |
|---------|--------|----------|
| Section listing | REAL | ThemeEditorApp.jsx loads sections from API |
| Section settings | REAL | Inspector panel edits section settings |
| Drag/drop reordering | REAL | react-dnd integration in ThemeEditorApp |
| Preview (desktop/mobile) | REAL | Iframe preview with device toggle |
| Version history | REAL | CmsVersion model, version list in UI |
| Save draft | REAL | Draft state in Theme model |
| Publish | REAL | Publish endpoint updates published state |
| Rollback | REAL | Version restore endpoint |
| Section visibility toggle | REAL | visible flag in section data |
| Add new section | REAL | Section type picker |
| Asset management | REAL | Upload integration |

### Storefront Connection
- Theme data stored in `Theme` model (MongoDB)
- Sections array with type, settings, order, visibility
- Published vs draft state
- Storefront reads published theme via `/api/theme` endpoint
- No CDN caching layer — direct database reads

---

## 10. FINANCE ARCHITECTURE

### Formulas (from `orderEconomics.js` — single source of truth)

```
Revenue = Σ order.total (where status NOT IN Cancelled, Refunded)
Discounts = Σ order.discount
Net Sales = Revenue - Discounts
COGS = Σ (item.costPrice × item.quantity) per order
Packaging = cfg.packaging × shipped_orders
Courier = Σ (order.courierCost OR cfg.courierDefault) per shipped_order
Payment Fees = Σ (cfg.feePct[method] × order.total) per paid_order
Refunds = Σ RefundLedger.amount
Expenses = Σ Expense.amount

Estimated Profit = Revenue - COGS - Packaging - Courier - PaymentFees - Refunds - Expenses
Margin = Estimated Profit / Revenue × 100
```

### Cash Flow
```
Inflows = Σ paid_order.total
Outflows = Refunds + Expenses + Courier + Packaging
Net Cash Flow = Inflows - Outflows
```

**Note:** All amounts in PKR. USD is display-only per Phase 2 decision.

---

## 11. ORDER STATE MACHINE

```
                    ┌─────────┐
                    │ Pending  │
                    └────┬─────┘
                         │ Confirm
                    ┌────▼─────┐
                    │Confirmed │
                    └────┬─────┘
                         │ Start Production
                    ┌────▼──────┐
                    │Processing │
                    └────┬──────┘
                         │ Ready
                ┌────────▼────────┐
                │  Ready to Ship  │
                └────────┬────────┘
                         │ Ship
                    ┌────▼─────┐
                    │ Shipped  │
                    └────┬─────┘
                         │ Out for Delivery
                ┌────────▼──────────┐
                │ Out for Delivery  │
                └────────┬──────────┘
                         │ Deliver
                    ┌────▼──────┐
                    │ Delivered │
                    └───────────┘

  Terminal states: Cancelled (from any), Refunded (from Delivered)
```

### Payment States (separate)
```
Pending → Verified → Confirmed
Pending → Failed / Expired
Confirmed → Refunded
```

### Production States (separate)
```
None → In Production → Ready → Shipped → Delivered
```

---

## 12. KNOWN LIMITATIONS

| # | Limitation | Severity |
|---|-----------|----------|
| 1 | JazzCash not live-connected (no merchant credentials) | Medium |
| 2 | SafePay not live-connected (no merchant credentials) | Medium |
| 3 | No Pakistan courier API (manual shipping only) | Medium |
| 4 | WhatsApp not connected (no Meta Business verification) | Low |
| 5 | SMS provider not connected (no credentials) | Low |
| 6 | No OAuth flow for external providers | Low |
| 7 | No public app marketplace | Low |
| 8 | Webhook retry requires manual trigger (no cron) | Low |
| 9 | Backup scheduling is config-only (no automated execution) | Low |
| 10 | No real-time monitoring/alerting | Low |
| 11 | No automated external backup (S3/GCS) | Low |
| 12 | Production deployed from feature branch, not main | Low |
| 13 | 3 API endpoints above 1.5s response time (serverless cold start) | Low |
| 14 | Extension system has zero third-party extensions | Informational |
| 15 | Bundles/Flash Sales reuse Promotions screen (no dedicated UI) | Informational |

---

## 13. TECHNICAL DEBT

| # | Item | Impact |
|---|------|--------|
| 1 | `index.css` is 57K lines — monolithic stylesheet | Maintainability |
| 2 | Legacy dark theme CSS (`admin-dark.css`) still imported | CSS conflicts |
| 3 | Some admin screens still use `text-white` inline classes (rely on CSS override) | Fragility |
| 4 | No TypeScript — entire codebase is JavaScript/JSX | Type safety |
| 5 | No API schema validation (no Joi/Zod) | Input validation |
| 6 | Order model is large (~250 lines) with many concerns | Separation of concerns |
| 7 | Some route files are 400+ lines | Code organization |
| 8 | No API documentation (Swagger/OpenAPI) | Developer experience |
| 9 | Frontend has no error boundary on all routes | Error handling |
| 10 | `orders-legacy` route still registered | Dead code |
