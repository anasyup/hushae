const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const memCache = new Map();
const inFlight = new Map();

export async function api(path, { method = 'GET', body, token, noCache = false } = {}) {
  const isGet = method.toUpperCase() === 'GET';
  const cacheKey = `${path}::${token || ''}`;

  if (isGet && !noCache && !token && memCache.has(cacheKey)) {
    const entry = memCache.get(cacheKey);
    if (Date.now() - entry.time < 120000) {
      return entry.data;
    }
  }

  if (isGet && !noCache && inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const reqPromise = (async () => {
    try {
      let res;
      try {
        res = await fetch(`${BASE}/api${path}`, {
          method,
          headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        const err = new Error('API nahi mil rahi. Backend band hai — pehle `cd backend && npm run dev` chalao (port 4000).');
        err.status = 0;
        throw err;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.raw = data;
        throw err;
      }

      if (isGet && !token) {
        memCache.set(cacheKey, { data, time: Date.now() });
      } else if (!isGet) {
        memCache.clear();
      }

      return data;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  if (isGet && !noCache) {
    inFlight.set(cacheKey, reqPromise);
  }

  return reqPromise;
}
