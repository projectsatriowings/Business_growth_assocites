// High-performance API client with in-flight deduplication and short-lived caching

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const clientApiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export function clearApiCache(prefix?: string) {
  if (prefix) {
    for (const key of clientApiCache.keys()) {
      if (key.includes(prefix)) {
        clientApiCache.delete(key);
      }
    }
  } else {
    clientApiCache.clear();
  }
}

export interface ApiRequestOptions extends RequestInit {
  bypassCache?: boolean;
  cacheTtlMs?: number;
}

export async function apiRequest(endpoint: string, options: ApiRequestOptions = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const token = localStorage.getItem('bga_auth_token');

  // Any state-modifying mutation invalidates client cache
  if (method !== 'GET') {
    clientApiCache.clear();
  } else if (!options.bypassCache) {
    const cacheKey = `${token ? 'auth:' : 'pub:'}${endpoint}`;
    const cached = clientApiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Deduplicate in-flight requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        };

        if (token) {
          (headers as any)['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(endpoint, {
          ...options,
          headers,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || `HTTP error ${response.status}`);
        }

        const ttl = options.cacheTtlMs ?? 15_000; // 15s default client cache
        clientApiCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + ttl,
        });

        return data;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  // Regular non-cached or non-GET execution
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}
