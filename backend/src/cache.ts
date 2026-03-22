const store = new Map<string, { expires: number; data: unknown }>();

const DEFAULT_TTL_MS = 1000 * 60 * 30; // 30 minutes

export function getCache<T>(key: string): T | undefined {
  const row = store.get(key);
  if (!row) return undefined;
  if (Date.now() > row.expires) {
    store.delete(key);
    return undefined;
  }
  return row.data as T;
}

export function setCache(key: string, data: unknown, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export function clearAllCache(): void {
  store.clear();
}
