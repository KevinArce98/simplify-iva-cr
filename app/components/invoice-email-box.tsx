'use client';

import { useState } from 'react';

type InvoiceEmailBoxProps = {
  invoiceEmail: string;
};

export default function InvoiceEmailBox({ invoiceEmail }: InvoiceEmailBoxProps) {
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
    <div className="bg-white rounded-xl border border-[#d0d7e7] shadow-sm p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3 min-w-0">
        <span className="material-symbols-outlined text-(--primary)" style={{ fontSize: 24 }}>
          alternate_email
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0e121b]">Correo para recibir facturas</p>
          <p className="text-xs text-[#4d6599] mt-1">
            Reenvía tus correos con XML a esta dirección:
          </p>
          <p className="text-sm font-mono text-[#0e121b] mt-1 truncate">{invoiceEmail}</p>
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
  );
}
