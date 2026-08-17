const _crcFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const _usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const _dateFormatter = new Intl.DateTimeFormat('es-CR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const _dueDateFormatter = new Intl.DateTimeFormat('es-CR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export function formatCRC(amount: number): string {
  return _crcFormatter.format(amount);
}

export function formatUSD(amount: number): string {
  return _usdFormatter.format(amount);
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return _dateFormatter.format(date);
}

export function formatExchangeRate(rate: number): string {
  return rate.toFixed(2);
}

export function getMonthName(month: number): string {
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
  return meses[month - 1] || 'Desconocido';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function getIVADueDate(mes: number, año: number): Date {
  if (mes === 9 && año === 2025) {
    return new Date(2025, 9, 24);
  }

  let nextMonth = mes + 1;
  let nextYear = año;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return new Date(nextYear, nextMonth - 1, 15);
}

export function isNearDueDate(mes: number, año: number): boolean {
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

export function isPastDueDate(mes: number, año: number): boolean {
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  return today > dueDate;
}

export function formatDueDate(mes: number, año: number): string {
  const dueDate = getIVADueDate(mes, año);
  return _dueDateFormatter.format(dueDate);
}

export function getDaysUntilDue(mes: number, año: number): number {
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
