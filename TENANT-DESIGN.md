# TENANT DESIGN — HUSHAE as a Shopify-style SaaS platform

Boss ka vision: platform, sirf ek store nahi. Ye doc implementation blueprint
hai. **Rule #1: har naya feature ab tenant-ready likha jaye ga.**

---

## 1. Data model

```js
// naya model
Store {
  _id, slug ('acme'), name, logo, themeId,
  plan: 'trial'|'basic'|'pro', trialEndsAt,
  currency: 'PKR', timezone: 'Asia/Karachi',
  languages: ['en'], defaultLanguage: 'en',
  domain: { custom: '', ssl: false },
  settings: { ...jo aaj global Settings me hai, per-store },
  isActive: true, createdAt
}
```

Har existing model me `store: { type: ObjectId, ref: 'Store', index: true }`
(default = migration me "legacy store" ko assign). Models ki list: Order,
Product, Category, Collection, Customer(User role!=admin), Review, Question,
Discount, Banner, BlogPost, CmsPage, Settings, EmailCampaign, OrderNotification,
AbandonedCart, InventoryBalance, AuditLog, staff Users (per-store role).

## 2. Request scoping (security ka asli kaam)

- Middleware `resolveStore`: subdomain `acme.hushae.app` (ya custom domain via
  `domains` lookup) → `req.store`; admin APIs token ke store se; storefront
  APIs resolved store se.
- **Har query helper** `scoped(Model, req)` = `Model.find({ store: req.store._id })`.
  Route-by-route yaad rakhna NAHIN — helper lazmi. Audit: existing routes ko
  phases me migrate, har phase ke baad regression pass.
- Staff auth: user.store + role; cross-store access = 403 + audit.

## 3. Routing / domains

- Vercel wildcard subdomain (`*.hushae.app` → same app) + custom domains
  (CNAME verify endpoint). `vercel.json` rewrite unchanged; app-level router
  store resolve karta hai.
- Admin: `hushae.app/admin` = **HQ** (platform owner view); store admin =
  `acme.hushae.app/admin`.

## 4. Onboarding wizard (Shopify ka magic)

Signup → store slug + category → theme default → currency/language →
sample catalog (optional) → payment methods (COD default on) → shipping
zones (PK default) → **live store in <10 min**. Har step idempotent,
resume-able (draft store state).

## 5. Billing (SaaS) — merchant payments se ALAG

- Stripe Billing (subscriptions) ya local: plan = trial 14d → Basic → Pro.
- Gate: seats nahi (differentiator!), features gate karo (custom domain,
  markets, API access). Dunning + grace period. Platform HQ me MRR view.

## 6. Per-store theming & content

- Theme editor + CMS already per-content hain → unhe `store` field milega.
- Media: per-store folder prefix (`/media/{storeId}/...`).

## 7. Migration plan (existing data)

1. `Store` create "HUSHAE Legacy" + sab existing rows ko us ka store id.
2. Indexes add (store compound jahan hot spots hain: orders createdAt+store).
3. Routes phase-wise: P1 read-only public storefront; P2 checkout/orders;
   P3 admin; P4 background jobs/notifications.
4. QA: har phase pe existing E2E smoke (orders flow, admin orders, settings).

## 8. Phases (order matters)

- **P0 (done):** nav cleanup, payments activation, team/roles, COD tooling.
- **P1:** Store model + legacy migration + resolveStore + storefront scoping.
- **P2:** onboarding wizard + per-store settings/staff + subdomains.
- **P3:** billing/plans + HQ view + per-store analytics isolation.
- **P4:** markets (multi-currency/language per store), channels framework.

## 9. Risks jo abhi manage karne hain

- Cross-tenant leak = platform ka death — code review me `store:` har query pe.
- Media/storage cost per store — quota per plan.
- Vercel serverless cold paths: store resolve cached (slug→store, 60s).

---
*Status: design approved-for-planning. Implementation P1 boss ke go-ahead pe.*
