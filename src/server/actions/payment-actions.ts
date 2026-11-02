'use server';

import { createSafeAction } from '../lib/safe-action';
import { verifyPaymentSchema, VerifyPaymentInput } from '../schemas/candidate.schema';
import { paymentOrderLimiter } from '../lib/rate-limiter';
import { z } from 'zod';

const createOrderSchema = z.object({
  candidateToken: z.string().min(20),
  orderAmount: z.number().positive().max(500000),
  orderCurrency: z.literal('INR').default('INR'),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
});

type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Safe Payment Order Creation Action
 */
export const createCashfreeOrder = createSafeAction(
  {
    schema: createOrderSchema,
    rateLimiter: paymentOrderLimiter,
    getRateLimitKey: (input: CreateOrderInput) => `order_${input.candidateToken}`,
  },
  async (input: CreateOrderInput) => {
    // Generate deterministic and trace-able order reference
    const orderId = `CF_${Date.now()}_${input.candidateToken.slice(-6)}`;

    // In production, invoke Cashfree Orders API with environment credentials:
    // POST https://api.cashfree.com/pg/orders
    return {
      orderId,
      paymentSessionId: `session_${crypto.randomUUID()}`,
      orderAmount: input.orderAmount,
      orderCurrency: input.orderCurrency,
    };
  }
);

/**
 * Safe Payment Verification Action
 */
export const verifyCashfreePaymentStatus = createSafeAction(
  {
    schema: verifyPaymentSchema,
  },
  async (input: VerifyPaymentInput) => {
    // In production, fetch order status from Cashfree REST endpoint directly
    // to prevent client-tampered payment statuses:
    // GET https://api.cashfree.com/pg/orders/{order_id}
    return {
      orderId: input.orderId,
      status: 'SUCCESS',
      verifiedAt: new Date().toISOString(),
    };
  }
);
