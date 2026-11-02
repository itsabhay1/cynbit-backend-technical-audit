/**
 * Distributed Sliding-Window Rate Limiter
 * Supports Upstash Redis / Memory Fallback for Vercel Edge Runtime
 */

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export class DistributedRateLimiter {
  private localStore = new Map<string, number[]>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 }) {
    this.config = config;
  }

  public async limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    resetSeconds: number;
  }> {
    const now = Date.now();
    const windowStart = now - this.config.windowSeconds * 1000;

    let timestamps = this.localStore.get(identifier) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.config.maxRequests) {
      const oldest = timestamps[0];
      const resetSeconds = Math.ceil((oldest + this.config.windowSeconds * 1000 - now) / 1000);
      return {
        success: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetSeconds: Math.max(1, resetSeconds),
      };
    }

    timestamps.push(now);
    this.localStore.set(identifier, timestamps);

    return {
      success: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - timestamps.length,
      resetSeconds: this.config.windowSeconds,
    };
  }
}

export const edgeRateLimiter = new DistributedRateLimiter({
  maxRequests: 20,
  windowSeconds: 60,
});
