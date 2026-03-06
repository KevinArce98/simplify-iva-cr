import { prisma } from './prisma';
import { parseInvoiceXML, getDocumentType } from './xml-parser';
import { extractUserIdFromInvoiceEmail, normalizeEmail } from './invoice-email';

/**
 * Represents an email attachment from Mailgun
 */
export type MailgunAttachment = {
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  content?: string; // Direct content if available (preferred)
};

/**
 * Result of processing a single attachment
 */
export type AttachmentProcessingResult = {
  filename: string;
  status: 'success' | 'skipped' | 'error';
  reason?: string;
  invoiceId?: string;
  error?: string;
};

/**
 * Result of processing an entire email
 */
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
};

/**
 * Extracts the main recipient email from Mailgun payload
 * Handles multiple recipients and extracts the first one
 */
export function extractRecipientEmail(recipient: string | string[]): string {
  if (Array.isArray(recipient)) {
    return recipient[0];
  }
  
  // Extract email from "Name <email@domain.com>" format
  const match = recipient.match(/<(.+?)>/);
  if (match) {
    return match[1];
  }
  
  return recipient;
}

/**
 * Finds user by email address
 */
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const normalizedEmail = normalizeEmail(email);

    const userByAccountEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (userByAccountEmail) {
      return userByAccountEmail;
    }

    const userIdFromInvoiceEmail = extractUserIdFromInvoiceEmail(normalizedEmail);
    if (userIdFromInvoiceEmail) {
      const userById = await prisma.user.findUnique({
        where: { id: userIdFromInvoiceEmail },
        select: { id: true },
      });

      if (userById) {
        return userById;
      }
    }

    let user: { id: string } | null = null;

    try {
      const usersByInvoiceEmail = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
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

/**
 * Checks if attachment should be processed
 */
function shouldProcessAttachment(filename: string, contentType: string): {
  process: boolean;
  reason?: string;
} {
  // Only accept XML files
  if (!filename.toLowerCase().endsWith('.xml')) {
    return { process: false, reason: 'Not an XML file' };
  }
  
  // Ignore PDF files (should not reach here, but defensive check)
  if (contentType.includes('pdf')) {
    return { process: false, reason: 'PDF files are not supported' };
  }
  
  return { process: true };
}

/**
 * Downloads attachment content from Mailgun storage URL or returns direct content
 */
async function getAttachmentContent(attachment: MailgunAttachment): Promise<string> {
  // If content is already available, return it directly
  if (attachment.content) {
    return attachment.content;
  }
  
  // Otherwise download from URL
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

/**
 * Checks if invoice already exists by clave
 */
async function isInvoiceDuplicate(clave: string): Promise<boolean> {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { clave },
      select: { id: true },
    });
    
    return !!existing;
  } catch (error) {
    console.error(`Error checking duplicate for clave ${clave}:`, error);
    return false;
  }
}

/**
 * Processes a single XML attachment
 */
async function processXMLAttachment(
  userId: string,
  filename: string,
  xmlContent: string
): Promise<AttachmentProcessingResult> {
  try {
    // Check document type
    const docType = getDocumentType(xmlContent);

    // Only process electronic invoice documents
    if (docType !== 'FacturaElectronica') {
      const reason = docType
        ? `${docType} documents are not supported`
        : 'Unknown XML document type';

      return {
        filename,
        status: 'skipped',
        reason,
      };
    }
    
    // Parse invoice XML
    const parsedInvoice = await parseInvoiceXML(xmlContent);
    
    // Check for duplicate by clave
    if (parsedInvoice.clave) {
      const isDuplicate = await isInvoiceDuplicate(parsedInvoice.clave);
      if (isDuplicate) {
        return {
          filename,
          status: 'skipped',
          reason: `Duplicate invoice (clave: ${parsedInvoice.clave})`,
        };
      }
    }
    
    const invoiceDate = new Date(parsedInvoice.fecha);
    const exchangeRate = parsedInvoice.tipoCambio;
    
    // Extract detailed amounts from desglose if available
    let totalGravado = parsedInvoice.subtotalGravado;
    let totalExento = parsedInvoice.subtotalExento;
    let totalImpuesto = parsedInvoice.totalImpuesto;
    
    if (parsedInvoice.desgloseTarifas && parsedInvoice.desgloseTarifas.length > 0) {
      totalGravado = parsedInvoice.desgloseTarifas
        .filter(d => d.tarifa > 0)
        .reduce((sum, d) => sum + d.base, 0);
      
      totalExento = parsedInvoice.desgloseTarifas
        .filter(d => d.tarifa === 0)
        .reduce((sum, d) => sum + d.base, 0);
      
      totalImpuesto = parsedInvoice.desgloseTarifas
        .reduce((sum, d) => sum + d.impuesto, 0);
    }
    
    // Create invoice in database
    const invoice = await prisma.invoice.create({
      data: {
        userId,
        fileName: filename,
        tipo: 'GASTO', // Inbound invoices are expenses
        numeroConsecutivo: parsedInvoice.numeroConsecutivo,
        clave: parsedInvoice.clave,
        fechaEmision: invoiceDate,
        emisorNombre: parsedInvoice.emisor?.nombre,
        receptorNombre: parsedInvoice.receptor?.nombre,
        
        // Base amounts for Hacienda declaration
        subtotalGravado: parsedInvoice.subtotalGravado,
        subtotalExento: parsedInvoice.subtotalExento,
        tarifaIVA: parsedInvoice.tarifaIVA,
        
        // Detailed amounts from XML
        totalGravado,
        totalExento,
        totalImpuesto,
        totalComprobante: parsedInvoice.totalComprobante,
        
        // Currency and exchange rate
        tipoMoneda: parsedInvoice.moneda,
        tipoCambio: exchangeRate,
      },
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

/**
 * Processes all attachments from an inbound email
 */
export async function processInboundEmail(
  recipient: string,
  attachments: MailgunAttachment[]
): Promise<EmailProcessingResult> {
  try {
    // Extract and validate recipient email
    const recipientEmail = extractRecipientEmail(recipient);
    
    // Find user by email
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
    
    // Process each attachment
    for (const attachment of attachments) {
      // Check if attachment should be processed
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
        // Get attachment content
        const xmlContent = await getAttachmentContent(attachment);
        
        // Process XML
        const result = await processXMLAttachment(
          user.id,
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
    
    return {
      success: true,
      recipient: recipientEmail,
      userId: user.id,
      totalAttachments: attachments.length,
      processedAttachments: processedCount,
      skippedAttachments: skippedCount,
      failedAttachments: failedCount,
      results,
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
