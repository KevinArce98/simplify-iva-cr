import {
  getInvoicesByPeriod,
  getTaxSummary,
  getAllInvoices,
  getAvailablePeriods,
} from '../actions';
import { formatCRC, getMonthName, formatDueDate } from '@/lib/utils';
import PeriodSelector from './period-selector';
import { Suspense } from 'react';
import { Sidebar } from '../components/sidebar';
import { InvoicesTable } from './invoices-table';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; año?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const parsedMes = params.mes ? Number.parseInt(params.mes, 10) : NaN;
  const parsedAño = params.año ? Number.parseInt(params.año, 10) : NaN;
  const mes =
    Number.isInteger(parsedMes) && parsedMes >= 1 && parsedMes <= 12
      ? parsedMes
      : now.getMonth() + 1;
  const año =
    Number.isInteger(parsedAño) && parsedAño >= 2000 && parsedAño <= 2100
      ? parsedAño
      : now.getFullYear();

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
    <>
      {/* Sidebar */}
      <Sidebar />

      <div className="relative flex h-screen w-full flex-row overflow-hidden md:pl-64">
        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8f9fc]">
          <div className="flex flex-col w-full max-w-300 mx-auto px-4 md:px-8 py-20 md:py-8 gap-8">
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
                      <strong>{formatDueDate(summary.mes, summary.año)}</strong>.
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
            <InvoicesTable
              invoices={invoices}
              summary={{
                subtotalVentasGravadas: summary.subtotalVentasGravadas,
                subtotalComprasGravadas: summary.subtotalComprasGravadas,
                subtotalVentasExentas: summary.subtotalVentasExentas,
                subtotalComprasExentas: summary.subtotalComprasExentas,
                ivaDebito: summary.ivaDebito,
                ivaCredito: summary.ivaCredito,
              }}
              allInvoices={allInvoices}
              availablePeriods={availablePeriods}
              currentMes={mes}
              currentAño={año}
            />
          </div>
        </div>
      </div>
    </>
  );
}
