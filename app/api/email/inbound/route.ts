import { NextRequest, NextResponse } from 'next/server';
import { validateMailgunWebhook } from '@/lib/mailgun';
import { processInboundEmail, type MailgunAttachment } from '@/lib/email-processor';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();

    const timestamp = formData.get('timestamp') as string;
    const token = formData.get('token') as string;
    const signature = formData.get('signature') as string;

    if (!timestamp || !token || !signature) {
      console.warn('⚠ Missing signature fields in webhook request');
      return NextResponse.json(
        { error: 'Missing signature fields' },
        { status: 401 }
      );
    }

    const validation = validateMailgunWebhook(timestamp, token, signature);
    if (!validation.valid) {
      console.warn(`⚠ Invalid webhook signature: ${validation.error}`);
      return NextResponse.json(
        { error: 'Invalid signature', details: validation.error },
        { status: 401 }
      );
    }

    const recipient = formData.get('recipient') as string;
    const sender = formData.get('sender') as string;
    const subject = formData.get('subject') as string;
    const messageId = formData.get('Message-Id') as string;

    const attachmentCount = parseInt(formData.get('attachment-count') as string || '0');

    console.log(`📧 Received email from ${sender} to ${recipient}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Attachments: ${attachmentCount}`);

    const attachments: MailgunAttachment[] = [];

    if (attachmentCount > 0) {
      for (let i = 1; i <= attachmentCount; i++) {
        const attachmentFile = formData.get(`attachment-${i}`) as File | null;

        if (attachmentFile && attachmentFile instanceof File) {
          const content = await attachmentFile.text();

          attachments.push({
            filename: attachmentFile.name,
            contentType: attachmentFile.type,
            size: attachmentFile.size,
            url: '',
            content,
          });

          console.log(`   📎 ${attachmentFile.name} (${attachmentFile.type}, ${attachmentFile.size} bytes)`);
        }
      }
    }

    const processingResult = await processInboundEmail(recipient, attachments);

    const processingTime = Date.now() - startTime;

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
          skippedDetails: processingResult.skippedDetails,
          processingTimeMs: processingTime,
          userId: processingResult.userId,
        },
      });
    } catch (logError) {
      console.error('Error logging email processing:', logError);
    }

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
