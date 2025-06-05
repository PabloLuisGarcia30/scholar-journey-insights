
import { supabase } from "@/integrations/supabase/client";

export interface CacheEntry {
  id: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
  processingResult: any;
  metadata: Record<string, any>;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  topFiles: Array<{ fileName: string; accessCount: number }>;
}

export class CacheService {
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_CACHE_SIZE = 1000; // Maximum entries
  private static cache: Map<string, CacheEntry> = new Map();

  static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async getCachedResult(fileHash: string): Promise<any | null> {
    try {
      // Check in-memory cache first
      const memoryEntry = this.cache.get(fileHash);
      if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
        memoryEntry.accessCount++;
        memoryEntry.lastAccessedAt = Date.now();
        console.log('Cache hit (memory):', fileHash);
        return memoryEntry.processingResult;
      }

      // Check database cache
      const { data, error } = await supabase.functions.invoke('get-cached-result', {
        body: { fileHash }
      });

      if (error) {
        console.warn('Cache lookup error:', error);
        return null;
      }

      if (data?.result) {
        // Store in memory cache for faster access
        const entry: CacheEntry = {
          id: data.id,
          fileHash,
          fileName: data.fileName,
          fileSize: data.fileSize,
          processingResult: data.result,
          metadata: data.metadata || {},
          createdAt: data.createdAt,
          expiresAt: Date.now() + this.CACHE_DURATION,
          accessCount: (data.accessCount || 0) + 1,
          lastAccessedAt: Date.now()
        };
        
        this.cache.set(fileHash, entry);
        console.log('Cache hit (database):', fileHash);
        return data.result;
      }

      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  static async setCachedResult(
    fileHash: string,
    fileName: string,
    fileSize: number,
    result: any,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const entry: CacheEntry = {
        id: `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileHash,
        fileName,
        fileSize,
        processingResult: result,
        metadata,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
        accessCount: 1,
        lastAccessedAt: Date.now()
      };

      // Store in memory
      this.cache.set(fileHash, entry);

      // Store in database
      await supabase.functions.invoke('set-cached-result', {
        body: {
          fileHash,
          fileName,
          fileSize,
          result,
          metadata,
          expiresAt: entry.expiresAt
        }
      });

      console.log('Result cached:', fileHash);
      
      // Cleanup old entries if cache is too large
      await this.cleanupCache();
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  static async getCacheStats(): Promise<CacheStats> {
    try {
      const { data, error } = await supabase.functions.invoke('get-cache-stats');
      
      if (error) {
        console.warn('Cache stats error:', error);
        return this.getMemoryCacheStats();
      }

      return data;
    } catch (error) {
      console.error('Cache stats retrieval error:', error);
      return this.getMemoryCacheStats();
    }
  }

  private static getMemoryCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const validEntries = entries.filter(e => e.expiresAt > Date.now());
    
    const hitRate = validEntries.length > 0 
      ? validEntries.reduce((sum, e) => sum + e.accessCount, 0) / validEntries.length 
      : 0;

    const totalSize = validEntries.reduce((sum, e) => sum + e.fileSize, 0);
    
    const topFiles = validEntries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(e => ({ fileName: e.fileName, accessCount: e.accessCount }));

    return {
      totalEntries: validEntries.length,
      hitRate,
      totalSize,
      oldestEntry: validEntries.length > 0 ? Math.min(...validEntries.map(e => e.createdAt)) : 0,
      newestEntry: validEntries.length > 0 ? Math.max(...validEntries.map(e => e.createdAt)) : 0,
      topFiles
    };
  }

  private static async cleanupCache(): Promise<void> {
    // Remove expired entries from memory
    const now = Date.now();
    for (const [hash, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(hash);
      }
    }

    // If still too large, remove oldest entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.lastAccessedAt - b.lastAccessedAt);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(([hash]) => this.cache.delete(hash));
    }

    // Cleanup database cache
    try {
      await supabase.functions.invoke('cleanup-cache');
    } catch (error) {
      console.warn('Database cache cleanup error:', error);
    }
  }

  static clearCache(): void {
    this.cache.clear();
    console.log('Cache cleared');
  }

  static async warmupCache(commonFiles: Array<{ hash: string; fileName: string }>): Promise<void> {
    console.log('Warming up cache for', commonFiles.length, 'files');
    
    for (const file of commonFiles) {
      await this.getCachedResult(file.hash);
    }
  }
}
