'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { processXMLFile, type ProcessFileResult } from '../actions';
import type { InvoiceType, UploadedFile } from '@/lib/types';
import { formatFileSize } from '@/lib/utils';
import AppShell from '../components/app-shell';

export default function UploadPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDraggingGasto, setIsDraggingGasto] = useState(false);
  const [isDraggingEmitida, setIsDraggingEmitida] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const gastoInputRef = useRef<HTMLInputElement>(null);
  const emitidaInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (selectedFiles: FileList | null, tipo: InvoiceType) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const xmlFiles = fileArray.filter((file) => file.name.endsWith('.xml'));

    if (xmlFiles.length === 0) {
      alert('Por favor seleccione solo archivos XML');
      return;
    }

    // Add files to queue with PENDING status
    const newFiles: UploadedFile[] = xmlFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      tipo,
      status: 'PENDING',
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    setIsProcessing(true);

    // Process each file
    for (let i = 0; i < xmlFiles.length; i++) {
      const file = xmlFiles[i];
      const fileId = newFiles[i].id;

      // Update to PROCESSING
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: 'PROCESSING' } : f))
      );

      try {
        const text = await file.text();
        const result: ProcessFileResult = await processXMLFile(file.name, text, tipo);

        // Update with result
        setFiles((prev) => prev.map((f) => (f.id === fileId ? result.file : f)));
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'ERROR',
                  error: error instanceof Error ? error.message : 'Error desconocido',
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent, tipo: InvoiceType) => {
    e.preventDefault();
    if (tipo === 'GASTO') {
      setIsDraggingGasto(true);
    } else {
      setIsDraggingEmitida(true);
    }
  };

  const handleDragLeave = (tipo: InvoiceType) => {
    if (tipo === 'GASTO') {
      setIsDraggingGasto(false);
    } else {
      setIsDraggingEmitida(false);
    }
  };

  const handleDrop = (e: React.DragEvent, tipo: InvoiceType) => {
    e.preventDefault();
    setIsDraggingGasto(false);
    setIsDraggingEmitida(false);
    handleFileSelect(e.dataTransfer.files, tipo);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const successCount = files.filter((f) => f.status === 'SUCCESS').length;
  const errorCount = files.filter((f) => f.status === 'ERROR').length;

  // Detectar el mes/año de las facturas cargadas exitosamente
  const invoicePeriod = useMemo(() => {
    const successFiles = files.filter((f) => f.status === 'SUCCESS' && f.invoice);
    if (successFiles.length === 0) return null;

    // Tomar la fecha de la primera factura exitosa
    const firstInvoice = successFiles[0].invoice;
    if (!firstInvoice) return null;

    const date = new Date(firstInvoice.fecha);
    return {
      mes: date.getMonth() + 1,
      año: date.getFullYear(),
    };
  }, [files]);

  const handleVerResultados = () => {
    if (invoicePeriod) {
      router.push(`/reports?mes=${invoicePeriod.mes}&año=${invoicePeriod.año}`);
    } else {
      router.push('/reports');
    }
  };

  return (
    <AppShell>
          {/* Full Screen Loader */}
          {isProcessing && (
            <div
              role="status"
              aria-busy="true"
              aria-label="Procesando archivos"
              className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl">
                <div className="relative size-16">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-(--primary) border-t-transparent"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-lg font-bold text-[#0e121b]">Procesando archivos...</h3>
                  <p className="text-sm text-[#4d6599]">
                    Por favor espera mientras validamos tus facturas
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Page Heading */}
          <div className="flex flex-col gap-3">
            <h2 className="text-[#0e121b] tracking-tight text-2xl md:text-[32px] font-bold leading-tight">
              Carga de Facturas
            </h2>
            <p className="text-[#4d6599] text-sm font-normal leading-normal">
              Arrastra y suelta tus archivos XML de facturación electrónica para procesar tus declaraciones de IVA
            </p>
          </div>

          {/* Drop Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zone: Gastos */}
            <div
              className={`group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-white p-8 md:p-12 hover:border-(--primary) hover:bg-(--primary)/5 transition-all cursor-pointer ${
                isDraggingGasto
                  ? 'border-(--primary) bg-(--primary)/5'
                  : 'border-[#d0d7e7]'
              }`}
              onDragOver={(e) => handleDragOver(e, 'GASTO')}
              onDragLeave={() => handleDragLeave('GASTO')}
              onDrop={(e) => handleDrop(e, 'GASTO')}
              onClick={() => gastoInputRef.current?.click()}
            >
              <div className="size-16 rounded-full bg-(--primary)/10 flex items-center justify-center text-(--primary) group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl">
                  shopping_cart_checkout
                </span>
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h2 className="text-lg font-bold leading-tight text-[#0e121b]">
                  Facturas de Gastos (Compras)
                </h2>
                <p className="text-[#4d6599] text-sm">
                  Arrastra aquí tus XML de compras y gastos deducibles
                </p>
              </div>
              <input
                ref={gastoInputRef}
                accept=".xml"
                className="hidden"
                multiple
                type="file"
                onChange={(e) => handleFileSelect(e.target.files, 'GASTO')}
              />
            </div>

            {/* Zone: Emitidas */}
            <div
              className={`group relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-white p-8 md:p-12 hover:border-(--primary) hover:bg-(--primary)/5 transition-all cursor-pointer ${
                isDraggingEmitida
                  ? 'border-(--primary) bg-(--primary)/5'
                  : 'border-[#d0d7e7]'
              }`}
              onDragOver={(e) => handleDragOver(e, 'EMITIDA')}
              onDragLeave={() => handleDragLeave('EMITIDA')}
              onDrop={(e) => handleDrop(e, 'EMITIDA')}
              onClick={() => emitidaInputRef.current?.click()}
            >
              <div className="size-16 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl">sell</span>
              </div>
              <div className="flex flex-col gap-1 text-center">
                <h2 className="text-lg font-bold leading-tight text-[#0e121b]">
                  Facturas Emitidas (Ventas)
                </h2>
                <p className="text-[#4d6599] text-sm">
                  Arrastra aquí tus XML de facturas electrónicas enviadas
                </p>
              </div>
              <input
                ref={emitidaInputRef}
                accept=".xml"
                className="hidden"
                multiple
                type="file"
                onChange={(e) => handleFileSelect(e.target.files, 'EMITIDA')}
              />
            </div>
          </div>

          {/* Queue Table */}
          {files.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold leading-tight tracking-[-0.015em] text-[#0e121b]">
                  Archivos en Cola
                </h3>
                <button
                  onClick={clearAll}
                  className="text-sm font-medium text-(--primary) hover:text-(--primary-dark)"
                >
                  Limpiar Todo
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#d0d7e7] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-175">
                    <thead>
                      <tr className="bg-gray-50 border-b border-[#d0d7e7]">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#4d6599]">
                          Nombre del Archivo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#4d6599] w-40">
                          Tipo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#4d6599] w-32">
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#4d6599] w-32">
                          Tamaño
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#4d6599] w-48">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#4d6599] w-24">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#d0d7e7]">
                      {files.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#4d6599]">
                                description
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-[#0e121b]">
                                  {file.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                file.tipo === 'GASTO'
                                  ? 'bg-(--primary)/10 text-(--primary) ring-(--primary)/20'
                                  : 'bg-green-50 text-green-700 ring-green-600/20'
                              }`}
                            >
                              {file.tipo === 'GASTO' ? 'Compra' : 'Venta'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#4d6599]">
                            {file.invoice?.fecha
                              ? new Date(file.invoice.fecha).toLocaleDateString('es-CR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#4d6599]">
                            {formatFileSize(file.size)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1" aria-live="polite" aria-atomic="true">
                              <div className="flex items-center gap-2">
                              {file.status === 'PENDING' && (
                                <>
                                  <span className="material-symbols-outlined text-gray-400 text-[20px]">
                                    schedule
                                  </span>
                                  <span className="text-sm font-medium text-gray-600">
                                    Pendiente
                                  </span>
                                </>
                              )}
                              {file.status === 'PROCESSING' && (
                                <>
                                  <span className="material-symbols-outlined text-(--primary) text-[20px] animate-spin">
                                    progress_activity
                                  </span>
                                  <span className="text-sm font-medium text-(--primary)">
                                    Validando...
                                  </span>
                                </>
                              )}
                              {file.status === 'SUCCESS' && (
                                <>
                                  <span className="material-symbols-outlined text-green-600 text-[20px]">
                                    check_circle
                                  </span>
                                  <span className="text-sm font-medium text-green-600">
                                    Listo
                                  </span>
                                </>
                              )}
                              {file.status === 'ERROR' && (
                                <>
                                  <span className="material-symbols-outlined text-red-500 text-[20px]">
                                    error
                                  </span>
                                  <span className="text-sm font-medium text-red-500">
                                    Error
                                  </span>
                                </>
                              )}
                              </div>
                              {file.status === 'ERROR' && file.error && (
                                <span className="text-xs text-red-600 leading-snug wrap-break-word max-w-72">
                                  {file.error}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => removeFile(file.id)}
                              className="text-[#4d6599] hover:text-red-500 transition-colors"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {successCount > 0 && (
                <div className="flex items-center gap-2 px-2 text-sm">
                  <span className="material-symbols-outlined text-(--primary) text-[18px]">
                    info
                  </span>
                  <span className="text-[#4d6599]">
                    Se procesaron {successCount} {successCount === 1 ? 'archivo válido' : 'archivos válidos'}.
                    {errorCount > 0 && ` ${errorCount} ${errorCount === 1 ? 'archivo fue rechazado' : 'archivos fueron rechazados'} (ver detalle en Estado).`}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 px-2">
                <Link
                  href="/"
                  className="text-sm font-medium text-[#4d6599] hover:text-(--primary)"
                >
                  Cancelar
                </Link>
                {successCount > 0 && (
                  <button
                    onClick={handleVerResultados}
                    className="flex items-center justify-center gap-2 rounded-lg bg-(--primary) hover:bg-(--primary-dark) text-white text-sm font-bold shadow-sm transition-all px-6 py-2.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Ver Resultados</span>
                  </button>
                )}
              </div>
            </div>
          )}
    </AppShell>
  );
}
