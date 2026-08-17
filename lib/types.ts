export type Currency = 'CRC' | 'USD';

export type InvoiceType = 'GASTO' | 'EMITIDA';

export type DocumentType =
  | 'FacturaElectronica'
  | 'NotaCreditoElectronica'
  | 'NotaDebitoElectronica';

export type InvoiceStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export type DesgloseTarifa = {
  tarifa: number;
  base: number;
  impuesto: number;
};

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
  Impuesto?: any;
  ImpuestoNeto?: string;
  MontoTotalLinea?: string;
};

export type Invoice = {
  id: string;
  tipo: InvoiceType;
  fecha: string;
  proveedor?: string;
  cliente?: string;
  numeroFactura?: string;
  moneda: Currency;
  ivaOriginal: number;
  totalOriginal: number;
  tipoCambio: number;
  ivaCRC: number;
  totalCRC: number;
  subtotalGravado: number;
  subtotalExento: number;
  subtotalExonerado: number;
  subtotalNoSujeto: number;
  subtotalGravadoCRC: number;
  subtotalExentoCRC: number;
  subtotalExoneradoCRC: number;
  subtotalNoSujetoCRC: number;
  tarifaIVA: number;
  documentType: DocumentType;
  signo: 1 | -1;
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
  ivaDebito: number;
  ivaCredito: number;
  ivaAPagar: number;
  periodo: string;
  mes: number;
  año: number;
  fechaVencimiento: Date;
  diasHastaVencimiento: number;
  estaProximoVencimiento: boolean;
  estaVencido: boolean;
  subtotalVentasGravadas: number;
  subtotalVentasExentas: number;
  subtotalVentasExoneradas: number;
  subtotalVentasNoSujetas: number;
  subtotalComprasGravadas: number;
  subtotalComprasExentas: number;
  subtotalComprasExoneradas: number;
  subtotalComprasNoSujetas: number;
  ivaPagar: number;
  creditoFiscal: number;
  saldoAFavorAnterior: number;
  ivaPagarConSaldo: number;
  nuevoSaldoAFavor: number;
};

export type ParsedXMLInvoice = {
  fecha: string;
  moneda: Currency;
  documentType: DocumentType;
  signo: 1 | -1;
  totalImpuesto: number;
  totalComprobante: number;
  emisor?: {
    nombre?: string;
    identificacion?: string;
  };
  receptor?: {
    nombre?: string;
    identificacion?: string;
  };
  numeroConsecutivo?: string;
  clave?: string;
  subtotalGravado: number;
  subtotalExento: number;
  subtotalExonerado: number;
  subtotalNoSujeto: number;
  tarifaIVA: number;
  desgloseTarifas: DesgloseTarifa[];
  tipoCambio: number;
};
