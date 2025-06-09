import { supabase } from "@/integrations/supabase/client";

export interface CacheLogEvent {
  event_type: 'hit' | 'miss' | 'store' | 'invalidate';
  cache_key: string;
  skill_tags?: string[];
  response_type?: 'grading' | 'analysis' | 'feedback';
  processing_time_ms?: number;
  cost_saving_estimate?: number;
  exam_id?: string;
  question_number?: number;
}

export class CacheLoggingService {
  private static logs: CacheLogEvent[] = [];
  private static readonly MAX_MEMORY_LOGS = 1000;

  static logCacheEvent(
    eventType: 'hit' | 'miss' | 'store' | 'invalidate',
    cacheKey: string,
    additionalData: Partial<CacheLogEvent> = {}
  ): void {
    const event: CacheLogEvent = {
      event_type: eventType,
      cache_key: cacheKey,
      ...additionalData
    };

    // Store in memory
    this.logs.push(event);
    
    // Keep memory usage manageable
    if (this.logs.length > this.MAX_MEMORY_LOGS) {
      this.logs = this.logs.slice(-this.MAX_MEMORY_LOGS);
    }

    // Log to database asynchronously
    this.persistCacheEvent(event).catch(error => {
      console.warn('Failed to persist cache event:', error);
    });

    // Console logging for development
    const skillInfo = event.skill_tags ? ` (skills: ${event.skill_tags.join(', ')})` : '';
    const costInfo = event.cost_saving_estimate ? ` saved: $${event.cost_saving_estimate.toFixed(4)}` : '';
    console.log(`📋 Cache ${eventType}: ${cacheKey}${skillInfo}${costInfo}`);
  }

  private static async persistCacheEvent(event: CacheLogEvent): Promise<void> {
    try {
      await supabase.functions.invoke('log-cache-event', {
        body: event
      });
    } catch (error) {
      // Silently handle database logging errors to not disrupt main flow
    }
  }

  static getCacheEventHistory(filters: {
    eventType?: string;
    skillTags?: string[];
    examId?: string;
    timeRange?: { start: Date; end: Date };
  } = {}): CacheLogEvent[] {
    let filtered = [...this.logs];

    if (filters.eventType) {
      filtered = filtered.filter(log => log.event_type === filters.eventType);
    }

    if (filters.skillTags && filters.skillTags.length > 0) {
      filtered = filtered.filter(log => 
        log.skill_tags && 
        filters.skillTags!.some(tag => log.skill_tags!.includes(tag))
      );
    }

    if (filters.examId) {
      filtered = filtered.filter(log => log.exam_id === filters.examId);
    }

    return filtered;
  }

  static getCacheAnalytics() {
    const events = this.logs;
    const hits = events.filter(e => e.event_type === 'hit').length;
    const misses = events.filter(e => e.event_type === 'miss').length;
    const stores = events.filter(e => e.event_type === 'store').length;
    
    const hitRate = (hits + misses) > 0 ? hits / (hits + misses) : 0;
    const totalCostSavings = events
      .filter(e => e.cost_saving_estimate)
      .reduce((sum, e) => sum + (e.cost_saving_estimate || 0), 0);

    const skillTagStats: Record<string, { hits: number; misses: number }> = {};
    events.forEach(event => {
      if (event.skill_tags) {
        event.skill_tags.forEach(tag => {
          if (!skillTagStats[tag]) {
            skillTagStats[tag] = { hits: 0, misses: 0 };
          }
          if (event.event_type === 'hit') {
            skillTagStats[tag].hits++;
          } else if (event.event_type === 'miss') {
            skillTagStats[tag].misses++;
          }
        });
      }
    });

    return {
      totalEvents: events.length,
      hitRate,
      totalCostSavings,
      eventBreakdown: {
        hits,
        misses,
        stores,
        invalidations: events.filter(e => e.event_type === 'invalidate').length
      },
      skillTagPerformance: Object.fromEntries(
        Object.entries(skillTagStats).map(([tag, stats]) => [
          tag,
          {
            ...stats,
            hitRate: (stats.hits + stats.misses) > 0 ? stats.hits / (stats.hits + stats.misses) : 0
          }
        ])
      )
    };
  }

  static clearLogs(): void {
    this.logs = [];
    console.log('Cache event logs cleared');
  }
}
