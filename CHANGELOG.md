# Veloura — Changelog

Yeh file har change ka record hai jo Arena assistant ke saath ki gayi hai.
Sab se naya change sab se upar hota hai.

Format:
- **Date** — short title
  - Kya change hui (files)
  - Kyun ki (reason)
  - Commit hash (agar committed)

---

## 🔑 Token Info (internal reminder — not sensitive)

- **Token created:** 2026-07-25
- **Expires:** ~2026-08-24 (30 days)
- **Renewal reminder:** Start warning user from 2026-08-20
- **Renew at:** https://github.com/settings/personal-access-tokens
- **Scope:** Fine-grained, `veloura` repo only, Contents: Read+Write

---

## Changes

- **2026-07-25** — Hero image pickers: URL paste option removed — sirf PC upload rahega (per user request)

- **2026-07-25** — Phase 1: Full-screen hero banner + Blaire-style dropdown CTA + admin controls
  - Home: New `HeroFullScreen` component — Blaire-inspired premium full-viewport hero
  - Video support with poster fallback, autoplay + muted + loop + playsInline (iOS-safe)
  - Separate desktop + mobile image support via `<picture>`
  - Adjustable dark overlay opacity (0-90%) for text readability
  - 2 CTA styles: "2 Buttons" (Women/Men) or "Dropdown Menu" (single Shop button, Blaire-style)
  - Editable dropdown menu items (label + href) from admin
  - Editable eyebrow text + trust badges under hero
  - Settings model: hero.{eyebrow, mobileImage, poster, overlayOpacity, ctaStyle, shopMenu[], badges[]}
  - Admin Content page: complete hero editor rewrite with CTA style toggle, mobile image, poster, overlay slider, menu editor, badges editor
  - AI-generated default hero image at /images/hero/veloura-hero.jpg (editorial style, VOGUE-quality)
  - DB updated: hero.ctaStyle='dropdown', new fields populated with defaults



- **2026-07-25** — WhatsApp Help Center + FAQ page + Analytics/Pixels + SEO pack
  - Backend: new `/robots.txt` and `/sitemap.xml` endpoints (dynamic — pulls all active products + categories from DB)
  - Backend: `vercel.json` rewrites so SEO files route to Express (not the SPA)
  - Backend: `Settings` model — new `integrations.analytics` (gaId, gtmId, metaPixelId, tiktokPixelId) + new `faq` (enabled, heading, subheading, items[])
  - Backend: `settings` PUT accepts `faq` field
  - Frontend: `<Seo>` component — updates title/description/canonical/OG/Twitter meta + injects JSON-LD structured data (no react-helmet dependency needed)
  - Frontend: `<AnalyticsInjector>` — loads GA4/GTM/Meta Pixel/TikTok Pixel ONLY after cookie consent (privacy-safe)
  - Frontend: `CookieConsent` now dispatches `veloura:consent` event so Analytics can react
  - Frontend: Home page — Seo with Organization + WebSite JSON-LD schema
  - Frontend: Product page — Seo with per-product Product JSON-LD schema (name, price, image, SKU, availability, brand)
  - Frontend: Shop page — dynamic per-gender/tab title + meta description
  - Frontend: New public `/faq` page — with FAQPage JSON-LD schema for Google rich results
  - Frontend: Footer — FAQ link added
  - Admin: Apps → new "Analytics & Tracking Pixels" card (GA4, GTM, Meta Pixel, TikTok Pixel with helper links)
  - Admin: Apps → "WhatsApp Chat Button" renamed to "WhatsApp Help Center" (per user request)
  - Admin: Content → new "FAQ Page" manager — full CRUD with reorder up/down + enable toggle + preview
  - Seed: 10 default FAQ items (Urdu-friendly) pre-populated
  - Files: `backend/src/models/Settings.js`, `backend/src/routes/seo.js`, `backend/src/app.js`, `backend/src/routes/settings.js`, `vercel.json`, `frontend/src/components/{Seo,Analytics,CookieConsent,Footer}.jsx`, `frontend/src/App.jsx`, `frontend/src/pages/{Home,Shop,Product,Faq}.jsx`, `frontend/src/admin/{Apps,Content}.jsx`

---

- **2026-07-25** — Admin password change feature + strong password
  - Backend: naya endpoint `POST /api/auth/change-password` (auth required)
    - Requires current password (bcrypt verified)
    - Min 8 chars, letters + numbers required
    - Rate-limited (8 attempts / 15 min)
    - Rotates JWT token on success (other-device sessions expire)
  - Frontend: Admin → Settings page mein "Change Password" card
    - Show/hide toggle on each password field
    - Live password strength meter (Very weak → Strong)
    - Confirm-password mismatch warning
    - Auto-updates auth store with rotated token
  - Store: `setAuth` exposed via `useApp()` for token rotation
  - Database: admin `underadmin` ka password strong password se replace kiya
  - Vercel env: `ADMIN_PASSWORD` variable updated to match
  - Files: `backend/src/routes/auth.js`, `frontend/src/admin/Settings.jsx`, `frontend/src/store/AppContext.jsx`

---

## Baseline

- **2026-07-25** — Repo cloned into workspace at `/home/user/veloura`
  - Starting point: commit `d47b108` (Video media tiles)
  - Auto-push to GitHub enabled via fine-grained PAT
  - First test commit: `3d779c9` (add CHANGELOG.md)
