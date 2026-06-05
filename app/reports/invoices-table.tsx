'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatCRC, formatDate, getMonthName } from '@/lib/utils';
import type { Invoice } from '@/lib/types';

interface InvoicesTableProps {
  invoices: Invoice[];
  summary: {
    subtotalVentasGravadas: number;
    subtotalComprasGravadas: number;
    subtotalVentasExentas: number;
    subtotalComprasExentas: number;
    subtotalVentasExoneradas: number;
    subtotalComprasExoneradas: number;
    subtotalVentasNoSujetas: number;
    subtotalComprasNoSujetas: number;
    ivaDebito: number;
    ivaCredito: number;
  };
  hasAnyInvoices: boolean;
  availablePeriods: Array<{ mes: number; año: number; count: number }>;
  currentMes: number;
  currentAño: number;
}

export function InvoicesTable({
  invoices,
  summary,
  hasAnyInvoices,
  availablePeriods,
  currentMes,
  currentAño,
}: InvoicesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar facturas basado en el término de búsqueda
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return invoices;

    const term = searchTerm.toLowerCase();
    return invoices.filter((invoice) => {
      const searchableText = [
        invoice.proveedor || '',
        invoice.cliente || '',
        invoice.numeroFactura || '',
        formatDate(invoice.fecha),
        invoice.tipo === 'EMITIDA' ? 'venta' : 'compra',
        formatCRC(invoice.subtotalGravadoCRC),
        formatCRC(invoice.ivaCRC),
      ].join(' ').toLowerCase();

      return searchableText.includes(term);
    });
  }, [invoices, searchTerm]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex md:flex-row flex-col gap-3 items-center justify-between px-1">
        <h2 className="text-xl font-bold leading-tight tracking-tight flex items-center gap-2 text-gray-900">
          <span className="material-symbols-outlined text-(--primary)">
            table_chart
          </span>
          Resumen de Transacciones
        </h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              search
            </span>
            <input
              className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-(--primary) focus:border-transparent outline-none w-full md:w-64"
              placeholder="Buscar por proveedor, cliente, factura..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {searchTerm && (
        <div className="flex items-center gap-2 px-1 text-sm text-[#4d6599]">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>
            {filteredInvoices.length === 0
              ? 'No se encontraron resultados'
              : `Mostrando ${filteredInvoices.length} de ${invoices.length} transacciones`}
          </span>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-gray-400"
              style={{ fontSize: 32 }}
            >
              inbox
            </span>
          </div>
          <div className="text-center max-w-2xl">
            <p className="text-[#0e121b] font-semibold mb-1 text-lg">
              No hay transacciones para {getMonthName(currentMes)} {currentAño}
            </p>
            <p className="text-[#4d6599] text-sm mb-4">
              {hasAnyInvoices
                ? 'Tienes facturas cargadas en otros períodos'
                : 'Sube archivos XML para ver el desglose de transacciones'}
            </p>

            {availablePeriods.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-3">
                  📅 Períodos con facturas disponibles:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {availablePeriods.map((period) => (
                    <Link
                      key={`${period.año}-${period.mes}`}
                      href={`/reports?mes=${period.mes}&año=${period.año}`}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-(--primary)/30 rounded-lg hover:bg-(--primary)/10 transition-colors text-sm font-medium text-(--primary-dark)"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        calendar_month
                      </span>
                      <span>
                        {getMonthName(period.mes)} {period.año}
                      </span>
                      <span className="text-xs bg-(--primary)/10 text-(--primary) px-2 py-0.5 rounded-full font-semibold">
                        {period.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-(--primary) text-white rounded-lg hover:bg-(--primary-dark) transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Subir Más Archivos
            </Link>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-gray-400"
              style={{ fontSize: 32 }}
            >
              search_off
            </span>
          </div>
          <div className="text-center">
            <p className="text-[#0e121b] font-semibold mb-1 text-lg">
              No se encontraron resultados
            </p>
            <p className="text-[#4d6599] text-sm">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-300 text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider w-28">
                    Fecha
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider">
                    Proveedor / Cliente
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider w-24 text-center">
                    Tipo
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider text-right w-32 bg-blue-50/50">
                    Base Gravada
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider text-right w-32 bg-amber-50/50">
                    Exento/Exon.
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider text-center w-16">
                    Tarifa
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#4d6599] uppercase tracking-wider text-right w-32 bg-gray-50">
                    IVA (CRC)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#4d6599]">
                      {formatDate(invoice.fecha)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {invoice.tipo === 'GASTO'
                        ? invoice.proveedor || 'N/A'
                        : invoice.cliente || 'N/A'}
                      {invoice.numeroFactura && (
                        <div className="text-xs text-[#4d6599] font-normal mt-0.5">
                          #{invoice.numeroFactura.slice(-8)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          invoice.tipo === 'GASTO'
                            ? 'bg-(--primary)/10 text-(--primary) ring-(--primary)/20'
                            : 'bg-green-50 text-green-700 ring-green-600/20'
                        }`}
                      >
                        {invoice.tipo === 'GASTO' ? 'Compra' : 'Venta'}
                      </span>
                      {invoice.documentType === 'NotaCreditoElectronica' && (
                        <span className="mt-1 block text-[10px] font-semibold text-red-600">
                          Nota Crédito
                        </span>
                      )}
                      {invoice.documentType === 'NotaDebitoElectronica' && (
                        <span className="mt-1 block text-[10px] font-semibold text-amber-600">
                          Nota Débito
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 bg-blue-50/30">
                      {formatCRC(invoice.signo * invoice.subtotalGravadoCRC)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono text-gray-600 bg-amber-50/30">
                      {(() => {
                        const noGravado =
                          invoice.subtotalExentoCRC +
                          invoice.subtotalExoneradoCRC +
                          invoice.subtotalNoSujetoCRC;
                        return noGravado !== 0
                          ? formatCRC(invoice.signo * noGravado)
                          : '-';
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-medium text-gray-600">
                      {invoice.ivaCRC > 0 ? `${invoice.tarifaIVA}%` : '0%'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 bg-gray-50/50">
                      {formatCRC(invoice.signo * invoice.ivaCRC)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr className="font-bold">
                  <td
                    colSpan={3}
                    className="px-4 py-3 text-sm text-gray-700 uppercase"
                  >
                    Totales del Período
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 bg-blue-100/50">
                    {formatCRC(
                      summary.subtotalVentasGravadas +
                        summary.subtotalComprasGravadas
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-700 bg-amber-100/50">
                    {formatCRC(
                      summary.subtotalVentasExentas +
                        summary.subtotalComprasExentas +
                        summary.subtotalVentasExoneradas +
                        summary.subtotalComprasExoneradas +
                        summary.subtotalVentasNoSujetas +
                        summary.subtotalComprasNoSujetas
                    )}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 bg-gray-200/50">
                    {formatCRC(summary.ivaDebito + summary.ivaCredito)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {filteredInvoices.length > 0 && (
        <div className="px-1">
          <p className="text-sm text-[#4d6599]">
            Mostrando {filteredInvoices.length} de {invoices.length} resultados
          </p>
        </div>
      )}
    </div>
  );
}
