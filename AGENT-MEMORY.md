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

## 0A. 🔒 DESIGN BRIEF (binding) + OPEN ISSUE — 2026-08-28

**Nayi file: `DESIGN-BRIEF.md`** — boss ki premium/luxury UI requirements ka binding spec
(typography, palette, icons, rounded cards, glass-only-where-suitable, gradients, soft
shadows, spacing, micro-interactions, page transitions, responsive, maintainable code;
tech: advanced CSS + `@keyframes`, Tailwind utilities, GSAP **or** Framer Motion).
Har admin UI change us checklist ke against judge hoga.

**RESOLVED (2026-08-28, commit `2640143`, live verified):** Analytics ke lower sections
(R0–R8) "organized nahi lag rahe" thay — random order, same-weight stacked tables, misaligned
numbers, inconsistent empty states. Ab sab ek hi card + 12-column row system par hain.

**STATUS: DONE (5 rounds, sab live verified).**
1. `2640143` — report sections ek hi card + 12-column row system par (boss: "organized nahi
   lag rahay, paragraph jaisay").
2. `ee052e3` — un sections me charts add hue (boss: "charts jaisa candlestick jaisa doo").
3. `822da1e` — **chart redesign: monochrome system** (boss: "notebook par diagrams ban rahe
   hain, Shopify se inspiration lo"). Diagnosis Polaris data-viz guidelines se: v1 ne 4
   documented rules tori thin — 6-hue rainbow palette, full-bleed grid + dashed overlays,
   gauge needle (speedometer), aur "Rs 12,600" jaise lambe axis labels.

**4. `6e7397f` + `9f80c06` — FINANCE page rebuilt (boss: "redesign karo, sab functions add karo,
internet se templates dekho"). Research: Shopify Finance (payouts, payout reconciliation
report, reserves), ecommerce P&L practice (A2X/Finaloop/SAL), reconciliation guides.
Consistent finding: **the deposit is not the revenue** — page ko dono ke beech ki har
deduction dikhani chahiye.

**5. `af5a2a8` — FINANCE ko **ATELIER design** pe rebuild kiya (boss: "full page graphs chart mat
banao, jaise Overview page pe hain waise karo"). Pichla version Finance ka apna teesra design
language tha (fn-* namespace + SVG waterfall) — admin me pehle se do thay.

**RULE: admin me naya design language mat banao.** Finance ab `Overview.module.css` **direct
import** karta hai (copy nahi), isliye dono pages pixel-identical hain aur drift nahi kar sakte.
Naya page banate waqt yehi karo — `import styles from './Overview.module.css'`, phir `.ovw` >
`.wrap` > `.topbar` / `.stats` / `.grid3` / `.grid4` / `.tbl`.

Charts **Overview jitne hi restrained**: ek profit-trend line, ek cost doughnut, 6 sparklines.
Baqi sab tables — kyunke paise ke liye exact figure shape se zyada zaroori hai.

**Chart restraint rule:** "full page charts" = galat. Overview pattern follow karo: KPI cards +
1-2 charts + tables.

**FINANCE — single source of truth rule (sabse ahem):**
`backend/src/utils/orderEconomics.js` order-level profit ka **single source of truth** hai.
Koi bhi finance surface apna P&L browser me dobara compute NA KARE. Purana Finance.jsx yehi
karta tha aur apne hi order-profitability table se disagree karta tha — 10-order sample pe
net profit **PKR 1,120 overstate** (margin 27.2% dikhta, asal 24.6%), kyunke:
  - gateway fees bilkul charge nahi karta tha
  - per-order `courierCost`/`packagingCost`/`courierByCity` ignore karke flat settings rates
  - failed orders ka sunk cost compute karta tha par `totalExpense` me subtract nahi karta tha
Ab sab `GET /api/finance/pnl` se aata hai jo `summarise()` use karta hai. Naya finance kaam
ho to usi endpoint ko extend karo.

Endpoint `ladderCheck` aur `reconcileDrift` return karta hai — dono 0 hone chahiye. Na ho to
page khud warning dikhata hai (chup reh kar galat statement issue nahi karta).

**Finance files:**
- `frontend/src/admin/finance/pnl.js` — pure helpers (delta, deltaTone, buildStatement,
  buildMemos, runwayDays, buildKpis). Statement 5 groups me hai aur **har group apne andar
  add hota hai**: Income → Cost of goods → Fulfilment & fees → Lost orders → Operating costs.
- `frontend/src/admin/finance/exportPnl.js` — `buildPnlHtml()` pure (testable),
  `exportPnlReport()` sirf window.open wrapper. Memos ("Not revenue") kabhi income me
  fold nahi hote.
- `frontend/src/admin/finance/finance.css` — `fn-*` namespace, shared tokens.
- `WaterfallChart` `analytics/svgcharts.jsx` me hai (ink bars, sirf final result coloured).

**Test suites (sab `node scripts/<name>.mjs`):**
- `backend/scripts/test-finance-pnl.cjs` (40) — REAL router ko HTTP pe mount karke, stubbed
  models. Prove karta hai per-order profit ka sum = P&L contribution − sunk cost.
- `frontend/scripts/test-finance-pnl-ui.mjs` (72), `test-finance-export.mjs` (45),
  `test-analytics-charts.mjs` (115), `test-analytics-sections.mjs` (34).

**CHART DESIGN RULES (ye dobara na torna):**
- **Ek ink colour** saara data carry karta hai. Green/red SIRF direction (up/down) aur status
  (in band / out of band) ke liye. Rank = **opacity**, naya hue nahi.
- **No full-bleed grid**, no dashed overlays, no needle/arc. Axis lines "unobtrusive".
- Axis labels **compact**: `compact()` helper → `Rs 12.6k` (max ~3 numeric chars + 1 decimal).
- **Value on the mark** — point bina colour ke bhi samajh aa jaye (accessibility rule).
- **Chart restraint** — har chart ek sawal ka jawab de. Pie/donut 6 slices ke baad table ban
  jata hai, isliye `SplitBar` (100% bar + ranked list) use hota hai.

**REUSE KARO, DOBARA MAT BANAO:**
- `src/admin/analytics/sections.jsx` — Section / HeadRow / Row / Metric / Chip / EmptyState
  (BenchRow hata diya gaya — BandMeter ne replace kiya)
- `src/admin/analytics/columns.js` — saare column spans (lead 4 + metrics 8 = 12 grid)
- `src/admin/analytics/svgcharts.jsx` — CandleChart / TrafficScatter / SplitBar / BandMeter
  + pure helpers `toCandles`, `bandPosition`, `compact`, `money`, `scale`
  (DonutChart, ParetoChart, GaugeChart, BubbleScatter **hata diye gaye**)
- `src/admin/analytics/charts.css` — `cx-*` namespace, `--cx-ink` + `--cx-up/--cx-down` only
- Tests: `frontend/scripts/test-analytics-charts.mjs` (79 assertions, design rules bhi assert
  karta hai), `frontend/scripts/test-analytics-sections.mjs` (33). Dono `react-dom/server` se
  REAL components render karte hain — `node scripts/test-<name>.mjs`.

**Chart.js note:** bundle me hai, par candlestick ke liye extra plugin chahiye aur styling
brief tak nahi pohanchti — isliye charts hand-rolled SVG hain (koi nayi dependency nahi).

Naya kaam shuru karne se pehle `DESIGN-BRIEF.md` §1–§5 ka checklist lagao.

---

## 0B. ⚠️ VERIFICATION NOTICE — 2026-08-28 (read before trusting any claim below)

**Is file ke §6/§7/§7B ke kuch claims code se match nahi karte. Code jeeta.**

Ek session ne Batch 2 (Weight Unit / Domain / Languages / Notifications editors)
banaya aur yahan "built, tested, live" likh diya. Uske BAAD boss ne kaha "as
before" aur commit `7632dc9` ne wo revert kar diya. `git log` me original commit
(`b9a9080`) upar dikhta hai, isliye padhne wale ko lagta hai wo live hai — **wo
history me hai, code me nahi.** Memory file update nahi hui.

Verified against `origin/main` @ 2026-08-28 (har claim grep se, anumaan se nahi):

| §6/§7B ka claim | Actual |
|---|---|
| `SettingsStoreExtras.jsx` me 4 editors | File **maujood nahi** |
| Model me `units`/`domain`/`languages`/`notificationPrefs` | **koi key nahi** — sirf `businessAddress`/`currency`/`timezone` |
| PUT whitelist me batch-2 keys | **nahi** (whitelist me aaj bhi nahi hain) |
| `notify()` ab `notificationPrefs` gate karta hai | `grep notificationPrefs\|TYPE_PREF_KEY` → **zero hits** |
| `seo.js` baseUrl async + `useForSeo` | `baseUrl(req)` **sync**, `useForSeo` **zero hits** |
| "Store Settings group FULLY complete (10/10)" | **6/10** — baqi 4 `SettingsReserved` hain (App.jsx L393-396) |

**RULE (naya, wajib):** is file ka koi bhi "DONE / live / built" claim use karne se
pehle **ek command se verify karo** (file exists? key in whitelist? grep hits?).
Ye file *context* ke liye hai, *state-of-the-world* ke liye nahi. State hamesha
code se lena hai. Aur: **jo session code change kare, usi session me ye file bhi
update kare — revert/re-apply bhi.** `git log` memory ka substitute nahi hai.

**RULE (naya):** koi bhi nav link / settings key add karo to `cd frontend && npm run
check:admin` chalao. Ye 3 bug classes pakadta hai jo `vite build` aur `tsc` dono se
nikal jaate hain (dekho §9).

---

## 0C. LIVE BUG FIXED 2026-08-28 — Search & Discovery settings NEVER saved

`routes/settings.js` ke PUT whitelist me **`search` aur `discovery` kabhi the hi
nahi**. Natija: Settings → Search & Discovery pe "Search settings saved" toast
aata tha, aur write **silently discard** ho jata tha. Synonyms, `minChars`,
fuzzy tolerance, blocked terms, aur saare discovery toggles — **store ki poori
zindagi se ek bhi search setting persist nahi hui.** `marketing` wale bug
(c0f0030) ka exactly same class; us waqt `marketing` add hua tha, `search`/
`discovery` reh gaye.

Pehle se evidence mojood tha, bas kisi ne padh ke joda nahi:
`backend/src/utils/searchEngine.js` L45 me comment hai — *"MEASURED BUG: …
`settings.search` has never been SAVED"* (q=panty → 1 fuzzy match instead of the
whole brief category). Root cause yahan tha, fix wahan nahi kiya gaya tha.

**Fix:** `'search', 'discovery'` whitelist me add kiye (`backend/src/routes/settings.js`).
**`adminShare` deliberately add NA kiya** — wo `routes/auth.js` L466 se direct
write hota hai aur share-link admin session mint karta hai; settings PUT se
settable hone ka matlab privilege escalation hai. Code me comment likh diya hai
ke koi isey "complete" na kare.

**Test:** `backend/test-settings-whitelist.js` — in-memory Mongo, real route, real
`searchConfig()`. 10/10 pass. `adminShare`-not-settable bhi pin kiya hua hai.

---

## 0D. REJECTED TASK — "PDP pe weight display" (do NOT re-add as specified)

Ek approved candidate tha "storefront weight display (units setting ready hai)". **Dono
hisson se galat tha** — `units` setting batch-2 revert ke saath chali gayi, aur field
customer-facing hai hi nahi. 5 checks se confirm:

1. `models/Product.js` L40 — upar comment: *"Never shown to customers. Only visible to admin."*
2. Field `costPrice`/`barcode` ke group me hai → **shipping mass**, fabric GSM nahi
3. Live API probe: product keys me `weightGrams` **hai hi nahi** — public response usey expose nahi karti
4. Koi seed populate nahi karta → **poora catalog `weightGrams: 0`**
5. Koi consumer nahi (`grep weight` in shipping routes/utils → 0 hits; shipping flat-rate hai)

Yaani ye banate to har PDP pe ek maut "Weight: 0 g" line aati. Agar boss sach me fabric
weight dikhwana chahein to **naya customer-facing field** chahiye (e.g. `fabricGsm` +
`productSections`-style PDP spec blocks), `weightGrams` ka reuse nahi. Wo alag task hai,
boss ki haan se hoga.

---

## 9. ADMIN INTEGRITY GUARD — `npm run check:admin` (new 2026-08-28)

`frontend/scripts/check-admin-integrity.mjs` (zero-dep, no build needed) 3 cheezein
check karta hai — ye dono bug classes `vite build` **aur** `tsc --noEmit` se nikal
jaate hain kyunke ye *files ke beech* ki wiring defects hain, syntax defects nahi:

1. **nav → route**: `NAV_SECTIONS` + `settingsNav.js` ke `to:` targets `App.jsx`
   ke routes se match hote hain (param routes, `*` wildcards, `<Navigate>` redirects
   resolved maane jaate hain).
2. **settings key → model + PUT whitelist**: koi bhi editor jo key PUT kare, wo model
   me aur whitelist me honi chahiye (§0C wali class — is guard ne hi dhoonda tha).
3. **import → file on disk**: static + dynamic `import('./x')` targets mojood hon
   (`SettingsStoreExtras.jsx` wali class).

**Ratchet:** repo me ~166 pre-existing dead nav links hain jo boss ne hatane nahi
kahе (`admin-integrity.baseline.json` me frozen). Sirf **NEW** finding exit 1 deta hai.

```
cd frontend
npm run check:admin                 # ratchet — CI/pre-push ke liye
npm run check:admin -- --report     # sab findings, kabhi fail nahi hota
npm run check:admin -- --selftest   # guard ka apna parser test (12/12)
npm run check:admin -- --reconcile  # naya state deliberately accept karo + commit karo
```

Guard ka apna self-test lazmi hai: pehle revision me mera scanner har `,` ke baad
space pe break ho gaya tha aur "0 findings" dikha raha tha — yaani **clean bolti hui
cheez khamiyaat chupa rahi thi**. `--selftest` ab us class ko marne ke liye hai.

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
- **Built & live:** storefront, cart/checkout, orders desk (rebuilt 746d8db to boss's reference), Overview dashboard, products/customers, promotions, settings editors (store, payments, shipping, checkout, accounts, security, taxes, legal-placeholder, loyalty, email, search, cart, reviews, experience, **business address, time zone, currency**), theme editor, CMS, blog, backup. **Products page = ATELIER luxury theme (6C).**
- **REVERTED by boss order (7632dc9):** settings batch 2 (weight unit/domain/languages/notifications editors + notificationPrefs gate + seo domain wiring), tabbed Analytics, orders tracking batch. Dobara sirf boss ke explicit order pe. SettingsStoreExtras.jsx ka ghost working-tree copy repo me untracked para hai — commit KABHI nahi karna.
- **New (2026-08-28, two sessions merged):** Store Settings group complete. Editors live in `frontend/src/admin/SettingsAddress.jsx` (SettingsBusinessAddress / SettingsTimezone / SettingsCurrency). Model: `businessAddress` (legalName, ntn, street, city, province, postalCode, country), `currency` (code, symbol, position, decimalSeparator, thousandSeparator — default symbol 'PKR' keeps legacy price output byte-identical), top-level `timezone` (default Asia/Karachi). Time Zone editor ALSO syncs `marketing.schedule.timezone` (promotions scheduling) — single source. **Critical fixes added by this session:** PUT whitelist in `routes/settings.js` now includes businessAddress/currency/timezone/**marketing** (marketing was missing → MarketingSettings saves were silently dropped — pre-existing bug); storefront wiring — `lib/format.js` `applyCurrencySettings()` drives every `pkr()` price (AppContext syncs on settings change; untouched defaults = legacy "PKR 1,250"); footer renders business address as one quiet line once any field is filled; `loyaltyConfig.earnRateText` follows currency too.
- **TEAM & ROLES cluster (2026-08-28):** `/admin/settings/team` + `/admin/settings/roles` = real `SettingsTeam.jsx` editor (a523771; staff without seat paywalls). **NEW `SettingsPermissions.jsx` (abc1393):** read-only Roles & Access matrix (roles × areas) driven by `ROLE_ACCESS` now exported from `AdminLayout.jsx` (single source) + live per-role member counts from `/security/users`; honest "roles are fixed" note. Wired to `/admin/settings/permissions` + `store-access`/`product-access`/`order-access`/`customer-access`/`finance-access` (were dumping generic SettingsSecurity). Stale shadow routes for `/team`/`/roles`→SettingsSecurity removed (they already hit SettingsTeam). `getRoleLabel` also exported. 404-ke liye `audit-logs` still SettingsSecurity. **Note:** §7's old claim "team/roles render SettingsSecurity" was stale — code jeeta (SettingsTeam was already wired).
- **Reserved (route live, editor unbuilt — SettingsReserved):** metafields/metaobjects/custom-fields (→ SettingsMetafields feed same cluster), billing/* (8), delete, migration, retention, system-status, error-logs, maintenance, api, webhooks, developer, flags, cache, config.
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

## 6C. PRODUCTS AREA — Phase 1 + ATELIER theme (boss-approved, 2026-08-28)
- **Spec:** `PRODUCTS-AREA-SPEC.md` (root). Principle: one design kit + archetypes, workflow-first, no per-page design.
- **IA (404 kabhi nahi, one home per concept):** ~~Inventory → redirect `/admin/ops/inventory`~~ **UPDATE (boss order):** Inventory sidebar entry REMOVED (f7ce97f) — inventory ops sirf Operations console `/admin/ops/inventory` se. Redirect route bhi baad me parallel session ne hata di (fb1aeb7); `/admin/products/inventory` ab app ke NotFound pe jata hai — bookmark wapas redirect karwana ho to ek line ka route hai · Bundles → redirect `/admin/bundles` · Import/Export → `/admin/products?import=1` (CSV modal auto-open) · Attributes/Digital/Product Settings → `admin/AdminReserved.jsx` honest pane. Nav label **Products** (was Catalog).
- **ATELIER THEME MIGRATION (commit 6a09ccc):** /admin/products ab boss ke ATELIER luxury reference (detailed_prompt_same_as_us.txt) ke EXACT DNA me hai — `frontend/src/admin/products-atelier.css` scoped `.pa-*` system: bg #f8f8f7, white cards #ececec hairlines, Inter, buttons 26-36px radius 7-10, badges 20px pill semantic colors, stagger cardIn, shimmer skeleton, sticky bulk bar, table-layout fixed (no horizontal scroll), mobile cards <900px. Same-family rule: agle pages isi CSS pe banao, values mat badlo.
- **Working features (sab preserved):** 6 clickable saved-view stat cards (All/Active/Draft/Archived/Low/Out live counts ke sath), search + status/category + More filters, list/grid toggle, selection bulk bar (Edit modal + Activate + Archive), inline stock −/+ stepper (optimistic + PATCH delta), CSV import/export, duplicate/publish/archive/delete, deep links, pagination 50/page.
- **Categories page bhi ATELIER (commit c363432):** 4 clickable stat views (All/Women/Men/Disabled), live search, quick Disable/Enable one-tap (enable NEW — PUT isActive), ATELIER modal with slug preview + image preview + Active switch, shimmer/empty/error states, mobile cards. Kit me naye shared parts: pa-field/pa-textarea/pa-img-preview/pa-switch + pa-stats-4 — `products-atelier.css` ab shared Vite chunk hai (Products + Categories dono).
- **Collections page bhi ATELIER (commit ac7f5d5):** card grid (16:9 image + hover zoom), 4 stat views (All/Featured/Smart/Hidden), live search, quick Hide/Show card se (PUT isActive — NEW), badges Homepage/Smart/Hidden, ATELIER editor modal with smart rules (tag chips black pills), manual product picker, switches. Sab logic preserved.
- **LOGIN FRAMER MOTION PASS (00d1ee9, boss: js modern animation use karo):** MotionConfig reducedMotion=user, brand stagger springs, motion-value 3D tilt (useMotionValue/Spring/Transform), AnimatePresence step transitions (login↔OTP), animated errors/caps, whileHover/whileTap tactility. GSAP bhi deps me hai agar chahiye ho. Live 3/3.
- **LOGIN AESTHETIC PASS 2 (1e196a0):** input icons (Mail/Lock) + focus-within shift, warm aurora mesh drift, card 3D tilt (2.4deg, reduced-motion safe), button shine sweep, OTP caret gold, TLS trust chip. Live 3/3.
- **LOGIN MODERN PASS (d9c17e5, boss: or modern look):** CSS-only refinement — brand panel cinematic sheen + animated gold hairline, dot-grid alabaster panel, 20px float card + spring entrance + glass kicker, 46px inputs + 4px focus ring, OTP 58px tracked, obsidian-gradient button + hover lift + busy spinner, error pill + shake, store-dot ping, reduced-motion safe. Live 3/3. NOTE: overview boss ne palay-jassa revert karwaya (d68e88c); drilldown history me mehfooz (5b677f0).
- **OVERVIEW DRILLDOWN (5b677f0, boss: phelay jasa lag raha tha):** reference ka signature interaction add — stat click → slide-down panel (border 2px #111, radius 14, shadow 0 10px 30px, slideDown .4s): daily trajectory chart (black 2.2 + points vs Previous gray dashed, real prev-window fetch), current + delta, open-report link. Stat active ring+scale. Ye VISIBLE farq hai jo pehle missing tha.
- **OVERVIEW SPEC-ALIGN (60f0263, boss exact token sheet):** over-polish (gradients/glow/16px) HATA kar reference ke exact tokens lagaye — stat hover -2px + active ring 0 0 0 2px #111 + scale 1.02, btn-black 36/10/#222, btn-sm 30/8, pill 36/10, icons #6b7280→#111, no gradients. Chart.js 4.4.1 bundled self-contained; toast/modal/drilldown/live/search interactions reference jaise pehle se. Balanced polish.
- **OVERVIEW POLISH PASS (52c47b5, boss: or khoobsurat):** Overview.module.css refinement layer — gold-whisper canvas wash, sticky glass topbar, stat cards 16px + layered shadows + cursor-tracked gold glow + icon chips + 21px tabular values + delta pills, card gradients, q-btn lift/press physics, insight hover spine, dark parity, reduced-motion safe. Live 3/3. CSS-only = zero logic risk.
- **ANALYTICS SPEC PASS 2 (a7f7a2d):** gaps closed — Custom date range (from/to + equal-length prev compare), Acquisition card (Q1: sessions by source Instagram/TikTok/WhatsApp/Google/Direct from first-party referrer), funnel rows pe benchmark targets (50-60/20-25/12-15/8-10%). Live 4/4.
- **ANALYTICS INTELLIGENCE PAGE (d455929, boss spec poora):** /admin/analytics = 4-question engine. Date engine (Today/7/30/90/YTD + vs Previous/vs Last Year), 5 telemetry tiles (GMV, Net Realized after cancels+COD risk, Conversion vs benchmark, AOV, Return Patronage) delta pills ke sath; Revenue Trajectory (area + 7D MA + index tooltip scrubber, zero CDN) + 5-stage funnel drop diagnostics; R1 converters vs burners, R2 coupon yield + cart recovery ROI, R3 VIP tiers + repeat gap, R4 courier on-time/RTO + city RTO. Backend /analytics/executive. Quiet luxury palette (porcelain/alabaster/hairline/obsidian; emerald/amber/crimson state only). Live 5/5. NOTE: verify polls me MarketingAnalytics substring trap se bacho (\b use karo).
- **EDITABLE ORDERS + AUDIT (f811f81, boss requirement):** OrderDetail me customer Edit form (name/phone/address/city/postal) + payment Update form (method COD→Bank Transfer etc + status + txn id + note). OrderActivity model = audit trail; items/status/payment/customer sab changes logged; Timeline tab merged history; OrdersDesk pe Recent order activity feed card. Endpoints: PATCH :id/customer, extended :id/payment, GET :id (activity included), GET /orders/admin/activity. Live 4/4.
- **ORDER DETAIL v4 (0de5b95, boss: templates jasa, storefront NA chhedna):** items ab REAL table (Product/Price/Qty/Total uppercase heads), timeline connecting spine, payment card total block. Shopify order-page structure. Live 3/3.
- **CUSTOMER BLOCK v3 (e49b8c1, boss: internet templates se inspiration):** Shopify customer/shipping cards + premium order UIs se liya — icon rows (phone/email/address), action chips (call/WA/mail + copy phone/email/address + maps), lifetime stats (orders + spend, /admin/customers se), stacked address block. .odt-crow/.odt-addr/.odt-life classes. Live 3/3.
- **ORDER DETAIL v2 (71c6e42, boss: information sahi + design behtar):** Shopify-grade 2-column layout — head me bada tabular order number + meta strip (placed/pieces/source/coupon/tracking) + badges; left working column (pill tabs items/timeline/tracking + item editor), right summary rail (totals + tax, customer + email, shipping + maps, payment + txn). .odt-* maintainable classes. Live 3/3.
- **CRASH + 2 PAGES PREMIUM (7b2486b):** (1) OrderRow bins ReferenceError FIXED (boss ne crash dekha) — bins ab items se derive hota hai. (2) OrderDetail FULL ATELIER rebuild — pills, cards, tabs, item editor, tracking, timeline, cancel-reason red glass; sab functions preserved. (3) ProductForm .pf-prem layer — sections = white cards staggered, pill controls, focus rings. Live 3/3 verified.
- **ORDERS SHAPE PASS v3 (f0b2898, boss feedback):** stat cards ab real BUTTONS hain (Total→All, Pending→New, Processing, Completed→Delivered, Cancelled→Issues, Revenue→Reports; focus rings + press feedback). Default page size 50→**20**. Har control ab confident PILL (999px) — half-curved boxes khatam; cards 16-18px radius. R0-R8 (Analytics) dusre agent ka scope — humne nahi chheda.
- **ORDERS PREMIUM PASS v2 (d5c8ac9, boss: 'premium luxury modern, sirf orders page'):** orders-desk.css me additive override layer — warm paper gradient canvas + gold whisper, 16-18px radii, layered soft shadows, glass date-control + tabs track (floating black pill), obsidian-gradient buttons, icon chips + staggered stat entrance, amber-glass callout, table hover accent bar, pill badges, silk shimmer, focus rings; dark parity; zero JS. NOTE: orders-desk.css live AdminLayout css chunk me merge hota hai (verify: odShimmer grep). Boss ka taste: orders pe dashboard NAHI (pulse revert c4e44a7), premium polish CHAHIYE.
- **ORDERS PULSE (ae4056b — boss ne previous pass reject kiya, instruction file dobara di):** /admin/orders ab overview_perfect_final DNA ke sath khulta hai — OrdersPulse.jsx Overview.module.css classes REUSE karta hai (same family guaranteed): 6 stat cards + Chart.js sparklines, grid3 (sales line + payment/stage donuts center totals ke sath), quick grid 8 links, insights strip 5. Real data /orders/manage/analytics/summary. Additive — desk ke tabs/filters/table/bulk untouched. Boss ko ye direction pasand aye to same pulse pattern baqi pages pe bhi lag sakta hai.
- **ORDERS ONE-LEVEL PASS (e51a41d, boss: 'sab pages 1 level pe premium'):** COD Recon ATELIER pa-* pe rebuild (stats cards, badges, mark-collected pill, states); Orders desk ko same #f8f8f7 canvas geometry + hover/motion polish (additive CSS, dark canvas preserved). Ab pancho Orders pages (Orders, Drafts, Abandoned, Verification, COD Recon) EK visual system pe — same colors, same level, kuch delete nahi.
- **DRAFTS SHOPIFY-PARITY PASS 1 (a082f68):** custom per-item price, %/amount discount, shipping store/custom/none, tax-exempt, tags, customer-account attach, Duplicate, WhatsApp summary share — sab server-side apply on convert (QA 4/4: 1000 -10% no-ship no-tax = 900). DISCUSSION LIST (problem wale, boss se baat ke baad): send-invoice/payment-link + mark-paid + payment terms (gateway creds chahiye), custom line item (stockless line handler change), reserve-inventory + expiry (stock engine), per-line discount + reason, price lock, 1-yr auto-delete.
- **DRAFT ORDERS FEATURE (bfb2aff, boss 'bhot important task'):** `/admin/orders/draft` ab real hai. Backend: DraftOrder model + /orders/manage/drafts CRUD (paged + q search + stats) + /drafts/:id/convert jo EXACT manual-order flow chalata hai — POST '/' handler `manualOrderHandler` function me extract hua (behaviour unchanged) + `runManualOrder` simulated-res shim (QA hook router pe attached). Frontend: ATELIER DraftOrders.jsx — stat cards, search, pagination, editor modal (customer + provinces + postal, product picker sizes/qty, discount, live estimated totals; final price server-side honest), row pe Edit/Create order/Delete. QA in-memory PASS (order HS-… total 3000, stock 10→8). Fazool functions nahi — sirf list/create/edit/delete/convert.
- **SETTINGS AUDIT (boss sawal: 'settings tab me kharab to nahi?') — 1c83b1b:** `npm run check:admin` ab FULL GREEN (0 navUnresolved / 0 settingsOrphan / 0 importMissing; 177 nav targets sab routes pe). EK REAL BUG mila tha: SettingsMetafields (Custom Fields) editor ka save silently drop hota tha — whitelist me key thi magar Settings MODEL me nahi; schema add + persistence test PASS + live confirmed. Ghost SettingsStoreExtras.jsx (reverted batch residue) delete. Reserved panes (billing/system/domain waghera) by-design honest placeholders hain, kharab nahi.
- **Verification queue pagination (b0dff55, boss 'is ma bee'):** backend verification-queue paged mode + WHOLE-queue aggregates (total/value/flagged/oldest — stat cards page se free hain); frontend PaginationBar + page-aware row numbers + action ke baad server re-slice. Pagination family ab: Reviews + Products + Orders + VerificationQueue.
- **PAGINATION ROLLOUT (eec37dd, boss: 'orders products in sab par bhi lagao'):** shared `admin/PaginationBar.jsx` (pa-pager family) ab Products + Orders dono pe — 'Showing X to Y of N' + numbered window + per-page select. Products backend `/admin/list` paged mode (?page&per&q + aggregate counts for saved views, legacy untouched); Orders backend pehle se paged tha (page/limit), sirf UI upgrade (EditorialPagination hata). Reviews apni inline copy rakhta hai.
- **Reviews PAGINATION (8566b13, boss reference screenshot ke mutabiq):** backend GET /reviews/admin ab paged mode support karta hai (?page=&per=&sort=&q=) — server-side slice + DB search, legacy path untouched. Frontend: 'Showing X to Y of N results' + ‹ 1 2 3 … N › black-pill bar + 10/20/50 per-page select, debounce search, page resets. Hazar reviews hon to bhi panel fast.
- **Reviews page FULLY FUNCTIONAL + SAMPLE REVIEWS (commit 054ae10, on top of 50620ac):** backend `POST /api/reviews/admin/seed-demo` (adminOnly, ONE-SHOT, Review.demo flag guard) — 16 realistic innerwear reviews: pehle REAL delivered orders use hote hain (order-linked, verified, asli customer names), fallback names baqi; status mix 11 approved/4 pending/1 rejected; product ratingAvg recalc real flow jaisa; QA in-memory suite pass. Boss admin me 'Sample reviews' button click kare to data aa jata hai. Frontend: rating pulse panel (avg + stars + 5→1 bars + 30d/reported facts via /reviews/admin/stats), sort (newest/oldest/highest/lowest/helpful), photo thumbs + helpful counts, seed button.
- **Reviews page bhi ATELIER (commit 50620ac):** stat cards = tabs (Pending/Approved/Rejected live counts), review cards with real stars + semantic badges (Verified/Featured/Pinned/Reports), black-bar reply block, sticky bulk bar (approve/reject/feature/pin/verify/delete), inline reply editor, client search, shimmer/empty/error. Sab moderation logic 1:1 preserved.
- **ATELIER family ab:** Products + Categories + Collections + Reviews (shared products-atelier.css chunk). Baqi: Customers, Questions, Orders detail same kit pe ho sakti hain.
- **Phase 2 candidates:** Customers ATELIER · Product Settings editor · global variant option templates · server-side pagination (>2k).

## 7. APPROVED NEXT WORK (boss ne green light di)
1. **Reserved settings editors batch 1 — DONE (2026-08-28):** Business Address, Time Zone, Currency built, tested, live. ✅ *still verified in code: `SettingsAddress.jsx` exists, 3 routes wired, 3 keys in model + whitelist.*
2. ~~**Reserved settings editors batch 2 — DONE (2026-08-28)**~~ **⚠️ FALSE — REVERTED, NOT LIVE.** Dekho §0B. `git log` me `b9a9080` dikhta hai lekin `7632dc9` ne revert kar diya; `SettingsStoreExtras.jsx` mojood nahi, model me koi key nahi, whitelist me nahi, `notify()` gate nahi, `seo.js` `useForSeo` nahi. Store Settings group **6/10** hai, 10/10 nahi. **Agar boss dobara banwana chahe to §0B ki table hi spec hai** — lekin pehle boss se pucho, kyunke ye unhone jaan bojh ke revert karwaya tha.
3. **Done this session (2026-08-28):** Search & Discovery whitelist bug fix + admin-integrity guard (§0C, §9).
4. **Next candidates (boss decide kare):** a) ~~Team & Roles~~ — **DONE (2026-08-28):** team/roles = SettingsTeam editor (a523771); permissions + 5 access-* = `SettingsPermissions.jsx` Roles & Access matrix (abc1393, live verified); only `audit-logs` still SettingsSecurity; b) Inbox per-row action buttons (optional polish); c) Custom Data group (metafields/metaobjects/custom-fields); d) ~~storefront weight display~~ **REJECTED as specified — dekho §0D** (field admin-only hai, API usey return hi nahi karti, poora catalog 0 hai).

## 7. APPROVED NEXT WORK (boss ne green light di)
1. **Reserved settings editors batch 1 — DONE (2026-08-28):** Business Address, Time Zone, Currency live.
2. **Batch 2 (units/domain/languages/notifications) — REVERTED by boss order (7632dc9).** Dobara tab hi jab boss explicitly kahe.
3. **ATELIER theme rollout — IN PROGRESS:** Products page DONE (6a09ccc). Boss bole to agle pages same `.pa-*` system pe: Categories, Collections, Customers, Orders detail.
4. **Next candidates:** a) Team & Roles; b) Inbox per-row actions; c) Custom Data group.

## 7B. SETTINGS BATCH 2 — architecture notes (⚠️ REVERTED 7632dc9 — reference only, code live NAHI)
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
*Last updated: 2026-08-28 — Overview ATELIER (`overview-atelier.css` + Dashboard.jsx): light #f8f8f7 wrap 1580px, 6 KPI, reference grids, live HUSHAE data. Products ATELIER family. Session 4. §0B VERIFICATION NOTICE added (Batch 2 claims were false: reverted by 7632dc9, never re-applied — verify every "DONE" claim against code). §0C: fixed a live bug — `search`/`discovery` were never in the settings PUT whitelist, so Search & Discovery settings have never persisted since inception (same class as the marketing omission from c0f0030); `adminShare` left out on purpose, see security note. §0D: rejected the "PDP weight display" candidate as specified — admin-only field, not in the public API, all zeros, no consumer. §9: new `npm run check:admin` guard (nav→route, settings key→whitelist, import→file) with self-tests and a ratchet baseline of 166 pre-existing dead nav links. Tests: backend/test-settings-whitelist.js 10/10, guard selftest 12/12, frontend build clean. Nayi chat: pehle ye file, phir `git log --oneline -10`, phir `npm run check:admin` se current state confirm karo, phir kaam. PLUS: /admin/products ATELIER luxury theme live (6a09ccc) — dekho §6C. PLUS: /admin/categories ATELIER live (c363432) — §6C. PLUS: /admin/collections ATELIER live (ac7f5d5) — §6C. PLUS: /admin/reviews ATELIER live (50620ac) — §6C.*

## MULTI-AGENT SPLIT (boss-approved)
- Agent A (main): App.jsx, AdminLayout.jsx, orders/*, payments, nav/redirects, tenant design.
- Agent B (after passing test): SettingsPages reserved editors (Team & Roles,
  Metafields), storefront pages polish, i18n. Prompt: see AGENT-B-PROMPT.md.
- Rule: koi agent doosre ki files edit NA kare; conflict ho to boss se pucho.
- NAV cleanup done: 135 -> 90 links (Channels group removed as clutter,
  SMS/Social removed, Apps trimmed); ~85 legacy paths redirect via
  ADMIN_REDIRECTS in App.jsx (Route /admin/* after all real admin routes).
