import { z } from 'zod';
import { SlidingWindowRateLimiter } from './rate-limiter';

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>;
}

export interface SafeActionOptions<TSchema extends z.ZodTypeAny> {
  schema: TSchema;
  rateLimiter?: SlidingWindowRateLimiter;
  getRateLimitKey?: (input: z.infer<TSchema>) => string;
}

/**
 * Higher-order Server Action wrapper providing:
 * 1. Zod input parsing & schema validation
 * 2. Sliding window rate limiting
 * 3. Sanitized error output preventing internal information leaks
 */
export function createSafeAction<TSchema extends z.ZodTypeAny, TResult>(
  options: SafeActionOptions<TSchema>,
  handler: (validatedInput: z.infer<TSchema>) => Promise<TResult>
) {
  return async (rawInput: unknown): Promise<ActionResponse<TResult>> => {
    try {
      // 1. Validate Input Schema
      const parseResult = options.schema.safeParse(rawInput);
      if (!parseResult.success) {
        const fieldErrors = parseResult.error.flatten().fieldErrors;
        return {
          success: false,
          error: 'Input validation failed. Please check the submitted fields.',
          validationErrors: fieldErrors as Record<string, string[]>,
        };
      }

      const validatedInput = parseResult.data;

      // 2. Check Rate Limiter if configured
      if (options.rateLimiter) {
        const rateLimitKey = options.getRateLimitKey
          ? options.getRateLimitKey(validatedInput)
          : 'global-action';

        const rateCheck = options.rateLimiter.check(rateLimitKey);
        if (!rateCheck.success) {
          const waitMinutes = Math.ceil(rateCheck.resetMs / 60000);
          return {
            success: false,
            error: `Too many attempts. Please try again in ${waitMinutes} minute(s).`,
          };
        }
      }

      // 3. Execute Core Business Logic
      const data = await handler(validatedInput);
      return {
        success: true,
        data,
      };
    } catch (err: unknown) {
      // 4. Secure Error Masking (Never expose database exceptions or stack traces to client)
      console.error('[SafeAction Error]:', err instanceof Error ? err.message : err);

      return {
        success: false,
        error: 'An unexpected server error occurred while processing your request. Please try again later.',
      };
    }
  };
}
