interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class TrendCache {
  private store = new Map<string, CacheEntry<unknown>>()

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  getExpiresAt(key: string): number | null {
    const entry = this.store.get(key)
    if (!entry || Date.now() > entry.expiresAt) return null
    return entry.expiresAt
  }
}

export const trendCache = new TrendCache()
export const CACHE_KEY = 'agri-trend:full'
export const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours
