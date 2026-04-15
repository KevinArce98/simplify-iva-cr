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

/**
 * Formats exchange rate
 */
export function formatExchangeRate(rate: number): string {
  return rate.toFixed(2);
}

/**
 * Gets month name in Spanish
 */
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

/**
 * Formats file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Calculates the IVA payment due date for a given period
 * Returns the 15th of the following month
 * Exception: September 2025 has a deadline of October 24, 2025
 */
export function getIVADueDate(mes: number, año: number): Date {
  // Special exception for September 2025
  if (mes === 9 && año === 2025) {
    return new Date(2025, 9, 24); // October 24, 2025
  }

  // Calculate the 15th of the next month
  let nextMonth = mes + 1;
  let nextYear = año;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  return new Date(nextYear, nextMonth - 1, 15);
}

/**
 * Checks if we are within 7 days of the IVA due date
 */
export function isNearDueDate(mes: number, año: number): boolean {
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

/**
 * Checks if the IVA due date has passed
 */
export function isPastDueDate(mes: number, año: number): boolean {
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  return today > dueDate;
}

/**
 * Formats the IVA due date for display
 */
export function formatDueDate(mes: number, año: number): string {
  const dueDate = getIVADueDate(mes, año);
  return _dueDateFormatter.format(dueDate);
}

/**
 * Gets the number of days until the IVA due date
 */
export function getDaysUntilDue(mes: number, año: number): number {
  const dueDate = getIVADueDate(mes, año);
  const today = new Date();
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
