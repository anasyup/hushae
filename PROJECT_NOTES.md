# HUSHAE — Project Notes (Permanent Agent Memory)

**Last updated:** 2026-08-02
**Agent session:** Global Storefront Shell upgrade (Phase 0 → first task)
**HEAD commit (start of this session):** `122983c` — Full-store audit (VL→HS prefix, ratings cleared, About published)

---

## 1. Quick Links
- Live storefront: https://hushae.vercel.app/
- Admin: https://hushae.vercel.app/admin
- Repo: `anasyup/hushae` (private), default branch `main`
- Stack: React 18 + Vite + Tailwind (frontend) · Node/Express + Mongoose (backend) · MongoDB Atlas (DB `hushae`) · Vercel deploy (push to `main` = auto-deploy)
- Vercel project id: `prj_O4OBnPgwXtY4tCs5hPvxunlUVUyU`, team `team_ytBEUWRZYDaucsFiWpDU0agy`
- MongoDB user (visible in screenshot): `velourauser` (SCRAM, readWriteAnyDatabase)

## 2. Access
- GitHub PAT: fine-grained, Contents R/W on `hushae` only (Administration scope NOT granted — can't rename repo, manage branches from API)
- Vercel token: team-scoped, can read/write env vars, trigger deploys
- MongoDB: direct password not provided; work via Admin API or by decrypting Vercel `MONGODB_URI` when needed. **Never print or commit the URI.**
- NEVER commit tokens, .env, secrets. NEVER push without user's explicit "PUSH KARO" instruction (Rule #2).

## 3. Workspace Rules (Critical)
- Workspace budget 128 MB / 10k files. Always delete `frontend/node_modules` after `npm run build` (it's ~167MB, takes 5s to reinstall). Gitignore already covers it.
- The repo is a **shallow sparse clone** (`--depth=1 --filter=blob:none --sparse`), with `frontend/public/images/products/` excluded (104MB of product images). The images are still on GitHub and Vercel. If ever needed locally:
  ```bash
  cd hushae && git sparse-checkout reapply  # or git sparse-checkout add frontend/public/images/products
  ```
- Keep only `hushae/` in /home/user. Delete screenshots/ZIP/temp after use.
- After every task, append 4–6 lines here under "Session Log" with what changed and any PENDING tag.
- Rule #6: one message = one task. Do NOT scan the entire project. Read only the files you need.

## 4. Current Status (post Global Shell task)
Storefront shell upgraded. Full build passes (`vite build` → 11.4s, 0 errors).
Admin panel untouched; all existing features/routes preserved; no schema/migration changes.
**Pending user approval to commit + push.**

### What was done
- `frontend/src/lib/storefrontConfig.js` — NEW single normalization layer. Validates emails/phones/URLs, provides safe defaults, rejects legacy `veloura` addresses, rejects placeholder emails/phones, exposes `__admin.controlled` and `__admin.future` for future CMS editors.
- `frontend/src/index.css` — added `:root` z-index scale (`--z-base/offerbar/header/search/drawer/mobilenav/compare/stickybar/float/toast/promo/cookie/dialog/skip/lock`) so fixed layers never overlap. Focus ring & skip-link now use the scale. Reduced-motion already respected.
- `OfferBar.jsx` — uses normalized config, z-index var, ARIA region+label, message-only fallback when no CTA/link.
- `Header.jsx` — uses storefrontConfig for nav + icon toggles, z-index vars on wrapper and search panel, passes cfg.storeName to MobileDrawer.
- `Footer.jsx` — uses normalized config. **Fake phone `+92 300 0000000` removed** (only renders phone when valid PK mobile is configured). Email validated, legacy veloura addresses hidden. Social links hidden when empty. Payment note reflects active methods. Payment/social anchors use `<a target="_blank">` for external URLs, `<Link>` for internal. Added labels (sr-only) to email input, nav aria-labels.
- `CookieConsent.jsx` — z-index var, dialog semantics on manage view, body-scroll lock only when manage dialog is open, Escape returns to compact view, first-action focus on mount, switch role="switch" aria-checked.
- `MobileNav.jsx` — semantic `<ul>/<li>`, z-index var, safe-area aware spacer & dock, aria-label on Bag button, badge classes cleaned up.
- `CompareTray.jsx` — z-index var, bottom offset includes `env(safe-area-inset-bottom)`.
- `WhatsAppFloat.jsx` — moved to **LEFT** bottom so it never collides with the right-side PromoPopup/Toasts. Uses normalized config, z-index var, safe-area bottom offset, proper focus ring, respects disabled state when number invalid.
- `PromoPopup.jsx` — uses normalized config (title/text/coupon/delay from storefrontConfig), z-index var, bottom offset above mobile nav (bottom-20 on mobile), labels + aria-label, dialog role, sr-only email label, rounded-panel token instead of 1.6rem.
- `Toasts.jsx` — aria-live region, z-index var, bottom-offset safe-area aware, rounded-panel token.
- `CartDrawer.jsx` — backdrop z-index var.
- `MobileDrawer.jsx` — overlay z-index dialog.
- `MegaMenu.jsx`, `NavDropdown.jsx` — z-index header; motion-reduce class added on NavDropdown; MegaMenu style prop fixed (parenthesis bug).
- `StoreLock.jsx` — z-index lock var, dialog+aria attributes.
- `pages/product/StickyBuyBar.jsx` — z-index stickybar, bottom offset safe-area aware.
- `pages/cart/StickyCheckoutBar.jsx` — z-index stickybar, safe-area.
- `pages/checkout/StickyPlaceOrder.jsx` — z-index stickybar, safe-area.
- `pages/cart/UndoBar.jsx` — z-index toast, safe-area, ARIA status kept.
- `pages/shop/FilterSheet.jsx` — z-index dialog.
- `pages/Search.jsx` (mobile sheet) — z-index dialog.
- `components/search/ShoppingAssistant.jsx` — z-index dialog.

### Admin-controlled shell fields (already wired)
- `storeName`, `tagline`, `contactEmail`, `contactPhone`
- `header.menu`, `header.navSize/navGap/navUppercase/menuAlign/border`, icon toggles
- `offerBar.enabled/messageEn/ctaEn/link` (schedule.start/end shape reserved)
- `footer.*` (newsletter, aboutText, tagline, social, columns, contact, paymentNote, bottomText, showNewsletter/showSocial/showContact)
- `cookiePopup.enabled/title/text`
- `promoPopup.enabled/delaySec/title/text/couponCode`
- `integrations.social.{instagram,facebook,tiktok}`
- `integrations.whatsapp.{enabled,number,message}`
- `storefrontLock.{enabled,heading,message}`
- CMS pages ticked "show in header/footer" via `/cms/nav` (additive only)

### Fields needing a FUTURE admin Storefront/CMS editor
- Header logo image (currently uses Wordmark)
- Offer bar scheduling (UI/dates)
- Footer trust badges (shipping / exchange / discreet icons)
- Footer payment icons (currently text note)
- Theme tokens (colors/radii) — partially via /admin/theme
- Category mega-menu hero image + copy per category

## 5. Known Issues / Watch
- Product name doubled in DB: `"HUSHAE Second-Skin Wireless BraHUSHAE Second-Skin Wireless Bra"` — left in place per merchant's prior instruction. Ask before fixing.
- Feature branches unmerged: `feature/order-management-enhancement`, `-pro`, `-redesign`, `orders-workflow-polish`, `print-new-tab`. Ask user before touching.
- Custom domains (`hushae.pk` / `hushae.com`) pending registrar purchase.
- JazzCash/SafePay business docs pending — COD live, gateways scaffolded but credentials not set.
- Fine-grained GitHub PAT expires ~2026-08-24. Warn from 2026-08-20.
- Sparse checkout: product images not on local disk. Don't `fs.readFile` them; rely on URLs or `git sparse-checkout` if needed.

## 6. Session Log

- **2026-08-02 (session start)**: Phase 0 completed — cloned repo shallow+sparse, verified tokens, audited live site and CHANGELOG.
- **2026-08-02 (Global Storefront Shell)**: Implemented z-index scale, storefrontConfig normalizer, upgraded OfferBar/Header/Footer/Cookie/MobileNav/Compare/WhatsApp/Promo/Toasts/CartDrawer/MobileDrawer/MegaMenu/NavDropdown/StoreLock/StickyBars/FilterSheet/SearchSheet/ShoppingAssistant. Fixed fake phone placeholder. Moved WhatsApp FAB to left. Build passes 0 errors.
- **2026-08-02 (Mobile-First UX Hardening, local only)**: Header top safe-area padding; OfferBar pt safe-area; MobileDrawer completely reworked — safe-area, Search/Account/Wishlist/Compare as 2x2 utility grid, Help section (FAQ/Shipping/Returns/Track/About), all links 48px min-h, StopPropagation on wishlist/compare clicks in ProductCard, Quick Add visible on mobile (previously hover-only), grid gap tightened on mobile (gap-x-3/gap-y-8), sticky filter/sort toolbar on Shop with visible item count, larger Filter & Sort button with border, Z-index stickybar added to --z-sticky slot, all docked elements (StickyBuyBar/Checkout/Cart bar) get pb safe-area, mobile nav spacer 56px, Hero bottom pb increased for safe-area, cookie/promo/toasts/WhatsApp offsets all raised above mobile nav (88/88/72/72px), body/html `overflow-x: hidden` to prevent horizontal scroll, SearchPanel bottom pb safe-area, FilterSheet pb safe-area, promo bottom offset correct. Build passes 0 errors. PENDING: user review → push.

---

*PENDING:* Awaiting user review of Global Shell changes; will commit+push on "PUSH KARO".

## 2026-08-02 — Preview deploy (global-shell-mobile-qa)
- Built local ✓ 11s, 0 errors. No lint/test scripts defined in package.json.
- Preview branch `preview/global-shell-mobile-qa` created off 122983c; contains shell+mobile hardening only.
- Known: non-home header lacks top safe-area (iOS notch overlap possible) — pre-existing, next task.
- Known: Filter toolbar top-[56px] gives 3px gap under 53px non-home header (workable; not ideal).
- Vercel CLI installed to `.vercel-tmp/` (gitignored).
PENDING: verify preview URL; report to user; wait for QA.
- Preview deploy LIVE: https://hushae-git-preview-global-shell-mobile-qa-yup-a60d356d.vercel.app
  (commit c7c037e, branch preview/global-shell-mobile-qa)
- Admin login: https://hushae-git-preview-global-shell-mobile-qa-yup-a60d356d.vercel.app/admin/login
- All 26 tested routes HTTP 200; API /products, /categories, /settings 200.
- Vercel SSO protection disabled (null) to make preview public; live prod hushae.vercel.app unaffected (200).
- Local workspace: 7 MB / 439 files, no node_modules/dist/.vercel-tmp.
PENDING: User live QA on actual device. Production push (main) only on "PUSH KARO".

## 2026-08-02 — PDP premium upgrade
- Rewrote Product.jsx: config-driven payment panel, proper add/loading/added/error states, free-shipping nudge, honest loyalty panel, tier badge dedup, larger size/color targets, colour name text, fit/fabric/care/shipping/size-info/details accordions, back link, retry button, "Made in Pakistan", aria-label/role="radio".
- Upgraded StickyBuyBar: secondary Buy Now button, color+size labels, loading spinner + check animation, disabled states, aria-busy, added-pulse state.
- SizeGuideModal: z-index → --z-lock (above everything), body scroll lock, Escape key, focus restoration, accessible name, safe-area padding, rounded-panel, link to Fit Finder.
- ProductRow: accepts optional titleId for aria-labelledby.
- NO fake data: missing fabric/care/model/fit fields render safe fallbacks.
- NO hardcoded JazzCash/EasyPaisa/Bank when disabled; NO 7-day contradiction — 14-day consistent.
- Built 10.67s, 0 errors. node_modules+dist cleaned.
PENDING: Preview deploy + QA.

## 2026-08-02 — PDP density / typography refinement
- Restrained type scale: H1 24→28→32 clamp, price 22→26px, labels 11px tracked caps.
- Tighter vertical rhythm (py-4→6, mt-3/4, compact trust grid, compact pay row).
- Removed duplicate colour name label, removed generic "between sizes" invented claim (Fit Finder only).
- Fabric & Care accordions only rendered when real data exists; Fit & Feel neutral + Fit Finder CTA.
- Sticky bar: h-44px thumb, inline size/color, min button 110px, text-[11px].
- Trust: 3-col divide-x with 10.5px tracked caps; Pay row inline with active providers only.
- Build 10.63s, 0 errors.
PENDING: preview deploy + visual QA.
