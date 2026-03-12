import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { Sidebar } from '@/app/components/sidebar';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

const dateTimeFormatter = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'full',
  timeStyle: 'short',
});

const shortFormatter = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type EmailLogDetailPageProps = {
  params: Promise<{ logId: string }>;
};

export default async function EmailLogDetailPage({ params }: EmailLogDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { logId } = await params;

  const log = await prisma.emailLog.findFirst({
    where: {
      id: logId,
      userId: session.user.id,
    },
  });

  if (!log) {
    notFound();
  }

  const statusConfig = log.success
    ? {
        icon: 'check_circle',
        bg: 'bg-green-50',
        iconColor: 'text-green-600',
        label: 'Procesado correctamente',
      }
    : {
        icon: 'error',
        bg: 'bg-red-50',
        iconColor: 'text-red-600',
        label: 'Hubo problemas al procesar este correo',
      };

  const errorDetails = log.errorMessage
    ?.split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const createdAtFull = dateTimeFormatter.format(log.createdAt);
  const createdAtShort = shortFormatter.format(log.createdAt);

  const metricItems = [
    { label: 'Adjuntos recibidos', value: log.attachmentCount },
    { label: 'Procesados', value: log.processedCount },
    { label: 'Omitidos', value: log.skippedCount },
    { label: 'Con error', value: log.failedCount },
  ];

  return (
    <>
      <Sidebar />

      <div className="relative flex min-h-screen w-full flex-row overflow-hidden md:pl-64 bg-[#f8f9fc]">
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          <div className="w-full max-w-300 mx-auto px-4 md:px-8 py-20 md:py-12 flex flex-col gap-6">
            <div className="flex items-center gap-3 text-sm text-[#4d6599]">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[#4d6599] hover:text-(--primary) transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Volver al panel
              </Link>
              <span className="hidden md:inline">•</span>
              <span className="text-xs uppercase tracking-[0.2em] text-[#9aa7c4]">
                Detalle del correo
              </span>
            </div>

            <div className="rounded-2xl border border-[#d0d7e7] bg-white shadow-sm p-6 md:p-8 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-12 rounded-xl ${statusConfig.bg} flex items-center justify-center`}
                    >
                      <span
                        className={`material-symbols-outlined text-[28px] ${statusConfig.iconColor}`}
                      >
                        {statusConfig.icon}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm uppercase tracking-[0.18em] text-[#9aa7c4]">
                        Estado
                      </p>
                      <h1 className="text-xl font-semibold text-[#0e121b] leading-tight">
                        {statusConfig.label}
                      </h1>
                      <p className="text-sm text-[#4d6599]">{createdAtShort}</p>
                    </div>
                  </div>
                  <div className="text-sm text-[#4d6599] bg-[#f8f9fc] border border-[#e1e6f2] rounded-xl px-4 py-3">
                    ID del mensaje:{' '}
                    <span className="font-mono text-[#0e121b]">{log.messageId}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e1e6f2] bg-[#f8f9fc] p-4">
                  <p className="text-xs font-semibold text-[#4d6599] uppercase">
                    Asunto del correo
                  </p>
                  <p className="text-lg font-medium text-[#0e121b] mt-1">
                    {log.subject || '(sin asunto)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {metricItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-[#e1e6f2] bg-linear-to-br from-white to-[#f8f9fc] p-4 flex flex-col gap-1"
                  >
                    <span className="text-xs uppercase tracking-wide text-[#9aa7c4]">
                      {item.label}
                    </span>
                    <span className="text-2xl font-bold text-[#0e121b]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#e1e6f2] p-4 flex flex-col gap-3">
                  <h2 className="text-sm font-semibold text-[#0e121b] uppercase tracking-wide">
                    Detalles del remitente
                  </h2>
                  <div className="flex flex-col gap-2 text-sm text-[#4d6599]">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#9aa7c4]">
                        Remitente
                      </p>
                      <p className="font-medium text-[#0e121b] break-all">{log.sender}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#9aa7c4]">
                        Destinatario
                      </p>
                      <p className="font-medium text-[#0e121b] break-all">
                        {log.recipient}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#9aa7c4]">
                        Recibido
                      </p>
                      <p className="font-medium text-[#0e121b]">{createdAtFull}</p>
                    </div>
                    {typeof log.processingTimeMs === 'number' && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#9aa7c4]">
                          Tiempo de procesamiento
                        </p>
                        <p className="font-medium text-[#0e121b]">
                          {log.processingTimeMs} ms
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e1e6f2] p-4 flex flex-col gap-3">
                  <h2 className="text-sm font-semibold text-[#0e121b] uppercase tracking-wide">
                    Resultado
                  </h2>
                  {log.success ? (
                    <div className="flex flex-col gap-2 text-sm text-[#065f46] bg-green-50 border border-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="material-symbols-outlined text-[20px]">
                          verified
                        </span>
                        Todas las facturas se procesaron correctamente.
                      </div>
                      <p>
                        Si necesitas ubicar la factura, revisa el reporte del mes o
                        utiliza el buscador de facturas.
                      </p>
                    </div>
                  ) : errorDetails && errorDetails.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-[#4d6599]">
                        Encontramos los siguientes errores durante el procesamiento:
                      </p>
                      <ul className="flex flex-col gap-2 text-sm text-[#0e121b]">
                        {errorDetails.map((detail) => (
                          <li
                            key={detail}
                            className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 flex gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px] text-red-500">
                              warning
                            </span>
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-sm text-[#a16207] bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="material-symbols-outlined text-[20px]">
                          info
                        </span>
                        Hubo un error general durante el procesamiento.
                      </div>
                      <p>
                        No se recibieron detalles adicionales. Intenta reenviar el correo
                        con los XML o cargar los archivos manualmente desde la sección de
                        &quot;Subir Gastos&quot;.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 text-xs text-[#9aa7c4]">
                <p>
                  ¿Aún necesitas ayuda? Envíanos este ID de mensaje ({log.messageId}) para
                  que podamos rastrear el correo rápidamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
