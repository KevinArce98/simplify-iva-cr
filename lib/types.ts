export type Currency = 'CRC' | 'USD';

export type InvoiceType = 'GASTO' | 'EMITIDA';

export type InvoiceStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

// Desglose de impuestos por tarifa
export type DesgloseTarifa = {
  tarifa: number;      // IVA rate (0, 1, 2, 4, 8, 13)
  base: number;        // Base imponible
  impuesto: number;    // Monto del impuesto
};

// Line item from XML
export type LineaDetalle = {
  NumeroLinea?: number;
  CodigoCABYS?: string;
  Cantidad?: number;
  UnidadMedida?: string;
  Detalle?: string;
  PrecioUnitario?: string;
  MontoTotal?: string;
  SubTotal?: string;
  BaseImponible?: string;
  Impuesto?: any; // Can be single object or array
  ImpuestoNeto?: string;
  MontoTotalLinea?: string;
};

export type Invoice = {
  id: string;
  tipo: InvoiceType;
  fecha: string; // ISO date string
  proveedor?: string; // For GASTO
  cliente?: string; // For EMITIDA
  numeroFactura?: string;
  moneda: Currency;
  ivaOriginal: number;
  totalOriginal: number;
  tipoCambio: number; // Always 1.00 for CRC
  ivaCRC: number;
  totalCRC: number;
  // New fields for Hacienda
  subtotalGravado: number;     // Base imponible (monto antes de IVA)
  subtotalExento: number;      // Monto exento (sin IVA)
  subtotalGravadoCRC: number;  // Base imponible en CRC
  subtotalExentoCRC: number;   // Monto exento en CRC
  tarifaIVA: number;           // Tarifa de IVA (ej: 13)
};

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  tipo: InvoiceType;
  status: InvoiceStatus;
  error?: string;
  invoice?: Invoice;
};

export type TaxSummary = {
  ivaDebito: number; // Sum of IVA from EMITIDA
  ivaCredito: number; // Sum of IVA from GASTO
  ivaAPagar: number; // Débito - Crédito
  periodo: string; // e.g., "Octubre 2023"
  mes: number;
  año: number;
  fechaVencimiento: Date; // Due date for IVA payment
  diasHastaVencimiento: number; // Days until due date
  estaProximoVencimiento: boolean; // Is within 7 days of due date
  estaVencido: boolean; // Is past due date
  // New fields for Hacienda
  subtotalVentasGravadas: number;   // Base imponible de ventas (EMITIDAS)
  subtotalVentasExentas: number;    // Ventas exentas
  subtotalComprasGravadas: number;  // Base imponible de compras (GASTOS)
  subtotalComprasExentas: number;   // Compras exentas
  ivaPagar: number;                 // IVA a pagar (ivaDebito - ivaCredito)
  creditoFiscal: number;            // Crédito fiscal si ivaCredito > ivaDebito
  // Saldo a favor
  saldoAFavorAnterior: number;      // Saldo a favor de períodos anteriores
  ivaPagarConSaldo: number;         // IVA a pagar después de aplicar saldo a favor
  nuevoSaldoAFavor: number;         // Nuevo saldo a favor para próximas declaraciones
};

export type ParsedXMLInvoice = {
  fecha: string;
  moneda: Currency;
  totalImpuesto: number;
  totalComprobante: number;
  emisor?: {
    nombre?: string;
  };
  receptor?: {
    nombre?: string;
  };
  numeroConsecutivo?: string;
  clave?: string;
  // New fields for Hacienda
  subtotalGravado: number;        // Base imponible (suma de bases con IVA > 0%)
  subtotalExento: number;         // Total exento (IVA 0%)
  tarifaIVA: number;              // Tarifa predominante
  desgloseTarifas: DesgloseTarifa[]; // Desglose por tarifa
};
