const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// In-memory SWR cache for instantaneous 0ms client-side transitions
const memCache = new Map();
const inFlight = new Map();

export async function api(path, { method = 'GET', body, token, noCache = false } = {}) {
  const isGet = method.toUpperCase() === 'GET';
  const cacheKey = `${path}::${token || ''}`;

  // If public GET request and cached within 2 minutes, return immediately
  if (isGet && !noCache && !token && memCache.has(cacheKey)) {
    const entry = memCache.get(cacheKey);
    if (Date.now() - entry.time < 120000) {
      return entry.data;
    }
  }

  // Deduplicate simultaneous in-flight GET requests
  if (isGet && !noCache && inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const reqPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/api${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.message || `Request failed (${res.status})`);
        err.status = res.status;
        err.raw = data;
        throw err;
      }

      // Cache public GET requests
      if (isGet && !token) {
        memCache.set(cacheKey, { data, time: Date.now() });
      } else if (!isGet) {
        // Invalidate cache on mutations (POST, PUT, DELETE, PATCH)
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
