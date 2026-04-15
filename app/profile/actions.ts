'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/auth';
import { buildInvoiceEmailForTaxId } from '@/lib/invoice-email';

export async function updateTaxId(formData: FormData) {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const taxId = String(formData.get('taxId') || '').trim();

  if (!taxId) {
    redirect('/profile?status=empty');
  }

  try {
    const invoiceEmail = buildInvoiceEmailForTaxId(taxId);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { taxId, invoiceEmail },
    });
  } catch (error) {
    const errorCode =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : '';

    if (errorCode === 'P2002' || errorCode === '23505') {
      redirect('/profile?status=duplicate');
    }

    console.error('Error actualizando taxId:', error);
    redirect('/profile?status=error');
  }

  redirect('/profile?status=updated');
}
