/**
 * Sliding Window In-Memory / Distributed Rate Limiter
 * Enforces per-IP and per-action quota limits to mitigate automated abuse.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private storage = new Map<string, RateLimitRecord>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMinutes: number = 1) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMinutes * 60 * 1000;

    // Periodic cleanup of stale entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
    }
  }

  /**
   * Check if the given identifier (IP, user token) is within allowable rate limits.
   */
  public check(identifier: string): { success: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.storage.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.storage.set(identifier, record);
    }

    // Filter out timestamps outside the active sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = oldest + this.windowMs - now;
      return {
        success: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    // Record current request
    record.timestamps.push(now);
    return {
      success: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, record] of this.storage.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.storage.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters for distinct application surfaces
export const candidateSubmissionLimiter = new SlidingWindowRateLimiter(5, 10); // 5 submissions per 10 mins
export const supportTicketLimiter = new SlidingWindowRateLimiter(3, 15);      // 3 tickets per 15 mins
export const paymentOrderLimiter = new SlidingWindowRateLimiter(5, 5);         // 5 orders per 5 mins
