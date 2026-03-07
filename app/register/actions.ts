'use server';

import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { buildInvoiceEmailForTaxId, normalizeEmail } from '@/lib/invoice-email';

export async function registerUser(formData: {
  email: string;
  password: string;
  name: string;
  taxId: string;
}) {
  try {
    const taxId = formData.taxId.trim();

    if (!taxId) {
      return { error: 'La identificación fiscal es obligatoria' };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizeEmail(formData.email) },
    });

    if (existingUser) {
      return { error: 'El correo electrónico ya está registrado' };
    }

    // Hash password
    const hashedPassword = await hash(formData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizeEmail(formData.email),
        password: hashedPassword,
        name: formData.name.trim(),
      },
    });

    try {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "taxId" = ${taxId}
        WHERE id = ${user.id}
      `;

      const invoiceEmail = buildInvoiceEmailForTaxId(taxId);
      await prisma.$executeRaw`
        UPDATE "User"
        SET "invoiceEmail" = ${invoiceEmail}
        WHERE id = ${user.id}
      `;
    } catch (invoiceEmailUpdateError) {
      console.warn('Could not persist invoiceEmail during registration:', invoiceEmailUpdateError);
    }

    return { success: true, userId: user.id };
    
  } catch (error) {
    const prismaErrorCode =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : null;

    if (prismaErrorCode === 'P2022') {
      console.warn('invoiceEmail column is not available yet. User created without persisting invoiceEmail.');
      return { success: true };
    }

    console.error('Registration error:', error);
    return { error: 'Error al crear la cuenta. Por favor, intente de nuevo.' };
  }
}
