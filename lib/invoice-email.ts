const DEFAULT_INVOICE_DOMAIN = 'facturas.simplifyiva.local';

function getInvoiceDomain() {
  return (process.env.MAILGUN_DOMAIN || process.env.INVOICE_INBOUND_DOMAIN || DEFAULT_INVOICE_DOMAIN)
    .trim()
    .toLowerCase();
}

export function buildInvoiceEmailForUserId(userId: string): string {
  return `facturas-${userId}@${getInvoiceDomain()}`;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function extractUserIdFromInvoiceEmail(value: string): string | null {
  const normalized = normalizeEmail(value);
  const [localPart] = normalized.split('@');

  if (!localPart?.startsWith('facturas-')) {
    return null;
  }

  const userId = localPart.slice('facturas-'.length);
  return userId || null;
}
