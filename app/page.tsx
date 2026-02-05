import Link from 'next/link';
import { getTaxSummary } from './actions';
import { formatCRC, getMonthName } from '@/lib/utils';
import { Sidebar } from './components/sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Default to current month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const summary = await getTaxSummary(currentMonth, currentYear);

  return (
    <div className="relative flex h-screen w-full flex-row overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#f8f9fc]">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#d0d7e7] sticky top-0 z-10">
          <div className="flex flex-col">
            <h1 className="text-[#0e121b] text-base font-bold">IVA Calculadora</h1>
          </div>
          <button className="text-[#0e121b]">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>

        <div className="flex flex-col max-w-300 w-full mx-auto p-4 md:p-8 gap-8">
          {/* Page Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[#0e121b] tracking-tight text-[32px] font-bold leading-tight">
                Cálculo Mensual de IVA
              </h2>
              <p className="text-[#4d6599] text-sm font-normal leading-normal">
                Resumen de obligaciones tributarias para profesionales independientes
              </p>
            </div>
            <div className="flex items-end gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-[#d0d7e7]">
              <div className="relative">
                <select className="appearance-none bg-transparent pl-4 pr-8 py-2 text-sm font-medium text-[#0e121b] focus:outline-none cursor-pointer">
                  <option>{getMonthName(currentMonth)}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#0e121b]">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    expand_more
                  </span>
                </div>
              </div>
              <div className="w-px h-6 bg-[#d0d7e7]"></div>
              <div className="relative">
                <select className="appearance-none bg-transparent pl-4 pr-8 py-2 text-sm font-medium text-[#0e121b] focus:outline-none cursor-pointer">
                  <option>{currentYear}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#0e121b]">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    expand_more
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Expenses */}
            <Link
              href="/upload?type=gasto"
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-[#e5e7eb] hover:border-blue-600/50 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span
                  className="material-symbols-outlined text-blue-600"
                  style={{ fontSize: 120 }}
                >
                  receipt_long
                </span>
              </div>
              <div className="flex flex-col gap-4 z-10">
                <div className="bg-blue-600/10 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mb-2">
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
                <div className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-600/90 text-white font-medium py-2.5 px-4 rounded-lg transition-colors gap-2">
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
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-6 shadow-sm border border-[#e5e7eb] hover:border-blue-600/50 transition-all duration-300"
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
                {summary.ivaPagar > 0 ? 'Pendiente' : 'Saldo a Favor'}
              </span>
            </div>
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
              <div className="bg-blue-600 p-5 rounded-xl border border-blue-600 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10">
                  <span
                    className="material-symbols-outlined text-white"
                    style={{ fontSize: 64 }}
                  >
                    account_balance
                  </span>
                </div>
                <div className="flex justify-between items-start z-10">
                  <p className="text-white text-sm font-bold">Total a Pagar</p>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>
                    payments
                  </span>
                </div>
                <p className="text-white text-3xl font-bold z-10">
                  {formatCRC(Math.abs(summary.ivaPagar))}
                </p>
                <p className="text-white/80 text-xs mt-1 z-10">
                  Vence el 15 de {getMonthName((currentMonth % 12) + 1)}
                </p>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[#0e121b] text-xl font-bold leading-tight">
              Actividad Reciente
            </h3>
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
          </div>
        </div>
      </div>
    </div>
  );
}

