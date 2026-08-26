# HUSHAE — Local par chalane ka tareeqa (Local Setup Guide)

Poora project: `frontend/` (React + Vite) aur `backend/` (Express + MongoDB API).
Live site: https://hushae1.vercel.app — yeh code usi ka source hai.

## Windows — sab se asaan tareeqa (one click)
1. **Node.js LTS** install karein: https://nodejs.org/
2. Code download/extract karein aur **`start-dev.bat`** par double-click karein.
   - Pehli baar npm packages install honge (kuch minute lagenge — window khuli rahegi)
   - **MongoDB installed hai** → backend (port 4000) + frontend (port 5173) dono chalenge
   - **MongoDB nahi hai** → frontend "live-data mode" me chalega (API live server se, UI poora kaam karega)
3. Browser khud khul jayega: http://localhost:5173 (admin: /admin)

Sirf frontend chalana ho to `start-frontend.bat` use karein (macOS/Linux: `./start-dev.sh`).

## Manual tareeqa (Windows/macOS/Linux)
### Backend
```bash
cd backend
npm install
cp .env.example .env     # Windows: copy .env.example .env
# .env me bharein: MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm start                # → http://localhost:4000/api/health
```
- MongoDB local ya free Atlas cluster dono chalega
- Demo data ke liye ek baar: `SEED_ON_START=true npm start`

### Frontend
```bash
cd frontend
npm install
npm run dev              # → http://localhost:5173
```
Vite `/api` ko khud backend (127.0.0.1:4000) par proxy karta hai.

## Admin panel
http://localhost:5173/admin/login → `.env` wala ADMIN_EMAIL/ADMIN_PASSWORD

## Troubleshooting
- **Terminal khul kar band ho jaye**: ab nahi hoga — har error par window ruk kar error dikhayegi
- `must('MONGODB_URI')` error = backend/.env missing ya adhoora
- Port 4000/5173 busy = .env me PORT badlein ya doosra process band karein
- Login 401 = .env ke ADMIN_EMAIL/ADMIN_PASSWORD se match karein
