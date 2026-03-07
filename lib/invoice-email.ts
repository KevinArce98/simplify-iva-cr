const DEFAULT_INVOICE_DOMAIN = 'facturas.simplifyiva.local';

function getInvoiceDomain() {
  return (process.env.MAILGUN_DOMAIN || process.env.INVOICE_INBOUND_DOMAIN || DEFAULT_INVOICE_DOMAIN)
    .trim()
    .toLowerCase();
}

export function normalizeTaxIdForEmail(taxId: string): string {
  return taxId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function buildInvoiceEmailForTaxId(taxId: string): string {
  return `facturas-${normalizeTaxIdForEmail(taxId)}@${getInvoiceDomain()}`;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function extractInvoiceEmailToken(value: string): string | null {
  const normalized = normalizeEmail(value);
  const [localPart] = normalized.split('@');

  if (!localPart?.startsWith('facturas-')) {
    return null;
  }

  const token = localPart.slice('facturas-'.length);
  return token || null;
}
