import { NextRequest, NextResponse } from 'next/server';
import { validateMailgunWebhook } from '@/lib/mailgun';
import { processInboundEmail, type MailgunAttachment } from '@/lib/email-processor';
import { prisma } from '@/lib/prisma';

/**
 * Mailgun inbound email webhook handler
 * 
 * POST /api/email/inbound
 * 
 * Receives emails forwarded from Mailgun and processes XML invoice attachments
 * 
 * Security:
 * - Validates Mailgun webhook signature
 * - Rejects requests with invalid timestamps (replay protection)
 * - Requires MAILGUN_WEBHOOK_SIGNING_KEY environment variable
 * 
 * Processing:
 * - Maps recipient email to user account
 * - Processes XML attachments only
 * - Ignores PDF files
 * - Ignores MensajeReceptor documents
 * - Deduplicates invoices by clave
 * - Logs all email processing events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse form data from Mailgun
    const formData = await request.formData();
    
    // Extract signature verification data
    const timestamp = formData.get('timestamp') as string;
    const token = formData.get('token') as string;
    const signature = formData.get('signature') as string;
    
    // Validate required signature fields
    if (!timestamp || !token || !signature) {
      console.warn('⚠ Missing signature fields in webhook request');
      return NextResponse.json(
        { error: 'Missing signature fields' },
        { status: 401 }
      );
    }
    
    // Validate Mailgun signature
    const validation = validateMailgunWebhook(timestamp, token, signature);
    if (!validation.valid) {
      console.warn(`⚠ Invalid webhook signature: ${validation.error}`);
      return NextResponse.json(
        { error: 'Invalid signature', details: validation.error },
        { status: 401 }
      );
    }
    
    // Extract email metadata
    const recipient = formData.get('recipient') as string;
    const sender = formData.get('sender') as string;
    const subject = formData.get('subject') as string;
    const messageId = formData.get('Message-Id') as string;
    
    // Extract attachment count
    const attachmentCount = parseInt(formData.get('attachment-count') as string || '0');
    
    console.log(`📧 Received email from ${sender} to ${recipient}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Attachments: ${attachmentCount}`);
    
    // Extract attachments from Mailgun form data
    // Mailgun sends attachments as 'attachment-1', 'attachment-2', etc.
    const attachments: MailgunAttachment[] = [];
    
    if (attachmentCount > 0) {
      for (let i = 1; i <= attachmentCount; i++) {
        const attachmentFile = formData.get(`attachment-${i}`) as File | null;
        
        if (attachmentFile && attachmentFile instanceof File) {
          // Read file content directly from the File object
          const content = await attachmentFile.text();
          
          // Store content temporarily (Mailgun doesn't provide storage URLs in all cases)
          // We'll pass the content directly instead of a URL
          attachments.push({
            filename: attachmentFile.name,
            contentType: attachmentFile.type,
            size: attachmentFile.size,
            url: '', // We'll use content directly
            content, // Add content field
          });
          
          console.log(`   📎 ${attachmentFile.name} (${attachmentFile.type}, ${attachmentFile.size} bytes)`);
        }
      }
    }
    
    // Process email and attachments
    const processingResult = await processInboundEmail(recipient, attachments);
    
    const processingTime = Date.now() - startTime;
    
    // Log email processing event
    try {
      await prisma.emailLog.create({
        data: {
          messageId: messageId || `generated-${Date.now()}`,
          sender,
          recipient: processingResult.recipient,
          subject: subject || '(no subject)',
          attachmentCount,
          processedCount: processingResult.processedAttachments,
          skippedCount: processingResult.skippedAttachments,
          failedCount: processingResult.failedAttachments,
          success: processingResult.success,
          errorMessage: processingResult.error,
          processingTimeMs: processingTime,
          userId: processingResult.userId,
        },
      });
    } catch (logError) {
      console.error('Error logging email processing:', logError);
      // Continue even if logging fails
    }
    
    // Log results
    console.log(`✓ Email processed in ${processingTime}ms`);
    console.log(`   Processed: ${processingResult.processedAttachments}`);
    console.log(`   Skipped: ${processingResult.skippedAttachments}`);
    console.log(`   Failed: ${processingResult.failedAttachments}`);
    
    if (processingResult.results.length > 0) {
      processingResult.results.forEach((result) => {
        if (result.status === 'success') {
          console.log(`   ✓ ${result.filename} → Invoice ${result.invoiceId}`);
        } else if (result.status === 'skipped') {
          console.log(`   ⊘ ${result.filename}: ${result.reason}`);
        } else {
          console.log(`   ✗ ${result.filename}: ${result.error}`);
        }
      });
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Email processed successfully',
      recipient: processingResult.recipient,
      userId: processingResult.userId,
      attachments: {
        total: processingResult.totalAttachments,
        processed: processingResult.processedAttachments,
        skipped: processingResult.skippedAttachments,
        failed: processingResult.failedAttachments,
      },
      processingTimeMs: processingTime,
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error handling inbound email webhook:', error);
    
    // Try to log error
    try {
      await prisma.emailLog.create({
        data: {
          messageId: `error-${Date.now()}`,
          sender: 'unknown',
          recipient: 'unknown',
          subject: '(error during processing)',
          attachmentCount: 0,
          processedCount: 0,
          skippedCount: 0,
          failedCount: 0,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: processingTime,
        },
      });
    } catch (logError) {
      console.error('Error logging email processing error:', logError);
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Reject non-POST requests
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
