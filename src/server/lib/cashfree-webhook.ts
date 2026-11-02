import crypto from 'node:crypto';

export interface CashfreeWebhookPayload {
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
    };
    payment: {
      cf_payment_id: string;
      payment_status: 'SUCCESS' | 'FAILED' | 'USER_DROPPED';
      payment_amount: number;
      payment_time: string;
    };
    customer_details: {
      customer_id: string;
      customer_phone: string;
    };
  };
  event_time: string;
  type: string;
}

/**
 * Verifies the authenticity of incoming Cashfree Webhooks.
 * Mitigates replay attacks, spoofed payloads, and untrusted callbacks.
 */
export function verifyCashfreeSignature({
  rawBody,
  timestamp,
  signature,
  secretKey,
  maxAgeMs = 300000, // 5 minutes tolerance
}: {
  rawBody: string;
  timestamp: string;
  signature: string;
  secretKey: string;
  maxAgeMs?: number;
}): { isValid: boolean; error?: string } {
  // 1. Check timestamp freshness to mitigate replay attacks
  const eventTime = parseInt(timestamp, 10);
  const now = Date.now();
  if (isNaN(eventTime) || Math.abs(now - eventTime * 1000) > maxAgeMs) {
    return { isValid: false, error: 'Webhook timestamp expired or out of bounds' };
  }

  // 2. Compute expected HMAC signature
  const signatureData = `${timestamp}${rawBody}`;
  const computedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureData)
    .digest('base64');

  // 3. Constant-time comparison to prevent timing attacks
  const computedBuffer = Buffer.from(computedSignature, 'utf8');
  const providedBuffer = Buffer.from(signature, 'utf8');

  if (computedBuffer.length !== providedBuffer.length) {
    return { isValid: false, error: 'Signature length mismatch' };
  }

  const matches = crypto.timingSafeEqual(computedBuffer, providedBuffer);
  if (!matches) {
    return { isValid: false, error: 'Cryptographic signature verification failed' };
  }

  return { isValid: true };
}

/**
 * Idempotent Webhook Processor
 * Ensures duplicate webhook deliveries do not double-credit candidate accounts.
 */
const processedTransactions = new Set<string>();

export async function processWebhookPayment(payload: CashfreeWebhookPayload): Promise<{
  processed: boolean;
  message: string;
}> {
  const { cf_payment_id, payment_status } = payload.data.payment;
  const { order_id } = payload.data.order;

  // Idempotency check: Reject already processed payment IDs
  if (processedTransactions.has(cf_payment_id)) {
    return {
      processed: false,
      message: `Payment ${cf_payment_id} for order ${order_id} already processed. Idempotent skip.`,
    };
  }

  // Process transaction state
  if (payment_status === 'SUCCESS') {
    // In production, execute serializable Prisma transaction:
    // await prisma.$transaction([
    //   prisma.order.update({ where: { orderId: order_id }, data: { status: 'PAID' } }),
    //   prisma.paymentTransaction.create({ data: { cfPaymentId: cf_payment_id, ... } })
    // ]);
    processedTransactions.add(cf_payment_id);
    return { processed: true, message: `Payment ${cf_payment_id} successfully recorded.` };
  }

  return { processed: true, message: `Payment status ${payment_status} noted.` };
}
