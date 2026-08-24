# HUSHAE Admin Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React 18 + Vite + Tailwind + Recharts + Lucide + Zustand      │
│  68 admin screens · 13 UI components · 6 CSS files             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL SERVERLESS (Node.js)                   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  CORS    │→ │  JSON    │→ │ Sanitize │→ │RateLimit │       │
│  │          │  │  Parser  │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                   AUTH MIDDLEWARE                         │  │
│  │  protect (JWT verify + user lookup + session check)      │  │
│  │  adminOnly (role check)                                  │  │
│  │  requirePermission(scope) (granular permission check)    │  │
│  │  apiKeyAuth (Bearer hs_* API key authentication)         │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                   44 ROUTE FILES                          │  │
│  │  auth · products · orders · customers · marketing        │  │
│  │  finance · analytics · platform · security · backup      │  │
│  │  payments · banners · cms · theme · search · ops · ...   │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                   28 UTILITY MODULES                      │  │
│  │  orderEconomics · promotionEngine · paymentGateways      │  │
│  │  analyticsService · extensionLifecycle · webhookRetry    │  │
│  │  mailer · whatsapp · sms · customerSegments · search     │  │
│  │  inventoryEngine · loyaltyEngine · fraudChecker · ...    │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────▼───────────────────────────────┐  │
│  │                   57 MONGOOSE MODELS                      │  │
│  │  User · Product · Order · OrderPayment · RefundLedger    │  │
│  │  Promotion · Discount · EmailCampaign · Banner · Theme   │  │
│  │  Integration · WebhookEvent · ApiKey · Expense · ...     │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              │ Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MONGODB ATLAS                               │
│  Collections: 57+ · Indexes: 100+                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ JazzCash │   │ SafePay  │   │  SMTP    │
        │ (HPP)    │   │ (API)    │   │(nodemail)│
        │ NOT LIVE │   │ NOT LIVE │   │CONFIGURED│
        └──────────┘   └──────────┘   └──────────┘
```

## Data Flow: Checkout → Finance

```
Customer Checkout
    │
    ▼
POST /api/orders (checkout)
    │
    ├── Calculate subtotal (items × price)
    ├── Validate coupon (Discount model → evaluateDiscount())
    ├── Evaluate promotions (promotionEngine.evaluateCart())
    │   └── Check: scope, eligibility, stacking, ceiling, per-customer limits
    ├── Calculate tax (taxPercent × afterDiscount)
    ├── Calculate shipping (settings.shippingMethods)
    ├── Compute total = afterPromotions + tax + shipping
    ├── Reserve inventory (inventoryEngine)
    ├── Create Order document (snapshot all values)
    ├── Record PromotionUse (idempotency key)
    ├── Increment Discount.usedCount
    └── Return order
    │
    ▼
Payment (if online)
    │
    ├── POST /api/payments/initiate/:orderId
    │   └── Gateway adapter → redirect/form
    │
    ├── POST /api/payments/callback/jazzcash (or safepay)
    │   ├── Verify HMAC signature
    │   ├── Check idempotency (order.paymentStatus !== 'Paid')
    │   ├── Update order.paymentStatus = 'Paid'
    │   └── Auto-confirm order if Pending
    │
    └── OrderPayment record created (ledger)
    │
    ▼
Finance Calculation (orderEconomics.js)
    │
    ├── Revenue = Σ order.total (non-cancelled)
    ├── COGS = Σ (costPrice × qty)
    ├── Packaging = cfg.packaging × shipped
    ├── Courier = Σ courierCost per shipped
    ├── PaymentFees = Σ feePct × total per paid
    ├── Profit = Revenue - COGS - Packaging - Courier - Fees - Refunds - Expenses
    └── Margin = Profit / Revenue × 100
```

## Entity Relationship (Core)

```
User (customer/admin)
 ├── Orders[]
 ├── CustomerActivity[]
 ├── CustomerNote[]
 ├── CustomerGroup[] (via rules)
 ├── LoyaltyAccount
 ├── Wishlist (Product refs)
 └── Consent { email, whatsapp, sms }

Product
 ├── Category (via categorySlug)
 ├── Collection[] (via collectionIds)
 ├── InventoryBalance[] (per warehouse)
 ├── Order.items[] (embedded snapshot)
 ├── Review[]
 ├── Question[]
 └── Promotion.scope.productIds[]

Order
 ├── items[] (product snapshot: name, price, costPrice, image)
 ├── customerInfo (snapshot: name, phone, email, city, address)
 ├── OrderPayment[] (verification ledger)
 ├── OrderTimeline[] (event history)
 ├── RefundLedger[] (refund records)
 ├── ReturnCase (RMA)
 ├── PromotionUse[] (which promotions applied)
 ├── discount, tax, taxPercent, shippingCharge (snapshotted)
 └── total, subtotal (snapshotted)

Promotion
 ├── scope { mode, productIds, categorySlugs, collectionIds, tags }
 ├── eligibility { audience, segments, groups, cities, minCart }
 ├── limits { maxUses, maxUsesPerPhone, maxTotalDiscount }
 └── PromotionUse[] (redemption records)

Integration
 ├── config (masked in API responses)
 ├── configFields[] (dynamic form definition)
 ├── permissions[] (declared scopes)
 ├── ExtensionEvent[] (event subscriptions)
 └── WebhookEvent[] (provider events)
```

## Deployment Architecture

```
Developer → Git push → GitHub (anasyup/hushae)
    │
    ├── main branch → Phases 1-4 (original codebase)
    ├── agent/phase5-visual-rebuild → Phase 5
    ├── agent/phase6-marketing-growth → Phase 6
    ├── agent/phase7-finance-ops → Phase 7
    ├── agent/phase8-analytics → Phase 8
    └── agent/phase9-platform → Phases 9-10 (CURRENT PRODUCTION)
                                    │
                                    ▼
                              Vercel Auto-Deploy
                                    │
                                    ▼
                         hushae1.vercel.app (production alias)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              Frontend SPA    API Routes      Static Assets
              (React/Vite)   (Serverless)    (Vercel CDN)
                    │               │
                    └───────┬───────┘
                            ▼
                      MongoDB Atlas
                      (external)
```

## Security Architecture

```
Request Flow:
  Client → CORS → JSON(10mb) → Sanitize → RateLimit → Auth → Route

Authentication:
  ├── JWT (HS256, configurable expiry)
  ├── Session tracking (jti in user.sessions[], max 10)
  ├── 2FA (email 6-digit code, SHA-256 hashed, 5min expiry)
  └── API Keys (SHA-256 hashed, scoped, one-time display)

Authorization:
  ├── protect (JWT verify + user active check + session jti check)
  ├── adminOnly (role in ADMIN_ROLES)
  ├── requirePermission(scope) (role has permission in PERMISSIONS map)
  └── requireScope(scope) (API key has scope in scopes array)

Secrets:
  ├── JWT_SECRET → environment variable
  ├── Payment credentials → Settings.integrations (database, masked in API)
  ├── SMTP credentials → Settings.integrations.email (database, masked)
  ├── API keys → SHA-256 hash stored, plaintext shown once
  └── Webhook secrets → Integration.config (masked)

Rate Limiting:
  ├── Auth endpoints (login, register, OTP)
  ├── Search endpoints
  ├── Tracking endpoints
  ├── Campaign send endpoints
  └── Promotion quote endpoint
```

## Backup/Recovery Architecture

```
Production MongoDB
      │
      ▼
BackupSchedule model
  ├── frequency: hourly/daily/weekly/monthly
  ├── collections: [orders, products, users, ...]
  ├── maxSnapshots: 30
  └── maxAgeDays: 90
      │
      ▼ (manual trigger or cron)
POST /api/platform/backup/schedule/trigger
      │
      ▼
Iterate collections → toArray() → JSON snapshot
      │
      ▼
Record: sizeBytes, durationMs, status
      │
      ▼
POST /api/platform/backup/verify
      │
      ├── Check critical collections exist
      ├── Count documents
      ├── Verify indexes
      └── Check database connection state
      │
      ▼
Restore (via existing /api/backup/restore)
      │
      ├── Require admin auth
      ├── Confirm destructive impact
      ├── Restore from snapshot
      └── Verify post-restore
```
