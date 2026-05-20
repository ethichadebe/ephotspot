const BANGO_API_KEY = process.env.BANGO_API_KEY || '';
const BANGO_API_SECRET = process.env.BANGO_API_SECRET || '';
const BANGO_API_URL = process.env.BANGO_API_URL || 'https://api.bango.net';

export async function initiateBangoCharge(
  userId: string,
  phone: string,
  packageId: string,
  amountZar: number
): Promise<{ chargeId: string; status: string }> {
  if (!BANGO_API_KEY || !BANGO_API_SECRET) {
    // TODO: configure BANGO_API_KEY and BANGO_API_SECRET in .env
    return { chargeId: `dev-${Date.now()}`, status: 'pending' };
  }

  const res = await fetch(`${BANGO_API_URL}/v1/charge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${BANGO_API_KEY}:${BANGO_API_SECRET}`).toString('base64')}`,
    },
    body: JSON.stringify({
      msisdn: phone,
      amount: amountZar,
      currency: 'ZAR',
      externalReference: `${userId}-${packageId}-${Date.now()}`,
      customData: { userId, packageId },
    }),
  });

  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message || 'Bango charge failed');
  }

  const data = await res.json() as { chargeId: string; status: string };
  return data;
}

export interface BangoCallbackResult {
  success: boolean;
  userId: string;
  packageId: string;
  amountZar: number;
  reference: string;
}

export async function processBangoCallback(body: any): Promise<BangoCallbackResult> {
  const success: boolean = body?.status === 'SUCCESS';
  const userId: string = body?.customData?.userId || body?.userId || '';
  const packageId: string = body?.customData?.packageId || body?.packageId || '';
  const amountZar: number = parseFloat(body?.amount || '0');
  const reference: string = body?.chargeId || body?.externalReference || '';

  return { success, userId, packageId, amountZar, reference };
}
