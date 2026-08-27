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
1. **Reserved settings editors batch 1 — DONE (2026-08-28):** Business Address, Time Zone, Currency built, tested, live. ✅ *still verified in code: `SettingsAddress.jsx` exists, 3 routes wired, 3 keys in model + whitelist.*
2. ~~**Reserved settings editors batch 2 — DONE (2026-08-28)**~~ **⚠️ FALSE — REVERTED, NOT LIVE.** Dekho §0B. `git log` me `b9a9080` dikhta hai lekin `7632dc9` ne revert kar diya; `SettingsStoreExtras.jsx` mojood nahi, model me koi key nahi, whitelist me nahi, `notify()` gate nahi, `seo.js` `useForSeo` nahi. Store Settings group **6/10** hai, 10/10 nahi. **Agar boss dobara banwana chahe to §0B ki table hi spec hai** — lekin pehle boss se pucho, kyunke ye unhone jaan bojh ke revert karwaya tha.
3. **Done this session (2026-08-28):** Search & Discovery whitelist bug fix + admin-integrity guard (§0C, §9).
4. **Next candidates (boss decide kare):** a) Team & Roles — **note:** `middleware/auth.js` pehle se `requirePermission`, `ADMIN_ROLES`, `PERMISSIONS` export karta hai, yaani foundation maujood hai aur ye candidate sara bada nahi hai; abhi `/admin/settings/team|roles|permissions` sirf `SettingsSecurity` render karte hain (App.jsx L376-379); b) Inbox per-row action buttons (optional polish); c) Custom Data group (metafields/metaobjects/custom-fields); d) ~~storefront weight display~~ **REJECTED as specified — dekho §0D** (field admin-only hai, API usey return hi nahi karti, poora catalog 0 hai).

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
*Last updated: 2026-08-28 — Session 4. §0B VERIFICATION NOTICE added (Batch 2 claims were false: reverted by 7632dc9, never re-applied — verify every "DONE" claim against code). §0C: fixed a live bug — `search`/`discovery` were never in the settings PUT whitelist, so Search & Discovery settings have never persisted since inception (same class as the marketing omission from c0f0030); `adminShare` left out on purpose, see security note. §0D: rejected the "PDP weight display" candidate as specified — admin-only field, not in the public API, all zeros, no consumer. §9: new `npm run check:admin` guard (nav→route, settings key→whitelist, import→file) with self-tests and a ratchet baseline of 166 pre-existing dead nav links. Tests: backend/test-settings-whitelist.js 10/10, guard selftest 12/12, frontend build clean. Nayi chat: pehle ye file, phir `git log --oneline -10`, phir `npm run check:admin` se current state confirm karo, phir kaam.*
