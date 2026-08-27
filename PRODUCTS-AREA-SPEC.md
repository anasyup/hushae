# PRODUCTS AREA — Architecture Spec (Phase 0)

> Approved direction (boss, 2026-08-28): one design kit + page archetypes,
> workflow-first. Shopify ko screens se nahi, speed + inline actions + kam
> clicks se harana hai. Ye file Products area ki single source of truth hai.

---

## 1. Principle — no per-page design

Har page alag design NAHI hota. Poora admin panel 5 archetypes se banta hai;
har page ek archetype ka instance hai. Consistency = easy to use.

| Archetype | Pages (Products area) | Kit pieces |
|---|---|---|
| **Table/List** | Catalog, Categories, Collections, Reviews & Questions | metrics strip (clickable saved views) · search · filter row · selection + bulk bar · rows with inline actions · pagination · empty/loading/error |
| **Detail/Edit** | Product edit (`ProductForm`) | left content column + right meta rail |
| **Settings form** | Product Settings (future) | editorial settings pattern (EdSection + rail) |
| **Wizard** | Import, guided product creation | step bar, one decision per step |
| **Ops dashboard** | Inventory ops | signals + action rows, no chart clutter |

Authoring language: dark-era utilities (`text-white`, `border-white/10`,
`bg-[#050505]`…) — `admin-light.css` remaps them into the canonical white
theme. Don't mix hardcoded hex text colors into list pages.

## 2. IA — one home per concept

Sidebar Products group (COMMERCE):

| Child | Destination | Status |
|---|---|---|
| **Products** (renamed from Catalog) | `/admin/products` | live — reference Table archetype |
| **Inventory** | `/admin/products/inventory` → redirect `/admin/ops/inventory` | real home = Operations console (stock tab) |
| **Categories** | `/admin/categories` | live |
| **Collections** | `/admin/collections` | live |
| **Reviews & Questions** | `/admin/reviews` | live |
| **Attributes & Variants** | `/admin/products/attributes` | honest reserved pane — variants live on the product page; global option manager later phase |
| **Bundles & Kits** | `/admin/products/bundles` → redirect `/admin/bundles` | real home already exists |
| **Digital Products** | `/admin/products/digital` | honest reserved pane — not in the business yet |
| **Import / Export** | `/admin/products/import` → redirect `/admin/products?import=1` | opens the CSV modal on the catalog |
| **Product Settings** | `/admin/products/settings` | honest reserved pane until a real editor is scoped |

Rule: **404 kabhi nahi.** Dead destinations get an honest pane or a redirect
to the real home. Koi duplicate table nahi (Inventory = ops view, catalog ka
copy nahi). Koi link remove karna ho to boss se confirm.

## 3. Table archetype contract (Catalog = reference)

- Metrics strip = clickable saved views with live counts (All / Active /
  Draft / Archived / Low stock / Out of stock). Deep-linkable via query
  params (`?stock=low|out`, `?status=`, `?active=0`).
- Filters: search (client), status, category, More (gender/tier/stock).
- Selection: page-level select-all; sticky bulk bar appears on selection with
  Edit (full modal), Activate, Archive, Clear.
- Inline actions: stock −/+ stepper in the row (optimistic, PATCH
  `/api/products/:id/stock` `{delta}`), edit/duplicate/archive/publish/delete
  in the row menu.
- States: TableSkeleton loading · EditorialError with retry · EditorialEmpty
  (different copy for filtered vs truly empty).
- Pagination 50/page (client-side today; move server-side if catalog > 2k).

## 4. Roadmap

- **Phase 1 (DONE 2026-08-28):** dead routes honest/redirected · Catalog
  upgraded to the reference Table archetype · nav label Catalog→Products.
- **Phase 2:** dedicated Inventory page IF the ops console proves
  insufficient (low stock queue, reorder workflow surface, movements log) —
  tab of CommerceOps already covers stock ops; decide with data, not vibes.
- **Phase 3:** Attributes & Variants global option templates · Product
  Settings editor · Categories/Collections pass to re-confirm they match the
  archetype · server-side pagination.
- **Future (SaaS ambition):** the archetype kit (DataTable, MetricsStrip,
  BulkBar, EmptyState set) is what gets reused across merchants — keep it
  component-pure, no page-specific coupling.

## 5. House rules for this area

- Extend, don't rewrite — existing actions preserved in every pass.
- Dark utilities only in list pages (theme remap handles light).
- One home per concept; same option 2 jagah nahi.
- Har change: build → commit → push → READY → live verify → report.
