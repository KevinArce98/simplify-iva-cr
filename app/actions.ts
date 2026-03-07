'use server';

import { parseInvoiceXML } from '@/lib/xml-parser';
import type { Currency, InvoiceType, UploadedFile } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import type { Invoice } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getIVADueDate, getMonthName } from '@/lib/utils';

function normalizeTaxId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function inferInvoiceTypeFromTaxId(
  taxId: string | null | undefined,
  emisorId: string | undefined,
  receptorId: string | undefined
): InvoiceType | null {
  const normalizedUserTaxId = normalizeTaxId(taxId);
  const normalizedIssuerTaxId = normalizeTaxId(emisorId);
  const normalizedReceiverTaxId = normalizeTaxId(receptorId);

  if (!normalizedUserTaxId) {
    return null;
  }

  if (normalizedReceiverTaxId && normalizedReceiverTaxId === normalizedUserTaxId) {
    return 'GASTO';
  }

  if (normalizedIssuerTaxId && normalizedIssuerTaxId === normalizedUserTaxId) {
    return 'EMITIDA';
  }

  return null;
}

async function getUserTaxId(userId: string): Promise<string | null> {
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

export type ProcessFileResult = {
  success: boolean;
  file: UploadedFile;
};

/**
 * Processes an uploaded XML file and stores the invoice in the database
 */
export async function processXMLFile(
  fileName: string,
  fileContent: string,
  tipo: InvoiceType
): Promise<ProcessFileResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Usuario no autenticado');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!currentUser) {
    throw new Error('Tu sesión ya no es válida para esta base de datos. Cierra sesión e inicia sesión nuevamente.');
  }

  const fileId = crypto.randomUUID();

  const uploadedFile: UploadedFile = {
    id: fileId,
    name: fileName,
    size: fileContent.length,
    tipo,
    status: 'PROCESSING',
  };

  try {
    // Parse XML
    const parsed = await parseInvoiceXML(fileContent);

    // Check if invoice already exists for this user
    if (parsed.clave) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          userId: currentUser.id,
          clave: parsed.clave,
        },
        select: { id: true },
      });

      if (existingInvoice) {
        throw new Error(
          `La factura con clave ${parsed.clave} ya fue cargada anteriormente en tu cuenta`
        );
      }
    }

    const userTaxId = await getUserTaxId(currentUser.id);
    const normalizedUserTaxId = normalizeTaxId(userTaxId);

    if (!normalizedUserTaxId) {
      throw new Error(
        'No tienes tu Tax ID configurado en el perfil. Agrégalo para validar que el XML te pertenece.'
      );
    }

    const inferredTipo = inferInvoiceTypeFromTaxId(
      normalizedUserTaxId,
      parsed.emisor?.identificacion,
      parsed.receptor?.identificacion
    );

    if (!inferredTipo) {
      throw new Error(
        `El XML no coincide con tu Tax ID (${normalizedUserTaxId}). Verifica emisor/receptor antes de cargarlo.`
      );
    }

    const resolvedTipo = inferredTipo;

    // Use exchange rate from XML (already included in the parsed data)
    const tipoCambio = parsed.tipoCambio;

    // Calculate IVA in CRC
    const ivaCRC = parsed.totalImpuesto * tipoCambio;
    const totalCRC = parsed.totalComprobante * tipoCambio;
    const subtotalGravadoCRC = parsed.subtotalGravado * tipoCambio;
    const subtotalExentoCRC = parsed.subtotalExento * tipoCambio;

    // Save to database
    const invoice = await prisma.invoice.create({
      data: {
        userId: currentUser.id,
        fileName,
        tipo: resolvedTipo,
        numeroConsecutivo: parsed.numeroConsecutivo,
        clave: parsed.clave,
        fechaEmision: new Date(parsed.fecha),
        emisorNombre: parsed.emisor?.nombre,
        emisorIdentificacion: parsed.emisor?.identificacion,
        receptorNombre: parsed.receptor?.nombre,
        receptorIdentificacion: parsed.receptor?.identificacion,
        totalImpuesto: parsed.totalImpuesto,
        totalComprobante: parsed.totalComprobante,
        subtotalGravado: parsed.subtotalGravado,
        subtotalExento: parsed.subtotalExento,
        tarifaIVA: parsed.tarifaIVA,
        tipoMoneda: parsed.moneda,
        tipoCambio,
      },
    });

    uploadedFile.status = 'SUCCESS';
    uploadedFile.tipo = resolvedTipo;
    uploadedFile.invoice = {
      id: invoice.id,
      tipo: invoice.tipo as InvoiceType,
      fecha: invoice.fechaEmision?.toISOString() || new Date().toISOString(),
      proveedor: resolvedTipo === 'GASTO' ? invoice.emisorNombre || undefined : undefined,
      cliente: resolvedTipo === 'EMITIDA' ? invoice.receptorNombre || undefined : undefined,
      numeroFactura: invoice.numeroConsecutivo || undefined,
      moneda: (invoice.tipoMoneda as Currency) || 'CRC',
      ivaOriginal: invoice.totalImpuesto || 0,
      totalOriginal: invoice.totalComprobante || 0,
      tipoCambio: invoice.tipoCambio || 1,
      ivaCRC,
      totalCRC,
      subtotalGravado: parsed.subtotalGravado,
      subtotalExento: parsed.subtotalExento,
      subtotalGravadoCRC,
      subtotalExentoCRC,
      tarifaIVA: parsed.tarifaIVA,
    };

    return {
      success: true,
      file: uploadedFile,
    };
  } catch (error) {
    uploadedFile.status = 'ERROR';
    uploadedFile.error = error instanceof Error ? error.message : 'Error desconocido';

    return {
      success: false,
      file: uploadedFile,
    };
  }
}

/**
 * Gets all invoices for a specific period
 */
export async function getInvoicesByPeriod(mes: number, año: number) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return [];
  }

  const startDate = new Date(año, mes - 1, 1);
  const endDate = new Date(año, mes, 0, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      fechaEmision: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      fechaEmision: 'desc',
    },
  });

  return invoices.map((invoice: Invoice) => ({
    id: invoice.id,
    tipo: invoice.tipo as InvoiceType,
    fecha: invoice.fechaEmision || new Date(),
    proveedor: invoice.tipo === 'GASTO' ? invoice.emisorNombre || undefined : undefined,
    cliente: invoice.tipo === 'EMITIDA' ? invoice.receptorNombre || undefined : undefined,
    numeroFactura: invoice.numeroConsecutivo || undefined,
    moneda: invoice.tipoMoneda || 'CRC',
    ivaOriginal: invoice.totalImpuesto || 0,
    totalOriginal: invoice.totalComprobante || 0,
    tipoCambio: invoice.tipoCambio || 1,
    ivaCRC: (invoice.totalImpuesto || 0) * (invoice.tipoCambio || 1),
    totalCRC: (invoice.totalComprobante || 0) * (invoice.tipoCambio || 1),
    subtotalGravado: invoice.subtotalGravado || 0,
    subtotalExento: invoice.subtotalExento || 0,
    subtotalGravadoCRC: (invoice.subtotalGravado || 0) * (invoice.tipoCambio || 1),
    subtotalExentoCRC: (invoice.subtotalExento || 0) * (invoice.tipoCambio || 1),
    tarifaIVA: invoice.tarifaIVA || 13,
  }));
}

/**
 * Gets tax summary for a specific period
 * Includes subtotals for Hacienda declaration
 */
export async function getTaxSummary(mes: number, año: number) {
  const session = await getServerSession(authOptions);

  // Calculate dates and due date info
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diasHastaVencimiento = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const estaProximoVencimiento = diasHastaVencimiento >= 0 && diasHastaVencimiento <= 7;
  const estaVencido = today > dueDate;

  const defaultSummary = {
    ivaDebito: 0,
    ivaCredito: 0,
    ivaAPagar: 0,
    periodo: `${getMonthName(mes)} ${año}`,
    mes,
    año,
    fechaVencimiento: dueDate,
    diasHastaVencimiento: Math.max(0, diasHastaVencimiento),
    estaProximoVencimiento,
    estaVencido,
    subtotalVentasGravadas: 0,
    subtotalVentasExentas: 0,
    subtotalComprasGravadas: 0,
    subtotalComprasExentas: 0,
    ivaPagar: 0,
    creditoFiscal: 0,
    saldoAFavorAnterior: 0,
    ivaPagarConSaldo: 0,
    nuevoSaldoAFavor: 0,
  };

  if (!session?.user?.id) {
    return defaultSummary;
  }

  const startDate = new Date(año, mes - 1, 1);
  const endDate = new Date(año, mes, 0, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      fechaEmision: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const compras = invoices.filter((inv: Invoice) => inv.tipo === 'GASTO');
  const ventas = invoices.filter((inv: Invoice) => inv.tipo === 'EMITIDA');

  // IVA calculations
  const ivaCompras = compras.reduce(
    (sum: number, inv: Invoice) => sum + (inv.totalImpuesto || 0) * (inv.tipoCambio || 1),
    0
  );

  const ivaVentas = ventas.reduce(
    (sum: number, inv: Invoice) => sum + (inv.totalImpuesto || 0) * (inv.tipoCambio || 1),
    0
  );

  // Subtotals for Hacienda - Base imponible (monto antes de IVA)
  const subtotalVentasGravadas = ventas.reduce(
    (sum: number, inv: Invoice) =>
      sum + (inv.subtotalGravado || 0) * (inv.tipoCambio || 1),
    0
  );

  const subtotalVentasExentas = ventas.reduce(
    (sum: number, inv: Invoice) =>
      sum + (inv.subtotalExento || 0) * (inv.tipoCambio || 1),
    0
  );

  const subtotalComprasGravadas = compras.reduce(
    (sum: number, inv: Invoice) =>
      sum + (inv.subtotalGravado || 0) * (inv.tipoCambio || 1),
    0
  );

  const subtotalComprasExentas = compras.reduce(
    (sum: number, inv: Invoice) =>
      sum + (inv.subtotalExento || 0) * (inv.tipoCambio || 1),
    0
  );

  const ivaPagar = Math.max(0, ivaVentas - ivaCompras);
  const creditoFiscal = Math.max(0, ivaCompras - ivaVentas);

  // Obtener saldo a favor del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { saldoAFavor: true },
  });

  const saldoAFavorAnterior = user?.saldoAFavor || 0;

  // Calcular IVA a pagar después de aplicar saldo a favor
  let ivaPagarConSaldo = ivaPagar;
  let nuevoSaldoAFavor = saldoAFavorAnterior;

  if (ivaPagar > 0) {
    // Si hay IVA a pagar, aplicamos el saldo a favor
    if (saldoAFavorAnterior >= ivaPagar) {
      // El saldo cubre todo el IVA
      nuevoSaldoAFavor = saldoAFavorAnterior - ivaPagar;
      ivaPagarConSaldo = 0;
    } else {
      // El saldo cubre parcialmente
      ivaPagarConSaldo = ivaPagar - saldoAFavorAnterior;
      nuevoSaldoAFavor = 0;
    }
  } else if (creditoFiscal > 0) {
    // Si hay crédito fiscal, se suma al saldo a favor
    nuevoSaldoAFavor = saldoAFavorAnterior + creditoFiscal;
  }

  return {
    ivaDebito: ivaVentas,
    ivaCredito: ivaCompras,
    ivaAPagar: ivaPagar,
    periodo: `${getMonthName(mes)} ${año}`,
    mes,
    año,
    fechaVencimiento: dueDate,
    diasHastaVencimiento: Math.max(0, diasHastaVencimiento),
    estaProximoVencimiento,
    estaVencido,
    subtotalVentasGravadas,
    subtotalVentasExentas,
    subtotalComprasGravadas,
    subtotalComprasExentas,
    ivaPagar,
    creditoFiscal,
    saldoAFavorAnterior,
    ivaPagarConSaldo,
    nuevoSaldoAFavor,
  };
}

/**
 * Gets all invoices
 */
export async function getAllInvoices() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return [];
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      fechaEmision: 'desc',
    },
  });

  return invoices.map((invoice: Invoice) => ({
    id: invoice.id,
    tipo: invoice.tipo as InvoiceType,
    fecha: invoice.fechaEmision || new Date(),
    proveedor: invoice.tipo === 'GASTO' ? invoice.emisorNombre || undefined : undefined,
    cliente: invoice.tipo === 'EMITIDA' ? invoice.receptorNombre || undefined : undefined,
    numeroFactura: invoice.numeroConsecutivo || undefined,
    moneda: invoice.tipoMoneda || 'CRC',
    ivaOriginal: invoice.totalImpuesto || 0,
    totalOriginal: invoice.totalComprobante || 0,
    tipoCambio: invoice.tipoCambio || 1,
    ivaCRC: (invoice.totalImpuesto || 0) * (invoice.tipoCambio || 1),
    totalCRC: (invoice.totalComprobante || 0) * (invoice.tipoCambio || 1),
    subtotalGravado: invoice.subtotalGravado || 0,
    subtotalExento: invoice.subtotalExento || 0,
    subtotalGravadoCRC: (invoice.subtotalGravado || 0) * (invoice.tipoCambio || 1),
    subtotalExentoCRC: (invoice.subtotalExento || 0) * (invoice.tipoCambio || 1),
    tarifaIVA: invoice.tarifaIVA || 13,
  }));
}

/**
 * Gets recent invoices (last 5)
 */
export async function getRecentInvoices() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return [];
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      fechaEmision: 'desc',
    },
    take: 5,
  });

  return invoices.map((invoice: Invoice) => ({
    id: invoice.id,
    tipo: invoice.tipo as InvoiceType,
    fecha: invoice.fechaEmision || new Date(),
    proveedor: invoice.tipo === 'GASTO' ? invoice.emisorNombre || undefined : undefined,
    cliente: invoice.tipo === 'EMITIDA' ? invoice.receptorNombre || undefined : undefined,
    numeroFactura: invoice.numeroConsecutivo || undefined,
    moneda: invoice.tipoMoneda || 'CRC',
    ivaOriginal: invoice.totalImpuesto || 0,
    totalOriginal: invoice.totalComprobante || 0,
    tipoCambio: invoice.tipoCambio || 1,
    ivaCRC: (invoice.totalImpuesto || 0) * (invoice.tipoCambio || 1),
    totalCRC: (invoice.totalComprobante || 0) * (invoice.tipoCambio || 1),
    subtotalGravado: invoice.subtotalGravado || 0,
    subtotalExento: invoice.subtotalExento || 0,
    subtotalGravadoCRC: (invoice.subtotalGravado || 0) * (invoice.tipoCambio || 1),
    subtotalExentoCRC: (invoice.subtotalExento || 0) * (invoice.tipoCambio || 1),
    tarifaIVA: invoice.tarifaIVA || 13,
  }));
}

/**
 * Gets available periods (months) with invoices
 */
export async function getAvailablePeriods() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return [];
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      fechaEmision: { not: null },
    },
    select: {
      fechaEmision: true,
    },
  });

  const periods = new Map<string, { mes: number; año: number; count: number }>();

  invoices.forEach((invoice: { fechaEmision: Date | null }) => {
    if (!invoice.fechaEmision) return;

    const date = new Date(invoice.fechaEmision);
    const mes = date.getMonth() + 1;
    const año = date.getFullYear();
    const key = `${año}-${mes}`;

    if (periods.has(key)) {
      periods.get(key)!.count++;
    } else {
      periods.set(key, { mes, año, count: 1 });
    }
  });

  return Array.from(periods.values()).sort((a, b) => {
    if (a.año !== b.año) return b.año - a.año;
    return b.mes - a.mes;
  });
}

/**
 * Clears all invoices (for testing)
 */
export async function clearAllInvoices() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return;
  }

  await prisma.invoice.deleteMany({
    where: {
      userId: session.user.id,
    },
  });
}

/**
 * Updates the user's saldo a favor after declaring taxes
 */
export async function actualizarSaldoAFavor(mes: number, año: number) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Usuario no autenticado');
  }

  // Get current tax summary
  const summary = await getTaxSummary(mes, año);

  // Update user's saldo a favor
  await prisma.user.update({
    where: { id: session.user.id },
    data: { saldoAFavor: summary.nuevoSaldoAFavor },
  });

  return summary.nuevoSaldoAFavor;
}
