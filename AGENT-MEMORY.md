# AGENT MEMORY — HUSHAE (read this FIRST in every new chat)

> Ye file is project ki shared memory hai. Nayi chat me agent ko bolo:
> **"repo clone karo, AGENT-MEMORY.md parho, phir kaam shuru karo."**
> Har bare task ke baad is file ko update karna wajib hai.

---

## 1. PROJECT
- **Brand:** HUSHAE — Pakistani fashion e-commerce ("Second Skin, First Choice")
- **Live:** https://hushae1.vercel.app/  · **Admin:** /admin (login /admin/login)
- **Repo:** github.com/anasyup/hushae (branch `main`) · **Deploy:** Vercel auto-deploys on push to main (region sin1)
- **Stack:** Vite + React (frontend/) · Express + MongoDB serverless (backend/src, mounted via api/index.js) · Tailwind + custom token CSS · no PHP
- **Build check:** `cd frontend && npm install && npm run build` (same as Vercel)

## 2. BOSS (user) — how to work with him
- Roman Urdu / mixed likhte hain; reply bhi Roman Urdu me do.
- **Execution partner** chahiye: advise do, phir khud karo, test karo, deploy karo, sach bolo.
- **Kabhi kuch remove/delete/rewrite NA karo jab tak wo explicitly na kahe.** Move/organize ok hai, delete nahi.
- Ambiguity ho to **ek precise question** pucho (usne khud kaha hai "issue ho to puch lena").
- Design taste: **luxury editorial, clean, organized, "traffic jam" (clutter/spam) haram.** Reference = Shopify admin jaisa sidebar pattern (flat top rows, collapsible groups, icon-less indented children).
- Har change ke baad: build → commit → push → **Vercel READY hone tak wait** → live verify → report.

## 3. SANDBOON QUIRKS (Arena sandbox)
- Har nayi turn pe **`.git/` aur `/tmp/.ght` wipe** ho sakte hain. Recovery:
  `git init -b main; git remote add origin https://anasyup:<PAT>@github.com/anasyup/hushae.git; git fetch; git reset origin/main`
- GitHub PAT chat history me hai (boss ne diya tha); `/tmp/.ght` (mode 600) me likho, kabhi print/commit NA karo.
- `node_modules` bhi wipe hota hai → `npm install` dobara.
- Working tree me **doosre parallel sessions ki purani files** ho sakti hain → commit se pehle `git status` dekh ke sirf APNI files add karo, baqi `git checkout --` se discard.
- Push se pehle `git fetch + rebase origin/main` (parallel sessions push karti rehti hain). **Force-push kabhi nahi.**
- Live site **Vercel WAF** sandbox IP ko 403 deta hai agar browser **User-Agent** na bhejo → curl me UA header lazmi.
- Live verify **content se karo** (CSS/JS me class names grep), asset-hash se nahi — doosre sessions ke changes hash badal dete hain.

## 4. DESIGN SYSTEM (admin) — established decisions
- Tokens: `index.css` me `--admin-*` (light `:root` = white editorial canonical; `.dark-admin` = jet black). Shell chrome: `frontend/src/admin-shell.css` (`--adm-*` locals). Theme toggle topbar me (sun/moon), `lib/adminTheme.js`.
- **Main sidebar:** 224px; sections labelled (HOME / COMMERCE / STOREFRONT-gone / GROWTH / OPERATIONS / CHANNELS / APPS & INTEGRATIONS = 3 dropdown groups); groups = collapsible parents (icon+chevron), children = icon-less indented rows (`.adm-child`), active = soft fill + 2px left bar; bottom me **Settings** button + account block pinned.
- **Header (boss ka diya hua spec, har page pe same):** 48px white bar; left: 32px menu button + 1px divider + 15px/700 title; right: green Store-online pill, black pill Create, bordered View store, circular theme btn, circular bell + red badge. `.tb-*` classes. **`.tb-menu` ka display `:where()` me hai** — warna Tailwind `hidden/md:hidden` harti hai aur DO buttons dikhte hain (bug tha, fix hua).
- **Settings console** `/admin/settings*`: main sidebar hidden; apni sticky rail (`.set-rail`, 236px, bordered column, sticky header "Settings" + back link). Rail IA = `admin/settings/settingsNav.js` (15 settings groups + 6 STOREFRONT groups). Multi-child groups collapsible; single-child plain rows. Unbuilt editors = `SettingsReserved` (honest pane, nearest editor link) — **404 kabhi nahi**.
- Mobile: settings rail hamburger se drawer me; main sidebar drawer se.
- **Notification design** (boss-approved, reference screenshot jaisa fonts): bold 13-14px titles, muted 12.5px bodies, severity dots (info grey / success #10b981 / warning #f59e0b / danger #ef4444), bell dropdown max 8 + "View all in Inbox", `/admin/inbox` page with pill tabs All/Unread/Orders/Payments/System. Classes `.nb-*` / `.ib-*`.

## 5. BACKEND notification events (live)
`OrderNotification` model + `flow.notify()` in `backend/src/utils/orderFlow.js`.
Firing: order.created, order.status, payment.*, issue.raised, print.done, bulk.done, **stock.low** (crossing <=5 downward only), **review.new**, **question.new**. API: GET `/api/notifications?limit=`, POST `/api/notifications/read {id|all}` (adminOnly).

## 6. CURRENT STATE — what exists / what is reserved
- **Built & live:** storefront, cart/checkout, orders desk, Overview dashboard, products/customers, promotions, settings editors (store, payments, shipping, checkout, accounts, security, taxes, legal-placeholder, loyalty, email, search, cart, reviews, experience, **business address, time zone, currency**), theme editor, CMS, blog, backup.
- **New (2026-08-28, two sessions merged):** Store Settings group complete. Editors live in `frontend/src/admin/SettingsAddress.jsx` (SettingsBusinessAddress / SettingsTimezone / SettingsCurrency). Model: `businessAddress` (legalName, ntn, street, city, province, postalCode, country), `currency` (code, symbol, position, decimalSeparator, thousandSeparator — default symbol 'PKR' keeps legacy price output byte-identical), top-level `timezone` (default Asia/Karachi). Time Zone editor ALSO syncs `marketing.schedule.timezone` (promotions scheduling) — single source. **Critical fixes added by this session:** PUT whitelist in `routes/settings.js` now includes businessAddress/currency/timezone/**marketing** (marketing was missing → MarketingSettings saves were silently dropped — pre-existing bug); storefront wiring — `lib/format.js` `applyCurrencySettings()` drives every `pkr()` price (AppContext syncs on settings change; untouched defaults = legacy "PKR 1,250"); footer renders business address as one quiet line once any field is filled; `loyaltyConfig.earnRateText` follows currency too.
- **Reserved (route live, editor unbuilt — SettingsReserved):** units, domain, languages, notifications, metafields/metaobjects/custom-fields, billing/* (8), delete, migration, retention, system-status, error-logs, maintenance, api, webhooks, developer, flags, cache, config.
- **Still dead by origin (pre-existing, NOT broken by us):** ~200 nav routes like /admin/inbox-old-links (now tabs), channels/*, many integrations. Inbox links ab real tabs hain.
- **Analytics:** single-page editor at /admin/analytics (range picker + overview KPIs). GROWTH sidebar me Analytics group wapas hai (Overview/Sales/Orders/Products/Customers/Inventory/Marketing/Conversion/Storefront/Finance/Live/Custom/Export — unbuilt links dead by origin, "traffic jam" avoid karna). Tabbed Analytics (Dashboard|Reports|Live View) **boss ke kehne pe revert** (2026-08-28 evening).
- **Orders desk:** tracking-at-ship modal, SLA timers, COD reconciliation page, phone-normalised search, WA prefill — sab **boss ke kehne pe revert** (2026-08-28 evening) — desk apne purane structure pe hai. Kisi bhi naye admin agent ko pehle OrdersDesk/AdminLayout ka current structure parhna.

## 6C. PRODUCTS AREA — Phase 0 spec + Phase 1 (boss-approved direction, 2026-08-28)
- **Spec:** `PRODUCTS-AREA-SPEC.md` (root) = single source of truth. Principle:
  one design kit + 5 archetypes (Table/Detail/Settings/Wizard/Ops), workflow-first,
  NO per-page design. Admin list pages dark-utility language me likho
  (`text-white` family) — admin-light.css remap handles white theme.
- **IA fixed (404 kabhi nahi, one home per concept):** sidebar Products group ke
  6 dead routes wired — Inventory → redirect `/admin/ops/inventory` (real home);
  Bundles → redirect `/admin/bundles`; Import/Export → redirect `/admin/products?import=1`
  (CSV modal auto-open, flag strip); Attributes & Variants / Digital Products /
  Product Settings → `admin/AdminReserved.jsx` honest pane (SettingsReserved ka
  bhai, `.set-reserved` + `adm-chip` classes reuse). Nav label Catalog → Products.
- **Catalog = reference Table archetype:** metrics strip ab 6 clickable saved
  views (All/Active/Draft/Archived/Low/Out — status vs stock mutually exclusive),
  sticky bulk bar me Edit + Activate + Archive (bulk PATCH isActive), rows me
  inline stock −/+ stepper (optimistic + PATCH /api/products/:id/stock {delta};
  backend low-stock bell sirf downward crossing pe). Grid/list views, CSV modal,
  states sab preserved — rewrite nahi, extend.
- **Phase 2 candidates:** dedicated Inventory page sirf agar ops console kam pare
  (data se decide); global variant option templates; Product Settings editor;
  Categories/Collections archetype pass; server-side pagination (catalog >2k pe).

## 7. APPROVED NEXT WORK (boss ne green light di)
1. **Reserved settings editors — DONE (2026-08-28):** Business Address, Time Zone, Currency built, tested, live. Store Settings group complete.
2. **Next candidates (boss decide kare):** a) baki reserved editors — units, domain, languages, notifications; b) Team & Roles (settings rail me routes already hain); c) Inbox per-row action buttons (optional polish).

## 8. HOUSE RULES (code)
- CSS specificity: shell styles Tailwind ke BAAD load hoti hain → kisi bhi class me `display` seedha mat likho jo responsive hide honi ho; `:where()` use karo.
- NAV data = single source: `NAV_SECTIONS` (AdminLayout) + `settingsNav.js`. Routes = `App.jsx`. Koi link remove karna ho to boss se confirm.
- Commit messages meaningful; parallel sessions ka kaam preserve (rebase); kabhi unki files commit mat karo.
- SSR scratch harness (`frontend/.scratch`) se sidebar/header render verify hota hai; kaam ke baad delete.

---
*Last updated: 2026-08-28 — Products area Phase 0+1 live (Catalog = reference Table archetype). Usi raat Analytics tabs + orders batch (tracking/SLA/COD/phone-search) + settings batch-2 (units/domain/languages/notifications) boss ke kehne pe revert huye ("pehle jaisa"); Business Address/Time Zone/Currency editors + whitelist fix live rehte hain. Nayi chat: pehle ye file, phir `git log --oneline -10`, phir kaam.*
