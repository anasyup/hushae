# Phase 4 — Customer 360 + CRM-lite

**Status:** Implemented and QA-passed in this workspace.

**Scope:** Existing HUSHAE admin only; no separate CRM app and no Phase 5 marketing automation.

## What changed

### Backend: authoritative customer data

| Area | Files |
|---|---|
| Customer 360 API | `backend/src/routes/customer360.js`, mounted in `backend/src/app.js` at `/api/customers` |
| Shared commerce metrics | `backend/src/utils/customerMetrics.js` |
| Customer tags | `backend/src/utils/customerTags.js` |
| Append-only behavioural activity | `backend/src/models/CustomerActivity.js`, `backend/src/utils/customerActivity.js` |
| Internal notes | `backend/src/models/CustomerNote.js` |
| Groups / explainability | `backend/src/routes/customerGroups.js`, `backend/src/utils/customerSegments.js`, `backend/src/models/CustomerGroup.js` |
| Customer schema / relationships | `backend/src/models/User.js`, `backend/src/models/Order.js`, `backend/src/models/AbandonedCart.js`, `backend/src/models/Review.js` |
| Real activity writers | `backend/src/routes/track.js`, `backend/src/routes/wishlist.js`, `backend/src/routes/abandonedCart.js`, `backend/src/routes/orders.js`, `backend/src/routes/ordersAdmin.js` |
| Consent compatibility | `backend/src/routes/customer.js`, `backend/src/routes/auth.js`, `backend/src/routes/emailCampaigns.js` |
| Automated QA | `backend/test-phase4-customers.js` |

### Frontend: admin UX

| Area | Files |
|---|---|
| Paginated customer directory / URL filters / bulk-safe actions | `frontend/src/admin/Customers.jsx` |
| Full Customer 360 | `frontend/src/admin/CustomerDetail.jsx` |
| Route | `frontend/src/App.jsx` (`/admin/customers/:id`) |
| Customer command-palette search | `frontend/src/admin/CommandPalette.jsx` |
| Customer dashboard widgets | `frontend/src/admin/Dashboard.jsx` |
| Groups UI rule visibility / archive | `frontend/src/admin/CustomerGroups.jsx` |
| Existing order → customer links | `frontend/src/admin/OrderDetail.jsx`, `frontend/src/admin/orders/CustomerPanel.jsx` |
| Existing manual-order prefill | `frontend/src/admin/orders/DraftOrder.jsx` |
| Attributable signed-in tracking | `frontend/src/lib/track.js` |
| Local QA proxy | `frontend/vite.config.js` now defaults `/api` to `http://127.0.0.1:4000` |

## Data model and indexes

### User

Added only customer-profile / CRM-lite fields:

- `whatsApp`: optional profile contact value; distinct from consent.
- `country`: ISO alpha-2 when actually known; empty means unknown, never guessed as PK.
- Address `country` field.
- `manualGroups`: explicit User → CustomerGroup assignments. Rule-driven memberships remain live.
- `consent.email`, `consent.whatsapp`, `consent.sms`: `OPTED_IN`, `OPTED_OUT`, or `UNKNOWN`, plus update provenance.

Indexes added:

- `{ role, createdAt }`
- `{ role, country, createdAt }`
- `{ phone }`, `{ whatsApp }`, `{ tags }`, `{ manualGroups }`

### Order and related models

- Order indexes: `{ customer, createdAt }` and `{ customer, status, createdAt }`.
- New authenticated checkout and valid manual orders retain `Order.customer` as the persistent User id.
- `AbandonedCart.customer` is set only for an authenticated session; anonymous carts stay anonymous.
- `AbandonedCart` index `{ customer, lastSeenAt }`.
- Review index `{ user, createdAt }`.
- Customer group archive state: `archivedAt`, `archivedByName`.

### New collections

- `CustomerActivity`: append-only behavioural facts, indexed by `{ customer, createdAt }` and `{ customer, type, createdAt }`.
- `CustomerNote`: internal-only notes, indexed by `{ customer, createdAt }`.

## Customer relationship model

- **Authoritative Customer 360 commerce joins use `Order.customer` only.** No phone/email-based auto-merge was added.
- Existing older phone-only order analysis stays compatible in the pre-existing customer-group evaluator, but it is deliberately not silently attached to a 360 profile.
- Manual orders validate the selected `userId`, require a matching customer phone/email when supplied, and write the persistent `Order.customer` id.
- Editing a profile address changes only `User.addresses`; order `customerInfo` snapshots are untouched.
- Privacy anonymization revokes sessions and redacts live account PII while retaining orders, invoices, refunds, activities, and referential IDs.

## Authoritative value metrics

`backend/src/utils/customerMetrics.js` is the single shared definition for Customer 360 metrics:

- **Qualifying order:** any order except `Cancelled` and `Refunded`.
- **LTV:** sum of qualifying order totals.
- **Orders:** count of qualifying orders.
- **AOV:** LTV ÷ qualifying order count.

The directory, profile header, Orders summary, segment logic, and API all use this server-side source. Client-provided totals are never used.

## APIs

All `/api/customers/*` endpoints require `protect`, `adminOnly`, and the existing `customers` permission.

| Endpoint | Purpose |
|---|---|
| `GET /api/customers` | Server-side search, pagination, sort, and combined filters |
| `GET /api/customers/search` | Command-palette / manual-order lookup by name, email, phone, WhatsApp, customer id, or linked order number |
| `GET /api/customers/segments` | Explainable New / Repeat / VIP / High Value / Inactive counts |
| `GET /api/customers/facets`, `/tags` | Reusable countries and normalized tags |
| `GET /api/customers/export` | Audited CSV export; no password/hash/token fields; spreadsheet-formula guarded |
| `POST /api/customers/bulk` | Add/remove tag or safely assign an existing active group, max 200 records |
| `GET /api/customers/:id` | 360 profile, metrics, recent orders, activity, wishlist, cart, reviews, loyalty, notes |
| `GET /api/customers/:id/orders` | Paginated existing-order rows plus backend summary |
| `GET /api/customers/:id/activity` | Paginated real activity only |
| `GET/POST /api/customers/:id/notes` | Internal append-only notes |
| `PATCH /api/customers/:id` | Safe profile/current delivery-address edit |
| `PUT /api/customers/:id/consent` | Explicit consent change with audit |
| `POST/DELETE /api/customers/:id/tags/*` | Normalized tag mutation with audit |
| `POST /api/customers/:id/contact/email` | Existing-mailer submit; marketing requires explicit opt-in and response says provider acceptance, not delivery |
| `POST /api/customers/:id/anonymize` | Administrator/Owner-only privacy action |

Customer Groups now provide real rule summaries, per-member reasons, paginated member previews, manual membership visibility, safe archive/restore, and safe delete cleanup.

## Segments

These are business engagement concepts, not roles:

- **New:** joined within 30 days with no more than one qualifying order.
- **Repeat:** two or more qualifying orders.
- **VIP:** lifetime qualifying spend above PKR 500,000.
- **High Value:** qualifying spend from PKR 100,000 through PKR 500,000.
- **Inactive:** last qualifying order is more than 180 days old, or an account with no qualifying order is older than 180 days.

Every displayed segment includes an explanation, for example: “VIP because lifetime spend is above PKR 500,000.”

## Actual persisted activity

Nothing was fabricated or retroactively guessed.

| Event | When written | Source |
|---|---|---|
| Product viewed | Signed-in product route tracked | storefront |
| Added to cart | Signed-in cart funnel event | storefront |
| Wishlist | Successful persisted wishlist add | storefront |
| Checkout started | Signed-in checkout route tracked | checkout |
| Purchase | Successful linked checkout/manual order | checkout or admin |
| Abandoned cart | Authenticated persisted cart capture (rate-limited timeline noise) | checkout |

Anonymous `PageView` records remain anonymous. Activity corrections are new facts; there is no activity edit/delete endpoint.

## Consent and contact behavior

- Email, WhatsApp, and SMS use `OPTED_IN`, `OPTED_OUT`, or `UNKNOWN`.
- Contactability does not imply marketing permission.
- A legacy `notify.marketingEmail === true` is honored only as a prior explicit preference for existing group-email compatibility; it is never inferred from an email address or phone number.
- Individual marketing email requires explicit `consent.email === OPTED_IN`.
- The mail endpoint only reports whether the configured SMTP provider accepted the request. It never claims delivery.

## Security and audit

- Customer admin APIs are protected and permission-restricted.
- Directory/profile projections whitelist fields; password hashes, JWT/reset/2FA secrets, session IDs, payment secrets, and tokens are not returned.
- Audited actions: profile update, consent change, note creation, tag changes, bulk group/tag operations, export, email contact attempt, group lifecycle, and anonymization.
- CSV output is formula-injection guarded and excludes secrets.

## QA results

### New Phase 4 suite

`node backend/test-phase4-customers.js` — **33 passed, 0 failed**

Coverage includes:

- list search/filter/segment pagination behavior;
- order-number search through persistent customer IDs;
- 360 metrics / orders / tags / real activity / notes;
- LTV, order count, AOV, cancelled/refunded exclusion;
- authorized and opt-out-blocked email behavior;
- group preview, rule explanations, persistence, and bulk group assignment;
- user ↔ order IDs;
- unauthorized access and forbidden-field projection;
- profile edit historical-order-snapshot integrity;
- persisted wishlist, product view, checkout, abandoned-cart activity;
- safe export.

### Regression / build QA

| Command | Result |
|---|---|
| `npm run build` in `frontend/` | Passed |
| `node backend/test-tier1.js` | 22 passed, 0 failed |
| `node backend/test-tier2.js` | 16 passed, 0 failed |
| `node backend/test-tier25.js` | 14 passed, 0 failed |
| `node backend/test-inventory-lifecycle.js` | Passed |

The requested filenames `backend/test-phase2-catalog.js` and `backend/test-phase3-orders.js` are **not present in the checked-out repository**. They were not recreated or falsely reported as run. Existing available regression suites were run instead.

## Screenshots

Captured from a local seeded QA pass in `qa/phase4/`:

1. `01-customers-list-desktop.png`
2. `02-customer-360-desktop.png`
3. `03-customer-360-orders-tab.png`
4. `04-customer-360-activity-tab.png`
5. `05-customer-groups.png`
6. `06-customer-tags.png`
7. `07-customer-loyalty.png`
8. `08-customer-360-mobile.png`
9. `09-customer-manual-order-prefilled.png`
10. `10-order-to-customer-360.png`

## Known limits / intentionally not fabricated

- Historical anonymous page views, guest orders, and carts are not auto-linked to a registered user. A safe manual merge/migration is not implemented.
- Existing `GiftCard` data has no customer ownership relationship in this repository. Customer 360 therefore presents no invented gift-card balance/history; this remains unavailable until a safe owner relationship is added.
- Existing activity storage has no persisted device detail beyond the attributable request’s coarse device classification.
- Group preview scans up to 10,000 registered customers and marks its count as an estimate/truncated when that bound is reached; it does not invent a full count.
- Phase 5 campaign automation/scheduling/import work was not started.
