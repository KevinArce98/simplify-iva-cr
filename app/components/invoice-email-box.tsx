'use client';

import Link from 'next/link';
import { useState } from 'react';

type InvoiceEmailBoxProps = {
  invoiceEmail: string;
  recentEmailLogs?: {
    id: string;
    subject: string;
    processedCount: number;
    skippedCount: number;
    failedCount: number;
    success: boolean;
    errorMessage: string | null;
    createdAt: Date;
  }[];
};

export default function InvoiceEmailBox({
  invoiceEmail,
  recentEmailLogs = [],
}: InvoiceEmailBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(invoiceEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error('No se pudo copiar el correo de facturas:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#d0d7e7] shadow-sm p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="material-symbols-outlined text-(--primary)"
            style={{ fontSize: 24 }}
          >
            alternate_email
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0e121b]">
              Correo para recibir facturas
            </p>
            <p className="text-xs text-[#4d6599] mt-1">
              Reenvía tus correos con XML a esta dirección:
            </p>
            <p className="text-sm font-mono text-[#0e121b] mt-1 truncate">
              {invoiceEmail}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center justify-center gap-2 bg-(--primary) hover:bg-(--primary-dark) text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copiado' : 'Copiar correo'}</span>
        </button>
      </div>

      {recentEmailLogs.length > 0 && (
        <div className="border-t border-[#d0d7e7] pt-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-[#4d6599] uppercase tracking-wide">
            Estado de correos recibidos
          </p>

          <div className="flex flex-col gap-2">
            {recentEmailLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-[#d0d7e7] bg-[#f8f9fc] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`material-symbols-outlined ${
                        log.success ? 'text-green-600' : 'text-red-600'
                      }`}
                      style={{ fontSize: 18 }}
                    >
                      {log.success ? 'check_circle' : 'error'}
                    </span>
                    <p className="text-sm font-medium text-[#0e121b] truncate">
                      {log.subject || '(sin asunto)'}
                    </p>
                  </div>

                  <span className="text-xs text-[#4d6599]">
                    {new Date(log.createdAt).toLocaleString('es-CR')}
                  </span>
                </div>

                <p className="text-xs text-[#4d6599] mt-1">
                  Procesadas: {log.processedCount} · Omitidas: {log.skippedCount} ·
                  Errores: {log.failedCount}
                </p>

                {!log.success && log.errorMessage && (
                  <p className="text-xs text-red-700 mt-1">{log.errorMessage}</p>
                )}

                <div className="mt-2">
                  <Link
                    href={`/email-logs/${log.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-(--primary) hover:text-(--primary-dark)"
                  >
                    Ver detalle
                    <span className="material-symbols-outlined text-[16px]">
                      open_in_new
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
