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
