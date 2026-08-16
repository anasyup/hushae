# HUSHAE Admin — Feature Inventory (Phase 0 audit)

Derived from the actual codebase (routes, API mounts, models). Every nav item below
maps to a real, working route — no invented features.

## Admin routes (React Router, frontend/src/App.jsx)

| Area | Routes |
|---|---|
| Overview | `/admin` (Dashboard) |
| Orders | `/admin/orders` (desk), `/admin/orders/new` (draft), `/admin/orders/:id`, `/admin/orders/:id/invoice`, `/admin/orders/:id/print/:doc`, `/admin/verification-queue` |
| Products | `/admin/products`, `/admin/products/:id`, `/admin/categories`, `/admin/collections` |
| Customers | `/admin/customers`, `/admin/customers/groups`, `/admin/loyalty` |
| Marketing | `/admin/promotions`(+new/:id), `/admin/bundles`, `/admin/flash-sales`, `/admin/discounts`, `/admin/marketing`(+settings/analytics), `/admin/email-campaigns`, `/admin/banners`(+new/:id/slots) |
| Storefront | `/admin/store`, `/admin/theme`, `/admin/theme-sections`, `/admin/cms`(+new/:id/redirects), `/admin/content`, `/admin/faq`, `/admin/markets`, `/admin/blog`(+new/:id), `/admin/navigation` |
| Analytics | `/admin/analytics`, `/admin/finance`, `/admin/insights`, `/admin/search-analytics`, `/admin/live`, `/admin/growth` |
| Other | `/admin/reviews`, `/admin/questions`, `/admin/payments`, `/admin/abandoned-carts`, `/admin/apps`, `/admin/backup`, `/admin/export` |
| Settings | `/admin/settings` + `/admin/settings/{store,payments,shipping,email,cart,checkout,accounts,experience,reviews,loyalty,search,security,legal,advanced}` |

## API endpoints (backend/src/app.js mounts)

`/api/admin` (dashboard KPIs, customers, analytics, subscribers) · `/api/orders`
(customer checkout + `/admin/*` status/payment/items/notes) · `/api/orders/manage`
(list/counts/facets, stage, payment verify, verification-queue, verify-action,
cancellation-reasons, export) · `/api/orders/insights` (dashboard, customer 360,
warehouse, filters) · `/api/products` (list/get/post/put, bulk, stock, reorder,
reorder/received) · `/api/categories` · `/api/collections` · `/api/customers` ·
`/api/dashboard` (alerts, insights, compare, goal, signals) · `/api/notifications` ·
`/api/promotions` · `/api/discounts` · `/api/reviews` · `/api/questions` ·
`/api/abandoned-cart` · `/api/security` (audit-logs, password) · `/api/settings` ·
`/api/seo` (robots/sitemap) · `/api/track` · `/api/auth` · `/api/uploads` ·
`/api/backup` · `/api/blog` · `/api/cms` · `/api/loyalty` · `/api/payments` · `/api/subscribers`

## Database models (backend/src/models)

User, Order (+OrderPayment/OrderTimeline/OrderIssue/OrderPrint/OrderNotification),
Product, Category, Collection, Discount, Promotion, GiftCard, LoyaltyAccount/ledger,
Review, Question, Subscriber, Banner/Slot, BlogPost, CmsPage/Version, EmailTemplate/
Campaign, AuditLog, Settings, Theme, Upload, SavedFilter, SearchLog, PageView,
AbandonedCart, CustomerGroup, OtpCode, Redirect.

## Feature inventory

| Feature | Route | API | DB | Status | Safe to redesign |
|---|---|---|---|---|---|
| Dashboard | /admin | /api/admin/dashboard + insights + alerts + goal | Order/Product/User/Settings | LIVE | ✅ |
| Alerts / attention | (widget) | /api/dashboard/alerts | Order/Product | LIVE | ✅ |
| Date-range | (widget) | from/to on dashboard+insights | Order | LIVE | ✅ |
| Orders desk | /admin/orders | /api/orders/manage | Order | LIVE | ✅ (light reskin + quick-view drawer) |
| Verification queue | /admin/verification-queue | /api/orders/manage/verification-queue + verify-action | Order | LIVE | ✅ |
| Order detail | /admin/orders/:id | /api/orders/admin/:id | Order | LIVE | ✅ |
| Products | /admin/products | /api/products | Product | LIVE | ✅ |
| Customers | /admin/customers | /api/admin/customers + insights/customer | User/Order | LIVE | ✅ |
| Reliability badge | (rows) | server-computed in list endpoints | Order | LIVE | ✅ |
| Cancellation reasons | (widget) | /api/orders/manage/cancellation-reasons | Order | LIVE | ✅ |
| Low-stock reorder | (widget/modal) | /api/products/:id/reorder | Product | LIVE | ✅ |
| Abandoned carts | (widget+page) | /api/abandoned-cart/admin | AbandonedCart | LIVE | ✅ |
| Audit/activity | — | /api/security/audit-logs | AuditLog | LIVE (settings/security events) | ✅ (surface as activity feed; extend logAction to orders+products) |
| Global search | ⌘K | /api/search (grouped real products/orders/customers) | Order/Product/User | LIVE | ✅ DONE |
| Store health | — | derived from insights+alerts | — | LIVE data available | ✅ DONE (no fabricated score) |
| Quick actions | topbar Create | routes exist | — | LIVE | ✅ |

## Inventory data available (live)

- statusAgg (orders by status), 30-day KPIs (revenue/orders/customers/aov/profit/cost/margin),
  14-day chart, hourly, bestSellers, topCustomers(+reliability), recentOrders, lowStock,
  cancellationReasons, paymentBreakdown (Pending/Verified/Confirmed/Failed/Expired/Refunded),
  pipeline stages (new/processing/to-ship/shipped/delivered/issues), alerts
  (payment-pending, stage-stuck, out-of-stock, low-stock, cancelled).

## Rules applied

- No fake nav items, metrics, or buttons. Anything without a backend stays hidden.
- Light theme primary (white surfaces, soft neutral bg, charcoal text, HUSHAE purple
  accent #6C5CE7). Dark remains an optional toggle.
- WCAG AA contrast + focus rings + reduced-motion respected.

## Completion log (production-redesign branch)

- Dashboard redesign (header, attention centre, KPIs, sales overview, order status, pipeline, payment health, peak hours, store health, activity feed, cancellation reasons, abandoned carts, lists) ✅
- Order Quick View drawer (real /orders/manage/:id) ✅
- Activity feed (real AuditLog; logAction extended to orders/products) ✅
- Global search /api/search + CommandPalette entity groups ✅
- Dashboard customization (hide widgets, localStorage persisted) ✅
- Products page: existing search/filter/sort/pagination/bulk/duplicate confirmed — no fake additions ✅
- WCAG AA (muted 4.83:1, accent 4.86:1, success #15803D 5.02:1), focus ring, reduced-motion ✅
