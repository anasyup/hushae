/* ============================================================================
 * BROWSER TEST HARNESS
 *
 * WHY THIS FILE IS HERE: regression.mjs used to import this from /tmp/harness.mjs.
 * /tmp does not survive, so the harness disappeared and the whole browser suite
 * became unrunnable (ERR_MODULE_NOT_FOUND) — the exact failure mode regression.mjs
 * warns about in its own header comment. It now lives beside the suite, in the repo.
 *
 * serve(port) — static-serves the built frontend (frontend/dist) with SPA
 *               fallback, and proxies /api/* to the backend so the pages under
 *               test get real data. Returns something with .close().
 * PREP        — runs in the page before the sweep: suppresses the cookie consent
 *               banner (it is an overlay, not the thing under test) and disables
 *               animation so screenshots//>measurements settle.
 * ========================================================================== */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../../frontend/dist');
const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:4000';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

export async function serve(port) {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error(`No build at ${DIST}. Run: cd frontend && npx vite build`);
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);

    // ── /api/* → real backend ────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const target = new URL(url.pathname + url.search, API_ORIGIN);
      const proxied = http.request(
        target,
        { method: req.method, headers: { ...req.headers, host: target.host } },
        (up) => { res.writeHead(up.statusCode || 502, up.headers); up.pipe(res); },
      );
      proxied.on('error', () => {
        // Backend down: answer rather than hang, so a suite failure is legible.
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end('{"error":"harness: backend unreachable"}');
      });
      req.pipe(proxied);
      return;
    }

    // ── static, with SPA fallback ────────────────────────────────────────────
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file = path.join(DIST, rel);
    // Never let a crafted path escape dist.
    if (!file.startsWith(DIST)) file = path.join(DIST, 'index.html');
    if (!rel || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}

/* Runs inside the page. Consent is pre-granted so the banner never sits on top
   of the content the sweep is asserting about. */
export const PREP = () => {
  try {
    localStorage.setItem('hushae.consent', JSON.stringify({
      essential: true, analytics: false, marketing: false, ts: Date.now(),
    }));
  } catch { /* storage blocked — banner will show; harmless for the sweep */ }
  const s = document.createElement('style');
  s.textContent = '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}';
  document.head.appendChild(s);
};
