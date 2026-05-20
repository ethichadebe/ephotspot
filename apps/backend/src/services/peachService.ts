import crypto from 'crypto';

const PEACH_TOKEN = process.env.PEACH_PAYMENTS_TOKEN || '';
const PEACH_ENTITY_ID = process.env.PEACH_PAYMENTS_ENTITY_ID || '';
const PEACH_WEBHOOK_SECRET = process.env.PEACH_PAYMENTS_WEBHOOK_SECRET || '';
const PEACH_BASE_URL = 'https://eu-test.oppwa.com'; // use eu.oppwa.com in production

export async function initiateCheckout(
  packageId: string,
  amountZar: number,
  userId: string
): Promise<string> {
  if (!PEACH_TOKEN || !PEACH_ENTITY_ID) {
    // TODO: configure PEACH_PAYMENTS_TOKEN and PEACH_PAYMENTS_ENTITY_ID in .env
    return `https://checkout.placeholder.dev?pkg=${packageId}&user=${userId}&amount=${amountZar}`;
  }

  const body = new URLSearchParams({
    'authentication.userId': PEACH_TOKEN,
    'authentication.password': '',
    'authentication.entityId': PEACH_ENTITY_ID,
    amount: amountZar.toFixed(2),
    currency: 'ZAR',
    paymentType: 'DB',
    'merchantTransactionId': `${userId}-${packageId}-${Date.now()}`,
    'customParameters[USER_ID]': userId,
    'customParameters[PACKAGE_ID]': packageId,
  });

  const res = await fetch(`${PEACH_BASE_URL}/v1/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PEACH_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json() as { id?: string };
  if (!data.id) throw new Error('Peach Payments checkout failed');

  const apiBase = process.env.API_BASE_URL || 'http://localhost:3000';
  return `${PEACH_BASE_URL}/v1/paymentWidgets.js?checkoutId=${data.id}&shopperResultUrl=${apiBase}/payments/peach/result`;
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!PEACH_WEBHOOK_SECRET) return true; // skip verification in dev
  const expected = crypto.createHmac('sha256', PEACH_WEBHOOK_SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function isSuccessCode(resultCode: string): boolean {
  // Peach Payments success codes: 000.000.000 and 000.100.110
  return /^(000\.000\.|000\.100\.1)/.test(resultCode);
}
