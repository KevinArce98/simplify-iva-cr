/**
 * In-memory invoice store
 * In production, this would be replaced with a database
 */

import type { Invoice, TaxSummary, InvoiceType } from './types';
import { getIVADueDate, isNearDueDate, isPastDueDate, getDaysUntilDue } from './utils';

class InvoiceStore {
  private invoices: Invoice[] = [];

  addInvoice(invoice: Invoice): void {
    this.invoices.push(invoice);
  }

  getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  getInvoicesByType(tipo: InvoiceType): Invoice[] {
    return this.invoices.filter((inv) => inv.tipo === tipo);
  }

  getInvoicesByPeriod(mes: number, año: number): Invoice[] {
    return this.invoices.filter((inv) => {
      const fecha = new Date(inv.fecha);
      return fecha.getMonth() + 1 === mes && fecha.getFullYear() === año;
    });
  }

  getTaxSummary(mes: number, año: number): TaxSummary {
    const invoices = this.getInvoicesByPeriod(mes, año);

    const ivaDebito = invoices
      .filter((inv) => inv.tipo === 'EMITIDA')
      .reduce((sum, inv) => sum + inv.ivaCRC, 0);

    const ivaCredito = invoices
      .filter((inv) => inv.tipo === 'GASTO')
      .reduce((sum, inv) => sum + inv.ivaCRC, 0);

    const ivaAPagar = ivaDebito - ivaCredito;

    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const periodo = `${meses[mes - 1]} ${año}`;

    // Calculate due date information
    const fechaVencimiento = getIVADueDate(mes, año);
    const diasHastaVencimiento = getDaysUntilDue(mes, año);
    const estaProximoVencimiento = isNearDueDate(mes, año);
    const estaVencido = isPastDueDate(mes, año);

    // Calculate subtotals for Hacienda
    const subtotalVentasGravadas = this.invoices
      .filter((inv) => inv.tipo === 'EMITIDA')
      .reduce((sum, inv) => sum + (inv.subtotalGravadoCRC || 0), 0);
    
    const subtotalVentasExentas = this.invoices
      .filter((inv) => inv.tipo === 'EMITIDA')
      .reduce((sum, inv) => sum + (inv.subtotalExentoCRC || 0), 0);
    
    const subtotalComprasGravadas = this.invoices
      .filter((inv) => inv.tipo === 'GASTO')
      .reduce((sum, inv) => sum + (inv.subtotalGravadoCRC || 0), 0);
    
    const subtotalComprasExentas = this.invoices
      .filter((inv) => inv.tipo === 'GASTO')
      .reduce((sum, inv) => sum + (inv.subtotalExentoCRC || 0), 0);

    return {
      ivaDebito,
      ivaCredito,
      ivaAPagar,
      periodo,
      mes,
      año,
      fechaVencimiento,
      diasHastaVencimiento,
      estaProximoVencimiento,
      estaVencido,
      subtotalVentasGravadas,
      subtotalVentasExentas,
      subtotalComprasGravadas,
      subtotalComprasExentas,
      ivaPagar: Math.max(0, ivaDebito - ivaCredito),
      creditoFiscal: Math.max(0, ivaCredito - ivaDebito),
    };
  }

  clearInvoices(): void {
    this.invoices = [];
  }

  removeInvoice(id: string): void {
    this.invoices = this.invoices.filter((inv) => inv.id !== id);
  }
}

// Singleton instance
export const invoiceStore = new InvoiceStore();
