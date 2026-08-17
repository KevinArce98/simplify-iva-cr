import crypto from 'crypto';

export function validateMailgunSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

  if (!signingKey) {
    throw new Error('MAILGUN_WEBHOOK_SIGNING_KEY not configured');
  }

  const encodedData = timestamp + token;

  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(encodedData);
  const computedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

export function validateMailgunTimestamp(timestamp: string): boolean {
  const timestampMs = parseInt(timestamp) * 1000;
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  return (now - timestampMs) < fifteenMinutes;
}

export function validateMailgunWebhook(
  timestamp: string,
  token: string,
  signature: string
): { valid: boolean; error?: string } {
  try {
    if (!validateMailgunTimestamp(timestamp)) {
      return { valid: false, error: 'Request timestamp too old (replay attack prevention)' };
    }

    if (!validateMailgunSignature(timestamp, token, signature)) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation error'
    };
  }
}
