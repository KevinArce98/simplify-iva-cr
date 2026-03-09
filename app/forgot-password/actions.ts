'use server';

import crypto from 'crypto';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { normalizeEmail } from '@/lib/invoice-email';
import { sendPasswordResetCodeEmail } from '@/lib/password-reset-email';

type RequestResetInput = {
  email: string;
};

type ResetPasswordInput = {
  email: string;
  code: string;
  newPassword: string;
};

type PasswordResetCodeRow = {
  id: string;
  codeHash: string;
  attempts: number;
};

const CODE_EXPIRY_MINUTES = 15;
const CODE_REQUEST_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function buildCodeHash(email: string, code: string) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.NEXTAUTH_SECRET || 'password-reset-secret';
  return crypto.createHash('sha256').update(`${secret}:${email}:${code}`).digest('hex');
}

function generateSixDigitCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function genericRequestSuccess() {
  return {
    success: true,
    message:
      'Si el correo existe, te enviamos un código para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.',
  };
}

export async function requestPasswordResetCode(input: RequestResetInput) {
  const email = normalizeEmail(input.email || '');

  if (!email) {
    return { success: false, error: 'Ingresa un correo electrónico válido.' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    return genericRequestSuccess();
  }

  const now = new Date();
  const cooldownStart = new Date(now.getTime() - CODE_REQUEST_COOLDOWN_SECONDS * 1000);

  const recentRequests = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "PasswordResetCode"
    WHERE "userId" = ${user.id}
      AND "createdAt" >= ${cooldownStart}
      AND "usedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  if (recentRequests.length > 0) {
    return genericRequestSuccess();
  }

  const code = generateSixDigitCode();
  const codeHash = buildCodeHash(email, code);
  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000);

  await prisma.$executeRaw`
    UPDATE "PasswordResetCode"
    SET "usedAt" = ${now}
    WHERE "userId" = ${user.id}
      AND "usedAt" IS NULL
      AND "expiresAt" > ${now}
  `;

  await prisma.$executeRaw`
    INSERT INTO "PasswordResetCode" (id, "userId", "codeHash", "expiresAt", "createdAt", attempts)
    VALUES (${crypto.randomUUID()}, ${user.id}, ${codeHash}, ${expiresAt}, ${now}, 0)
  `;

  try {
    await sendPasswordResetCodeEmail({
      to: user.email,
      code,
    });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }

  return genericRequestSuccess();
}

export async function resetPasswordWithCode(input: ResetPasswordInput) {
  const email = normalizeEmail(input.email || '');
  const code = (input.code || '').trim();
  const newPassword = input.newPassword || '';

  if (!email || !/^\d{6}$/.test(code)) {
    return { success: false, error: 'El código ingresado no es válido.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return { success: false, error: 'Código inválido o expirado.' };
  }

  const now = new Date();
  const activeCodes = await prisma.$queryRaw<PasswordResetCodeRow[]>`
    SELECT id, "codeHash", attempts
    FROM "PasswordResetCode"
    WHERE "userId" = ${user.id}
      AND "usedAt" IS NULL
      AND "expiresAt" > ${now}
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  const activeCode = activeCodes[0];

  if (!activeCode) {
    return { success: false, error: 'Código inválido o expirado.' };
  }

  if (activeCode.attempts >= MAX_ATTEMPTS) {
    await prisma.$executeRaw`
      UPDATE "PasswordResetCode"
      SET "usedAt" = ${now}
      WHERE id = ${activeCode.id}
    `;

    return { success: false, error: 'Código inválido o expirado.' };
  }

  const codeHash = buildCodeHash(email, code);

  if (activeCode.codeHash !== codeHash) {
    const nextAttempts = activeCode.attempts + 1;

    if (nextAttempts >= MAX_ATTEMPTS) {
      await prisma.$executeRaw`
        UPDATE "PasswordResetCode"
        SET attempts = ${nextAttempts}, "usedAt" = ${now}
        WHERE id = ${activeCode.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "PasswordResetCode"
        SET attempts = ${nextAttempts}
        WHERE id = ${activeCode.id}
      `;
    }

    return { success: false, error: 'Código inválido o expirado.' };
  }

  const hashedPassword = await hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await tx.$executeRaw`
      UPDATE "PasswordResetCode"
      SET "usedAt" = ${now}
      WHERE id = ${activeCode.id}
    `;

    await tx.$executeRaw`
      UPDATE "PasswordResetCode"
      SET "usedAt" = ${now}
      WHERE "userId" = ${user.id}
        AND "usedAt" IS NULL
        AND id <> ${activeCode.id}
    `;
  });

  return {
    success: true,
    message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
  };
}
