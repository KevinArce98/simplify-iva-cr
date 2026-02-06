import Link from 'next/link';
import { getTaxSummary, getRecentInvoices } from './actions';
import { formatCRC, getMonthName } from '@/lib/utils';
import { Sidebar } from './components/sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import HomePeriodSelector from './components/home-period-selector';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; año?: string }>;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Default to current month or use search params
  const params = await searchParams;
  const now = new Date();
  const currentMonth = params.mes ? parseInt(params.mes) : now.getMonth() + 1;
  const currentYear = params.año ? parseInt(params.año) : now.getFullYear();

  const summary = await getTaxSummary(currentMonth, currentYear);
  const recentInvoices = await getRecentInvoices();

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8f9fc]">
        <div className="flex flex-col max-w-300 w-full mx-auto p-4 md:p-8 gap-8 pt-4 md:pt-8">
          {/* Page Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[#0e121b] tracking-tight text-2xl md:text-[32px] font-bold leading-tight">
                Panel de Control
              </h2>
              <p className="text-[#4d6599] text-sm font-normal leading-normal">
                Resumen de obligaciones tributarias para profesionales independientes
              </p>
            </div>
            <HomePeriodSelector currentMonth={currentMonth} currentYear={currentYear} />
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Expenses */}
            <Link
              href="/upload?type=gasto"
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-[#e5e7eb] hover:border-(--primary)/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span
                  className="material-symbols-outlined text-(--primary)"
                  style={{ fontSize: 120 }}
                >
                  receipt_long
                </span>
              </div>
              <div className="flex flex-col gap-4 z-10">
                <div className="bg-(--primary) w-12 h-12 rounded-lg flex items-center justify-center text-white mb-2">
                  <span className="material-symbols-outlined">upload_file</span>
                </div>
                <div>
                  <h3 className="text-[#0e121b] text-lg font-bold leading-tight mb-1">
                    Subir Gastos (XML)
                  </h3>
                  <p className="text-[#4d6599] text-sm font-normal leading-normal">
                    Cargar facturas de proveedores para deducir impuestos (Crédito Fiscal).
                  </p>
                </div>
              </div>
              <div className="mt-6 z-10">
                <div className="flex items-center justify-center w-full bg-(--primary) hover:bg-(--primary-dark) text-white font-medium py-2.5 px-4 rounded-lg transition-colors gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    add
                  </span>
                  <span>Subir Archivo</span>
                </div>
              </div>
            </Link>

            {/* Upload Invoices */}
            <Link
              href="/upload?type=emitida"
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-[#e5e7eb] hover:border-(--primary)/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span
                  className="material-symbols-outlined text-green-600"
                  style={{ fontSize: 120 }}
                >
                  payments
                </span>
              </div>
              <div className="flex flex-col gap-4 z-10">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center text-green-600 mb-2">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div>
                  <h3 className="text-[#0e121b] text-lg font-bold leading-tight mb-1">
                    Subir Facturas Emitidas (XML)
                  </h3>
                  <p className="text-[#4d6599] text-sm font-normal leading-normal">
                    Registrar ingresos por servicios profesionales (Débito Fiscal).
                  </p>
                </div>
              </div>
              <div className="mt-6 z-10">
                <div className="flex items-center justify-center w-full bg-white border border-[#d0d7e7] hover:bg-[#f8f9fc] text-[#0e121b] font-medium py-2.5 px-4 rounded-lg transition-colors gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    upload
                  </span>
                  <span>Cargar Facturas</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Summary Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[#0e121b] text-xl font-bold leading-tight">
                Estado de Declaración
              </h3>
              <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                {summary.ivaPagarConSaldo > 0 ? 'Pendiente' : 'Saldo a Favor'}
              </span>
            </div>

            {/* Saldo a Favor Anterior si existe */}
            {summary.saldoAFavorAnterior > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 24 }}>
                  info
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    Saldo a Favor Disponible
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Tienes {formatCRC(summary.saldoAFavorAnterior)} de saldo a favor de períodos anteriores que se aplicará automáticamente.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Debit */}
              <div className="bg-white p-5 rounded-xl border border-[#d0d7e7] shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-[#4d6599] text-sm font-medium">
                    IVA Débito (Ventas)
                  </p>
                  <span
                    className="material-symbols-outlined text-green-500"
                    style={{ fontSize: 20 }}
                  >
                    arrow_upward
                  </span>
                </div>
                <p className="text-[#0e121b] text-2xl font-bold">
                  {formatCRC(summary.ivaDebito)}
                </p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{
                      width: summary.ivaDebito > 0 ? '70%' : '0%',
                    }}
                  ></div>
                </div>
              </div>

              {/* Credit */}
              <div className="bg-white p-5 rounded-xl border border-[#d0d7e7] shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-[#4d6599] text-sm font-medium">
                    IVA Crédito (Compras)
                  </p>
                  <span
                    className="material-symbols-outlined text-red-500"
                    style={{ fontSize: 20 }}
                  >
                    arrow_downward
                  </span>
                </div>
                <p className="text-[#0e121b] text-2xl font-bold">
                  {formatCRC(summary.ivaCredito)}
                </p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full"
                    style={{
                      width: summary.ivaCredito > 0 ? '35%' : '0%',
                    }}
                  ></div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-(--primary) p-5 rounded-xl border border-(--primary) shadow-sm flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                  <span
                    className="material-symbols-outlined text-white"
                    style={{ fontSize: 64 }}
                  >
                    account_balance
                  </span>
                </div>
                <div className="flex justify-between items-start z-10">
                  <p className="text-white text-sm font-bold">
                    {summary.ivaPagarConSaldo > 0 ? 'Total a Pagar' : 'Nuevo Saldo a Favor'}
                  </p>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>
                    {summary.ivaPagarConSaldo > 0 ? 'payments' : 'savings'}
                  </span>
                </div>
                <p className="text-white text-3xl font-bold z-10">
                  {formatCRC(summary.ivaPagarConSaldo > 0 ? summary.ivaPagarConSaldo : summary.nuevoSaldoAFavor)}
                </p>
                {summary.ivaPagarConSaldo > 0 && summary.saldoAFavorAnterior > 0 && (
                  <div className="text-white/80 text-xs z-10 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      trending_down
                    </span>
                    <span>Saldo aplicado: {formatCRC(Math.min(summary.saldoAFavorAnterior, summary.ivaPagar))}</span>
                  </div>
                )}
                {summary.ivaPagarConSaldo > 0 ? (
                  <p className="text-white/80 text-xs mt-1 z-10">
                    Vence el 15 de {getMonthName((currentMonth % 12) + 1)}
                  </p>
                ) : (
                  <p className="text-white/80 text-xs mt-1 z-10">
                    Se acumulará para futuras declaraciones
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#0e121b] text-xl font-bold leading-tight">
              Actividad Reciente
            </h3>
            {recentInvoices.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#d0d7e7] shadow-sm p-12 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400" style={{ fontSize: 32 }}>
                    inbox
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[#0e121b] font-semibold mb-1">
                    No hay movimientos registrados
                  </p>
                  <p className="text-[#4d6599] text-sm">
                    Sube tus archivos XML de facturación electrónica para ver el desglose de tu
                    actividad mensual.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#d0d7e7] shadow-sm overflow-hidden">
                <div className="divide-y divide-[#d0d7e7]">
                  {recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            invoice.tipo === 'GASTO'
                              ? 'bg-(--primary) text-white'
                              : 'bg-green-600 text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                            {invoice.tipo === 'GASTO' ? 'shopping_cart' : 'receipt'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-[#0e121b] truncate">
                              {invoice.tipo === 'GASTO'
                                ? invoice.proveedor || 'Proveedor desconocido'
                                : invoice.cliente || 'Cliente desconocido'}
                            </p>
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                invoice.tipo === 'GASTO'
                                  ? 'bg-(--primary) text-white'
                                  : 'bg-green-600 text-white'
                              }`}
                            >
                              {invoice.tipo === 'GASTO' ? 'Gasto' : 'Emitida'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#4d6599]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                calendar_today
                              </span>
                              {new Date(invoice.fecha).toLocaleDateString('es-CR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            {invoice.numeroFactura && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                  tag
                                </span>
                                {invoice.numeroFactura}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-bold text-[#0e121b]">
                          {formatCRC(invoice.totalCRC)}
                        </p>
                        <p className="text-xs text-[#4d6599]">
                          IVA: {formatCRC(invoice.ivaCRC)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#d0d7e7] p-4 bg-gray-50">
                  <Link
                    href="/reports"
                    className="text-sm font-medium text-(--primary) hover:text-(--primary-dark) flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Ver todas las facturas</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

