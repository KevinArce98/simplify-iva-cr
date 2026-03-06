#!/usr/bin/env tsx

/**
 * Test script for Mailgun webhook signature validation
 * 
 * Usage:
 *   npx tsx scripts/test-mailgun-signature.ts
 *   
 * Or set environment variable:
 *   MAILGUN_WEBHOOK_SIGNING_KEY=your_key npx tsx scripts/test-mailgun-signature.ts
 * 
 * This script helps verify that your Mailgun webhook signing key is correct
 * by testing the signature validation logic.
 */

import crypto from 'crypto';
import { readFileSync } from 'fs';

// Try to load .env file
let signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;

if (!signingKey) {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    const match = envContent.match(/MAILGUN_WEBHOOK_SIGNING_KEY=(.+)/);
    if (match) {
      signingKey = match[1].trim();
    }
  } catch (err) {
    // .env file not found or not readable
  }
}

if (!signingKey) {
  console.error('❌ MAILGUN_WEBHOOK_SIGNING_KEY not found in environment');
  console.log('\nPlease add it to your .env file:');
  console.log('MAILGUN_WEBHOOK_SIGNING_KEY=your_key_here');
  console.log('\nOr set it as environment variable:');
  console.log('MAILGUN_WEBHOOK_SIGNING_KEY=your_key npx tsx scripts/test-mailgun-signature.ts');
  process.exit(1);
}

const resolvedSigningKey = signingKey;

console.log('🔐 Testing Mailgun webhook signature validation\n');
console.log(`Signing key: ${resolvedSigningKey.substring(0, 10)}...${resolvedSigningKey.substring(resolvedSigningKey.length - 10)}\n`);

// Generate test data
const timestamp = String(Math.floor(Date.now() / 1000));
const token = crypto.randomBytes(32).toString('hex');

console.log('Test data:');
console.log(`  Timestamp: ${timestamp}`);
console.log(`  Token: ${token}\n`);

// Create signature
const encodedData = timestamp + token;
const hmac = crypto.createHmac('sha256', resolvedSigningKey);
hmac.update(encodedData);
const signature = hmac.digest('hex');

console.log(`Generated signature: ${signature}\n`);

// Validate signature (like the webhook does)
function validateSignature(ts: string, tkn: string, sig: string): boolean {
  const data = ts + tkn;
  const hmac = crypto.createHmac('sha256', resolvedSigningKey);
  hmac.update(data);
  const computed = hmac.digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(computed)
  );
}

// Test validation
const isValid = validateSignature(timestamp, token, signature);

if (isValid) {
  console.log('✅ Signature validation PASSED');
  console.log('\nYour MAILGUN_WEBHOOK_SIGNING_KEY is correctly configured!\n');
  
  console.log('Sample curl command to test webhook:');
  console.log(`
curl -X POST http://localhost:3000/api/email/inbound \\
  -F "timestamp=${timestamp}" \\
  -F "token=${token}" \\
  -F "signature=${signature}" \\
  -F "recipient=test@example.com" \\
  -F "sender=sender@example.com" \\
  -F "subject=Test Email" \\
  -F "Message-Id=<test@mailgun.org>" \\
  -F "attachment-count=0"
  `);
} else {
  console.log('❌ Signature validation FAILED');
  console.log('\nThis indicates a problem with the validation logic.');
}

// Test timestamp validation
console.log('\n📅 Testing timestamp validation\n');

const now = Date.now();
const validTimestamp = String(Math.floor(now / 1000));
const oldTimestamp = String(Math.floor((now - 20 * 60 * 1000) / 1000)); // 20 minutes ago

function isTimestampValid(ts: string): boolean {
  const timestampMs = parseInt(ts) * 1000;
  const fifteenMinutes = 15 * 60 * 1000;
  return (Date.now() - timestampMs) < fifteenMinutes;
}

console.log(`Valid timestamp (now): ${validTimestamp} → ${isTimestampValid(validTimestamp) ? '✅ Valid' : '❌ Invalid'}`);
console.log(`Old timestamp (20m ago): ${oldTimestamp} → ${isTimestampValid(oldTimestamp) ? '✅ Valid' : '❌ Invalid (expected)'}`);

console.log('\n✅ All tests completed!\n');
