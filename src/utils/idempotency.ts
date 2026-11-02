/**
 * Idempotency Key Processor
 * Prevents double-processing of network retries, payment triggers, and form submissions.
 */

interface CachedResponse {
  statusCode: number;
  body: unknown;
  createdAt: number;
}

export class IdempotencyManager {
  private cache = new Map<string, CachedResponse>();
  private pendingKeys = new Set<string>();
  private readonly ttlMs: number;

  constructor(ttlMinutes: number = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Evaluates if a request with given Idempotency-Key is new, currently pending, or already resolved.
   */
  public async execute<T>({
    idempotencyKey,
    handler,
  }: {
    idempotencyKey?: string | null;
    handler: () => Promise<{ statusCode: number; body: T }>;
  }): Promise<{ statusCode: number; body: T; fromCache: boolean }> {
    if (!idempotencyKey) {
      // Without key, execute directly without idempotency guarantees
      const result = await handler();
      return { ...result, fromCache: false };
    }

    // 1. Check if response is already cached
    const cached = this.cache.get(idempotencyKey);
    if (cached) {
      if (Date.now() - cached.createdAt < this.ttlMs) {
        return {
          statusCode: cached.statusCode,
          body: cached.body as T,
          fromCache: true,
        };
      }
      this.cache.delete(idempotencyKey);
    }

    // 2. Guard against concurrent in-flight requests with the identical key
    if (this.pendingKeys.has(idempotencyKey)) {
      throw new Error('Concurrent request with identical Idempotency-Key is already being processed.');
    }

    this.pendingKeys.add(idempotencyKey);
    try {
      const result = await handler();
      this.cache.set(idempotencyKey, {
        statusCode: result.statusCode,
        body: result.body,
        createdAt: Date.now(),
      });
      return { ...result, fromCache: false };
    } finally {
      this.pendingKeys.delete(idempotencyKey);
    }
  }
}

export const globalIdempotencyManager = new IdempotencyManager();
