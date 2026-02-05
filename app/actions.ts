'use server';

import { parseInvoiceXML } from '@/lib/xml-parser';
import { getExchangeRate } from '@/lib/exchange-rate';
import type { Currency, InvoiceType, UploadedFile } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import type { Invoice } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getIVADueDate, getMonthName } from '@/lib/utils';

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

    // Get exchange rate if USD
    let tipoCambio = 1.0;
    if (parsed.moneda === 'USD') {
      tipoCambio = await getExchangeRate(parsed.fecha);
    }

    // Calculate IVA in CRC
    const ivaCRC = parsed.totalImpuesto * tipoCambio;
    const totalCRC = parsed.totalComprobante * tipoCambio;
    const subtotalGravadoCRC = parsed.subtotalGravado * tipoCambio;
    const subtotalExentoCRC = parsed.subtotalExento * tipoCambio;

    // Save to database
    const invoice = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        fileName,
        tipo,
        numeroConsecutivo: parsed.numeroConsecutivo,
        clave: parsed.clave,
        fechaEmision: new Date(parsed.fecha),
        emisorNombre: parsed.emisor?.nombre,
        receptorNombre: parsed.receptor?.nombre,
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
    uploadedFile.invoice = {
      id: invoice.id,
      tipo: invoice.tipo as InvoiceType,
      fecha: invoice.fechaEmision?.toISOString() || new Date().toISOString(),
      proveedor: tipo === 'GASTO' ? invoice.emisorNombre || undefined : undefined,
      cliente: tipo === 'EMITIDA' ? invoice.receptorNombre || undefined : undefined,
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
    (sum: number, inv: Invoice) => sum + (inv.subtotalGravado || 0) * (inv.tipoCambio || 1),
    0
  );

  const subtotalVentasExentas = ventas.reduce(
    (sum: number, inv: Invoice) => sum + (inv.subtotalExento || 0) * (inv.tipoCambio || 1),
    0
  );

  const subtotalComprasGravadas = compras.reduce(
    (sum: number, inv: Invoice) => sum + (inv.subtotalGravado || 0) * (inv.tipoCambio || 1),
    0
  );

  const subtotalComprasExentas = compras.reduce(
    (sum: number, inv: Invoice) => sum + (inv.subtotalExento || 0) * (inv.tipoCambio || 1),
    0
  );

  const ivaPagar = Math.max(0, ivaVentas - ivaCompras);
  const creditoFiscal = Math.max(0, ivaCompras - ivaVentas);

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
