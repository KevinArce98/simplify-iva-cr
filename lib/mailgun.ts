import crypto from 'crypto';

/**
 * Validates Mailgun webhook signature
 * @see https://documentation.mailgun.com/en/latest/user_manual.html#securing-webhooks
 */
export function validateMailgunSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  
  if (!signingKey) {
    throw new Error('MAILGUN_WEBHOOK_SIGNING_KEY not configured');
  }

  // Concatenate timestamp and token
  const encodedData = timestamp + token;
  
  // Create HMAC-SHA256 signature
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(encodedData);
  const computedSignature = hmac.digest('hex');
  
  // Compare signatures (constant-time comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

/**
 * Validates webhook timestamp to prevent replay attacks
 * Rejects requests older than 15 minutes
 */
export function validateMailgunTimestamp(timestamp: string): boolean {
  const timestampMs = parseInt(timestamp) * 1000;
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;
  
  return (now - timestampMs) < fifteenMinutes;
}

/**
 * Complete validation of Mailgun webhook request
 */
export function validateMailgunWebhook(
  timestamp: string,
  token: string,
  signature: string
): { valid: boolean; error?: string } {
  try {
    // Validate timestamp first (prevent replay attacks)
    if (!validateMailgunTimestamp(timestamp)) {
      return { valid: false, error: 'Request timestamp too old (replay attack prevention)' };
    }
    
    // Validate signature
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
