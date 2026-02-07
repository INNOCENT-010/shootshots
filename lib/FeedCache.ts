// lib/feedCache.ts
'use client'

interface CacheEntry<T> {
  data: T
  timestamp: number
  seed: number
}

class FeedCache {
  private cache = new Map<string, CacheEntry<any>>()
  private static instance: FeedCache

  static getInstance(): FeedCache {
    if (!FeedCache.instance) {
      FeedCache.instance = new FeedCache()
    }
    return FeedCache.instance
  }

  set<T>(key: string, data: T, seed: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      seed
    })
  }

  get<T>(key: string): { data: T; seed: number } | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // Check if cache is stale (older than 1 hour)
    const isStale = Date.now() - entry.timestamp > 60 * 60 * 1000
    if (isStale) {
      this.cache.delete(key)
      return null
    }
    
    return {
      data: entry.data as T,
      seed: entry.seed
    }
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

export const feedCache = FeedCache.getInstance()
