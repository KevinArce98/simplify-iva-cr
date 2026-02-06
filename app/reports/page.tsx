import Link from 'next/link';
import {
  getInvoicesByPeriod,
  getTaxSummary,
  getAllInvoices,
  getAvailablePeriods,
} from '../actions';
import {
  formatCRC,
  formatUSD,
  formatDate,
  formatExchangeRate,
  getMonthName,
  formatDueDate,
} from '@/lib/utils';
import PeriodSelector from './period-selector';
import { Suspense } from 'react';
import { Sidebar } from '../components/sidebar';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; año?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const mes = params.mes ? parseInt(params.mes) : now.getMonth() + 1;
  const año = params.año ? parseInt(params.año) : now.getFullYear();

  const summary = await getTaxSummary(mes, año);
  const invoices = await getInvoicesByPeriod(mes, año);
  const allInvoices = await getAllInvoices();
  const availablePeriods = await getAvailablePeriods();

  const ivaDebitoPercentage =
    summary.ivaDebito > 0
      ? Math.min(
          (summary.ivaDebito / (summary.ivaDebito + summary.ivaCredito)) * 100,
          100
        )
      : 0;
  const ivaCreditoPercentage =
    summary.ivaCredito > 0
      ? Math.min(
          (summary.ivaCredito / (summary.ivaDebito + summary.ivaCredito)) * 100,
          100
        )
      : 0;

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8f9fc]">
        <div className="flex flex-col max-w-300 w-full mx-auto p-4 md:p-8 gap-8 pt-4 md:pt-8">
          {/* Due Date Alert */}
          {summary.estaProximoVencimiento && !summary.estaVencido && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 text-[24px]">
                  schedule
                </span>
                <div className="flex-1">
                  <h3 className="text-amber-900 font-semibold text-sm mb-1">
                    Declaración Próxima a Vencer
                  </h3>
                  <p className="text-amber-800 text-sm">
                    La declaración de IVA para el periodo de{' '}
                    <strong>{summary.periodo}</strong> vence el{' '}
                    <strong>{formatDueDate(summary.mes, summary.año)}</strong>.
                    {summary.diasHastaVencimiento > 0 && (
                      <span className="ml-1">
                        Quedan <strong>{summary.diasHastaVencimiento}</strong>{' '}
                        {summary.diasHastaVencimiento === 1 ? 'día' : 'días'} para
                        presentarla.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {summary.estaVencido && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600 text-[24px]">
                  error
                </span>
                <div className="flex-1">
                  <h3 className="text-red-900 font-semibold text-sm mb-1">
                    Declaración Vencida
                  </h3>
                  <p className="text-red-800 text-sm">
                    La declaración de IVA para el periodo de{' '}
                    <strong>{summary.periodo}</strong> venció el{' '}
                    <strong>{formatDueDate(summary.mes, summary.año)}</strong>. Por favor,
                    presente su declaración lo antes posible para evitar sanciones.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Page Heading */}
          <div className="flex flex-wrap justify-between items-end gap-4 border-b border-gray-200 pb-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-[#0e121b] tracking-tight text-2xl md:text-[32px] font-bold leading-tight">
                Declaraciones de IVA
              </h2>
              <p className="text-gray-600 text-base font-normal max-w-2xl mb-4">
                Revise su balance de IVA y los detalles de las transacciones para el
                período seleccionado. Los montos están expresados en Colones (CRC).
              </p>
              <div className="flex items-center gap-2 text-sm text-[#4d6599]">
                <span className="material-symbols-outlined text-[18px]">
                  calendar_month
                </span>
                <span>Periodo: {summary.periodo}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#4d6599]">
                <span className="material-symbols-outlined text-[18px]">event</span>
                <span>Vencimiento: {formatDueDate(summary.mes, summary.año)}</span>
                {!summary.estaVencido && summary.diasHastaVencimiento >= 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      summary.estaProximoVencimiento
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {summary.diasHastaVencimiento === 0
                      ? 'Vence hoy'
                      : `${summary.diasHastaVencimiento} ${summary.diasHastaVencimiento === 1 ? 'día' : 'días'}`}
                  </span>
                )}
                {summary.estaVencido && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Vencido
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Suspense fallback={<div className="h-10" />}>
                <PeriodSelector />
              </Suspense>
              <div className="flex gap-3">
                <button
                  className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  <span>Imprimir</span>
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-(--primary) hover:bg-(--primary-dark) text-white text-sm font-bold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Exportar Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards - Top Row: Subtotales para Hacienda */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ventas Gravadas (Base) */}
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-white shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="flex items-center gap-2 text-[#4d6599]">
                <span className="material-symbols-outlined text-(--primary) text-lg">
                  storefront
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Base Ventas Gravadas
                </p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {formatCRC(summary.subtotalVentasGravadas)}
              </p>
              <p className="text-xs text-[#4d6599]">Subtotal sujeto a IVA</p>
            </div>

            {/* Ventas Exentas */}
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-white shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="flex items-center gap-2 text-[#4d6599]">
                <span className="material-symbols-outlined text-amber-500 text-lg">
                  remove_shopping_cart
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Ventas Exentas
                </p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {formatCRC(summary.subtotalVentasExentas)}
              </p>
              <p className="text-xs text-[#4d6599]">Sin IVA (tarifa 0%)</p>
            </div>

            {/* Compras Gravadas (Base) */}
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-white shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="flex items-center gap-2 text-[#4d6599]">
                <span className="material-symbols-outlined text-emerald-500 text-lg">
                  shopping_cart
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Base Compras Gravadas
                </p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {formatCRC(summary.subtotalComprasGravadas)}
              </p>
              <p className="text-xs text-[#4d6599]">Subtotal sujeto a IVA</p>
            </div>

            {/* Compras Exentas */}
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-white shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="flex items-center gap-2 text-[#4d6599]">
                <span className="material-symbols-outlined text-purple-500 text-lg">
                  production_quantity_limits
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Compras Exentas
                </p>
              </div>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {formatCRC(summary.subtotalComprasExentas)}
              </p>
              <p className="text-xs text-[#4d6599]">Sin IVA (tarifa 0%)</p>
            </div>
          </div>

          {/* Stats Cards - Bottom Row: IVA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Débito */}
            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-(--primary)">
                  trending_up
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#4d6599]">
                <span className="material-symbols-outlined text-(--primary)">
                  arrow_circle_up
                </span>
                <p className="text-sm font-semibold uppercase tracking-wider">
                  IVA Débito (Cobrado)
                </p>
              </div>
              <p className="text-3xl font-bold tracking-tight text-gray-900">
                {formatCRC(summary.ivaDebito)}
              </p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                <div
                  className="bg-(--primary) h-1.5 rounded-full"
                  style={{ width: `${ivaDebitoPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Crédito */}
            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-emerald-500">
                  trending_down
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#4d6599]">
                <span className="material-symbols-outlined text-emerald-500">
                  arrow_circle_down
                </span>
                <p className="text-sm font-semibold uppercase tracking-wider">
                  IVA Crédito (Pagado)
                </p>
              </div>
              <p className="text-3xl font-bold tracking-tight text-gray-900">
                {formatCRC(summary.ivaCredito)}
              </p>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${ivaCreditoPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Total */}
            <div className="flex flex-col gap-3 rounded-xl p-6 bg-linear-to-br from-(--primary)/10 to-white shadow-md border border-(--primary)/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl text-(--primary)">
                  account_balance_wallet
                </span>
              </div>
              <div className="flex items-center gap-2 text-(--primary)">
                <span className="material-symbols-outlined">
                  {summary.ivaPagarConSaldo > 0 ? 'payments' : 'savings'}
                </span>
                <p className="text-sm font-bold uppercase tracking-wider">
                  {summary.ivaPagarConSaldo > 0 ? 'IVA a Pagar' : 'Saldo a Favor'}
                </p>
              </div>
              <p className="text-4xl font-black tracking-tight text-gray-900">
                {formatCRC(
                  summary.ivaPagarConSaldo > 0
                    ? summary.ivaPagarConSaldo
                    : summary.nuevoSaldoAFavor
                )}
              </p>
              {summary.saldoAFavorAnterior > 0 && (
                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Saldo aplicado:{' '}
                  {formatCRC(Math.min(summary.saldoAFavorAnterior, summary.ivaPagar))}
                </p>
              )}
              <p className="text-xs text-[#4d6599] mt-1 font-medium">
                {summary.ivaPagarConSaldo > 0
                  ? `Vence el 15 de ${getMonthName((mes % 12) + 1)}`
                  : 'Se acumulará para futuras declaraciones'}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold leading-tight tracking-tight flex items-center gap-2 text-gray-900">
                <span className="material-symbols-outlined text-(--primary)">
                  table_chart
                </span>
                Resumen de Transacciones
              </h2>
              <div className="flex gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    search
                  </span>
                  <input
                    className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-(--primary) focus:border-transparent outline-none w-64"
                    placeholder="Buscar..."
                    type="text"
                  />
                </div>
                <button className="h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[#4d6599] transition-colors">
                  <span className="material-symbols-outlined text-lg leading-none">
                    filter_list
                  </span>
                </button>
              </div>
            </div>

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
                    No hay transacciones para {getMonthName(mes)} {año}
                  </p>
                  <p className="text-[#4d6599] text-sm mb-4">
                    {allInvoices.length > 0
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
                          Exento
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
                      {invoices.map((invoice) => (
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
                                invoice.tipo === 'EMITIDA'
                                  ? 'bg-(--primary)/10 text-(--primary) ring-(--primary)/20'
                                  : 'bg-green-50 text-green-700 ring-green-600/20'
                              }`}
                            >
                              {invoice.tipo === 'EMITIDA' ? 'Venta' : 'Compra'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 bg-blue-50/30">
                            {formatCRC(invoice.subtotalGravadoCRC)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-gray-600 bg-amber-50/30">
                            {invoice.subtotalExentoCRC > 0
                              ? formatCRC(invoice.subtotalExentoCRC)
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-medium text-gray-600">
                            {invoice.ivaCRC > 0 ? `${invoice.tarifaIVA}%` : '0%'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 bg-gray-50/50">
                            {formatCRC(invoice.ivaCRC)}
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
                            summary.subtotalVentasExentas + summary.subtotalComprasExentas
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

            {invoices.length > 0 && (
              <div className="flex justify-between items-center px-1">
                <p className="text-sm text-[#4d6599]">
                  Mostrando 1 a {invoices.length} de {invoices.length} resultados
                </p>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-white border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50">
                    Anterior
                  </button>
                  <button className="px-3 py-1 rounded bg-(--primary) text-white text-sm font-medium">
                    1
                  </button>
                  <button className="px-3 py-1 rounded bg-white border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50">
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
