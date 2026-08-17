import { prisma } from './prisma';
import { parseInvoiceXML, getDocumentType } from './xml-parser';
import { extractInvoiceEmailToken, normalizeEmail } from './invoice-email';
import type { InvoiceType, ParsedXMLInvoice } from './types';
import { encryptNullableNumber, encryptNullableString } from './crypto';

async function getUserTaxIdById(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ taxId: string | null }[]>`
      SELECT "taxId"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;

    return rows[0]?.taxId ?? null;
  } catch {
    return null;
  }
}

export type MailgunAttachment = {
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  content?: string;
};

export type AttachmentProcessingResult = {
  filename: string;
  status: 'success' | 'skipped' | 'error';
  reason?: string;
  invoiceId?: string;
  error?: string;
};

export type EmailProcessingResult = {
  success: boolean;
  recipient: string;
  userId?: string;
  totalAttachments: number;
  processedAttachments: number;
  skippedAttachments: number;
  failedAttachments: number;
  results: AttachmentProcessingResult[];
  error?: string;
  skippedDetails?: string;
};

export function extractRecipientEmail(recipient: string | string[]): string {
  if (Array.isArray(recipient)) {
    return recipient[0];
  }

  const match = recipient.match(/<(.+?)>/);
  if (match) {
    return match[1];
  }

  return recipient;
}

async function findUserByEmail(email: string): Promise<{ id: string; taxId: string | null } | null> {
  try {
    const normalizedEmail = normalizeEmail(email);

    const userByAccountEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (userByAccountEmail) {
      return {
        id: userByAccountEmail.id,
        taxId: await getUserTaxIdById(userByAccountEmail.id),
      };
    }

    const invoiceEmailToken = extractInvoiceEmailToken(normalizedEmail);
    if (invoiceEmailToken) {
      const usersByTaxIdToken = await prisma.$queryRaw<{ id: string; taxId: string | null }[]>`
        SELECT id, "taxId"
        FROM "User"
        WHERE lower(regexp_replace(COALESCE("taxId", ''), '[^a-zA-Z0-9]', '', 'g')) = ${invoiceEmailToken}
        LIMIT 1
      `;

      if (usersByTaxIdToken[0]) {
        return usersByTaxIdToken[0];
      }
    }

    let user: { id: string; taxId: string | null } | null = null;

    try {
      const usersByInvoiceEmail = await prisma.$queryRaw<{ id: string; taxId: string | null }[]>`
        SELECT id, "taxId"
        FROM "User"
        WHERE lower("invoiceEmail") = ${normalizedEmail}
        LIMIT 1
      `;

      user = usersByInvoiceEmail[0] || null;
    } catch (invoiceEmailLookupError) {
      console.warn('invoiceEmail column lookup is not available yet:', invoiceEmailLookupError);
    }

    return user;
  } catch (error) {
    console.error(`Error finding user by email ${email}:`, error);
    return null;
  }
}

function normalizeTaxId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function classifyInvoiceType(parsedInvoice: ParsedXMLInvoice, userTaxId: string | null | undefined): InvoiceType {
  const normalizedUserTaxId = normalizeTaxId(userTaxId);
  const normalizedIssuerTaxId = normalizeTaxId(parsedInvoice.emisor?.identificacion);
  const normalizedReceiverTaxId = normalizeTaxId(parsedInvoice.receptor?.identificacion);

  if (!normalizedUserTaxId) {
    return 'GASTO';
  }

  if (normalizedReceiverTaxId && normalizedReceiverTaxId === normalizedUserTaxId) {
    return 'GASTO';
  }

  if (normalizedIssuerTaxId && normalizedIssuerTaxId === normalizedUserTaxId) {
    return 'EMITIDA';
  }

  return 'GASTO';
}

function shouldProcessAttachment(filename: string, contentType: string): {
  process: boolean;
  reason?: string;
} {
  if (!filename.toLowerCase().endsWith('.xml')) {
    return { process: false, reason: 'Not an XML file' };
  }

  if (contentType.includes('pdf')) {
    return { process: false, reason: 'PDF files are not supported' };
  }

  return { process: true };
}

async function getAttachmentContent(attachment: MailgunAttachment): Promise<string> {
  if (attachment.content) {
    return attachment.content;
  }

  if (!attachment.url) {
    throw new Error('No content or URL provided for attachment');
  }

  const apiKey = process.env.MAILGUN_API_KEY;

  if (!apiKey) {
    throw new Error('MAILGUN_API_KEY not configured');
  }

  const response = await fetch(attachment.url, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

async function isInvoiceDuplicate(userId: string, clave: string): Promise<boolean> {
  try {
    const existing = await prisma.invoice.findFirst({
      where: {
        userId,
        clave,
      },
      select: { id: true },
    });

    return !!existing;
  } catch (error) {
    console.error(`Error checking duplicate for user ${userId} and clave ${clave}:`, error);
    return false;
  }
}

async function processXMLAttachment(
  userId: string,
  userTaxId: string | null | undefined,
  filename: string,
  xmlContent: string
): Promise<AttachmentProcessingResult> {
  try {
    const docType = getDocumentType(xmlContent);

    const supportedTypes = [
      'FacturaElectronica',
      'NotaCreditoElectronica',
      'NotaDebitoElectronica',
    ];
    if (!docType || !supportedTypes.includes(docType)) {
      const reason = docType === 'TiqueteElectronico'
        ? 'Se recibió un TiqueteElectronico. Solo se procesan FacturaElectronica y notas de crédito/débito.'
        : docType
          ? `${docType} documents are not supported`
          : 'Unknown XML document type';

      return {
        filename,
        status: 'skipped',
        reason,
      };
    }

    const parsedInvoice = await parseInvoiceXML(xmlContent);

    if (parsedInvoice.clave) {
      const isDuplicate = await isInvoiceDuplicate(userId, parsedInvoice.clave);
      if (isDuplicate) {
        return {
          filename,
          status: 'skipped',
          reason: `Duplicate invoice for this user (clave: ${parsedInvoice.clave})`,
        };
      }
    }

    const invoiceDate = new Date(parsedInvoice.fecha);
    const exchangeRate = parsedInvoice.tipoCambio;
    const tipo = classifyInvoiceType(parsedInvoice, userTaxId);

    const totalImpuesto = parsedInvoice.totalImpuesto;

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        fileName: filename,
        tipo,
        numeroConsecutivoEncrypted: encryptNullableString(
          parsedInvoice.numeroConsecutivo
        ),
        clave: parsedInvoice.clave,
        fechaEmision: invoiceDate,
        emisorNombreEncrypted: encryptNullableString(parsedInvoice.emisor?.nombre),
        emisorIdentificacionEncrypted: encryptNullableString(
          parsedInvoice.emisor?.identificacion
        ),
        receptorNombreEncrypted: encryptNullableString(parsedInvoice.receptor?.nombre),
        receptorIdentificacionEncrypted: encryptNullableString(
          parsedInvoice.receptor?.identificacion
        ),

        documentType: parsedInvoice.documentType,
        signo: parsedInvoice.signo,

        subtotalGravadoEncrypted: encryptNullableNumber(parsedInvoice.subtotalGravado),
        subtotalExentoEncrypted: encryptNullableNumber(parsedInvoice.subtotalExento),
        subtotalExoneradoEncrypted: encryptNullableNumber(parsedInvoice.subtotalExonerado),
        subtotalNoSujetoEncrypted: encryptNullableNumber(parsedInvoice.subtotalNoSujeto),
        tarifaIVA: parsedInvoice.tarifaIVA,

        totalImpuestoEncrypted: encryptNullableNumber(totalImpuesto),
        totalComprobanteEncrypted: encryptNullableNumber(
          parsedInvoice.totalComprobante
        ),

        tipoMoneda: parsedInvoice.moneda,
        tipoCambio: exchangeRate,
      } as any,
    });

    console.log(`✓ Created invoice ${invoice.id} for user ${userId} from ${filename}`);

    return {
      filename,
      status: 'success',
      invoiceId: invoice.id,
    };
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
    return {
      filename,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function processInboundEmail(
  recipient: string,
  attachments: MailgunAttachment[]
): Promise<EmailProcessingResult> {
  try {
    const recipientEmail = extractRecipientEmail(recipient);

    const user = await findUserByEmail(recipientEmail);

    if (!user) {
      return {
        success: false,
        recipient: recipientEmail,
        totalAttachments: attachments.length,
        processedAttachments: 0,
        skippedAttachments: 0,
        failedAttachments: 0,
        results: [],
        error: `No user found with email: ${recipientEmail}`,
      };
    }

    const results: AttachmentProcessingResult[] = [];
    let processedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const attachment of attachments) {
      const { process, reason } = shouldProcessAttachment(
        attachment.filename,
        attachment.contentType
      );

      if (!process) {
        results.push({
          filename: attachment.filename,
          status: 'skipped',
          reason,
        });
        skippedCount++;
        continue;
      }

      try {
        const xmlContent = await getAttachmentContent(attachment);

        const result = await processXMLAttachment(
          user.id,
          user.taxId,
          attachment.filename,
          xmlContent
        );

        results.push(result);

        if (result.status === 'success') {
          processedCount++;
        } else if (result.status === 'skipped') {
          skippedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          filename: attachment.filename,
          status: 'error',
          error: errorMessage,
        });
        failedCount++;
      }
    }

    const emailSucceeded = processedCount > 0 && failedCount === 0;

    const failedResults = results.filter((result) => result.status === 'error');
    const failureSummary =
      failedResults.length > 0
        ? failedResults
            .map((result) => `${result.filename}: ${result.error || 'Unknown error'}`)
            .join(' | ')
        : undefined;

    const skippedResults = results.filter((result) => result.status === 'skipped');
    const skippedSummary =
      skippedResults.length > 0
        ? skippedResults
            .map((result) => `${result.filename}: ${result.reason || 'Omitido'}`)
            .join(' | ')
        : undefined;

    return {
      success: emailSucceeded,
      recipient: recipientEmail,
      userId: user.id,
      totalAttachments: attachments.length,
      processedAttachments: processedCount,
      skippedAttachments: skippedCount,
      failedAttachments: failedCount,
      results,
      error: failureSummary,
      skippedDetails: skippedSummary,
    };
  } catch (error) {
    console.error('Error processing inbound email:', error);
    return {
      success: false,
      recipient,
      totalAttachments: attachments.length,
      processedAttachments: 0,
      skippedAttachments: 0,
      failedAttachments: 0,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
