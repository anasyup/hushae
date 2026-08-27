# AGENT MEMORY — HUSHAE (read this FIRST in every new chat)

## 0. WORKFLOW — SAB AGENTS KE LIYE LAZMI (mandatory pipeline)
**Agent (code change + local build check) → commit → GitHub push (main) → Vercel AUTO deploy → live verify → report.**
- Koi bhi agent live site ko direct edit NAHIN karta; sirf ye pipeline.
- Push se pehle `git fetch + rebase origin/main` (parallel agents hote hain).
- Push ke baad Vercel deploy ka WAIT karo (index.html ka asset hash badalta hai),
  phir live pe content verify karo (class names / routes / API), hash-match se nahi.
- Sandbox quirks: `.git` + `/tmp/.ght` wipe ho sakte hain (recovery section 3).
- Koi file delete/rewrite nahi jab tak boss explicitly na kahe.

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
**Merchant control:** Settings → Notifications (`notificationPrefs`) gates `notify()` per event — disabled events are dropped before insert (see §7B).

## 6. CURRENT STATE — what exists / what is reserved
- **Built & live:** storefront, cart/checkout, orders desk, Overview dashboard, products/customers, promotions, settings editors (store, payments, shipping, checkout, accounts, security, taxes, legal-placeholder, loyalty, email, search, cart, reviews, experience, **business address, time zone, currency, weight unit, domain, languages, notifications**), theme editor, CMS, blog, backup.
- **New (2026-08-28, two sessions merged):** Store Settings group complete. Editors live in `frontend/src/admin/SettingsAddress.jsx` (SettingsBusinessAddress / SettingsTimezone / SettingsCurrency). Model: `businessAddress` (legalName, ntn, street, city, province, postalCode, country), `currency` (code, symbol, position, decimalSeparator, thousandSeparator — default symbol 'PKR' keeps legacy price output byte-identical), top-level `timezone` (default Asia/Karachi). Time Zone editor ALSO syncs `marketing.schedule.timezone` (promotions scheduling) — single source. **Critical fixes added by this session:** PUT whitelist in `routes/settings.js` now includes businessAddress/currency/timezone/**marketing** (marketing was missing → MarketingSettings saves were silently dropped — pre-existing bug); storefront wiring — `lib/format.js` `applyCurrencySettings()` drives every `pkr()` price (AppContext syncs on settings change; untouched defaults = legacy "PKR 1,250"); footer renders business address as one quiet line once any field is filled; `loyaltyConfig.earnRateText` follows currency too.
- **Reserved (route live, editor unbuilt — SettingsReserved):** metafields/metaobjects/custom-fields, billing/* (8), delete, migration, retention, system-status, error-logs, maintenance, api, webhooks, developer, flags, cache, config.
- **Still dead by origin (pre-existing, NOT broken by us):** ~200 nav routes like /admin/inbox-old-links (now tabs), channels/*, many integrations. Inbox links ab real tabs hain.
- **Analytics Hub duplicate removed on boss order** — /admin/analytics sirf GROWTH > Analytics > Overview se.

## 6B. ORDERS DESK — dedup decisions (boss: "same option 2 jagah nahi")
- Desk (ATELIER theme, Overview family) = single home for order workflow:
  tabs = pipeline (All/New/Processing/To Ship/Shipped/Delivered/Issues),
  presets = smart views, filters = payment/fulfillment/sort/search (NO status
  dropdown — tabs own status). Row = one-tap Advance + menu.
- Sidebar Orders group = sirf 4 distinct destinations: All Orders, Draft
  Orders, Abandoned Checkouts, Payment Issues (-> /admin/verification-queue).
- Old paths (/admin/orders/pending etc.) = <Navigate> redirects to desk tabs;
  routes placed BEFORE /admin/orders/:id.
- Desk ka apna bell REMOVED — topbar bell + /admin/inbox own notifications.
- Phase 2 DONE: tracking-at-ship — PATCH /api/orders/manage/:id/tracking
  (courierName/trackingNumber/trackingUrl), TrackingModal opens when an
  order moves into To Handover/Shipped/In Transit/Out for Delivery without a
  number (Skip never blocks), row menu 'Add tracking number'. Bulk advance +
  guardrails + bulk WhatsApp (wa.me links, human presses send) pehle se the.
  ORDERS DESK REDESIGN (boss reference files): od-* design system
  (orders-desk.css) — stat cards + real 7-day sparklines + change%, pill
  tabs, colored dot badges, reference table, SLA chip; light+dark tokens.
  Functionality 100% preserved (search+suggest, views, bulk, print, WA).
  Phase 3 DONE: SLA timers (24h amber/48h red), COD reconciliation page
  (/admin/cod-recon), call checklist pehle se tha. Orders page COMPLETE:
  phone-normalised search (0300/+92 300/300 sab match), WhatsApp prefill
  (stage+tracking+track link), tracking editor desk+OrderDetail dono me,
  customer Track page pe courier/tracking display. Baqi sirf optional
  polish (mobile density, auto-WhatsApp Business API integration).

## 7. APPROVED NEXT WORK (boss ne green light di)
1. **Reserved settings editors batch 1 — DONE (2026-08-28):** Business Address, Time Zone, Currency built, tested, live.
2. **Reserved settings editors batch 2 — DONE (2026-08-28):** Weight Unit, Domain, Languages, Notifications built, tested, live — Store Settings group ab FULLY complete (10/10 children real editors).
3. **Next candidates (boss decide kare):** a) Team & Roles (settings rail me routes already hain); b) Inbox per-row action buttons (optional polish); c) Custom Data group (metafields/metaobjects/custom-fields); d) storefront weight display (PDP pe formatWeight helper — units setting ready hai).

## 7B. SETTINGS BATCH 2 — architecture notes (session 2026-08-28 #3)
- Editors: `frontend/src/admin/SettingsStoreExtras.jsx` (SettingsUnits / SettingsDomain / SettingsLanguages / SettingsNotifications), same useSettingsSlice + Shell pattern as SettingsAddress.jsx. Lazy imports in App.jsx; SettingsReserved sirf baqi routes ke liye.
- Model: `units` (weight g|kg default g — products weightGrams me store, unit sirf display; dimension cm|in), `domain` (primary + useForSeo), `languages` (default en, enabled [en] — storefront English-only by brand direction; editor honest hai, fake language switching nahi), `notificationPrefs` (9 event toggles, sab default true = legacy behaviour byte-identical).
- **Backend wiring:** `orderFlow.notify()` ab `notificationPrefs` gate hai — TYPE_PREF_KEY map + payment.* prefix; unknown types kabhi gate nahi hote; 60s cache + `invalidatePrefsCache()` (settings PUT se drop). `routes/seo.js` baseUrl() ab async — `domain.useForSeo` ON ho to cleaned primary domain canonical/sitemap me, warna request host (unconnected domain indexing kabhi nahi tor sakta); 60s cache + `invalidateDomainCache()`. OrderNotification.type enum hai — naye event types add karne ho to enum + TYPE_PREF_KEY dono jagah.
- PUT whitelist: units, domain, languages, notificationPrefs (marketing wale bug ka sabak — naya key whitelist me lazmi).
- QA: in-memory Mongo tests — model defaults, default prefs = sab fire, disabled prefs drop, payment.* prefix, whitelist, robots.txt useForSeo on/off + domain sanitise. Sab pass.

## 8. HOUSE RULES (code)
- CSS specificity: shell styles Tailwind ke BAAD load hoti hain → kisi bhi class me `display` seedha mat likho jo responsive hide honi ho; `:where()` use karo.
- NAV data = single source: `NAV_SECTIONS` (AdminLayout) + `settingsNav.js`. Routes = `App.jsx`. Koi link remove karna ho to boss se confirm.
- Commit messages meaningful; parallel sessions ka kaam preserve (rebase); kabhi unki files commit mat karo.
- SSR scratch harness (`frontend/.scratch`) se sidebar/header render verify hota hai; kaam ke baad delete.

---
*Last updated: 2026-08-28 — Batch 2: Weight Unit / Domain / Languages / Notifications editors live → Store Settings group fully complete. notify() prefs gate + seo domain wiring + whitelist, sab tested. Nayi chat: pehle ye file, phir `git log --oneline -10`, phir kaam.*
