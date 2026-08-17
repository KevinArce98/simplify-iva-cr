import { XMLParser } from 'fast-xml-parser';
import type { Currency, DocumentType, ParsedXMLInvoice, LineaDetalle, DesgloseTarifa } from './types';

function parseNumber(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

function extractIdentification(personNode: any): string | undefined {
  const numero = personNode?.Identificacion?.Numero;
  if (numero === undefined || numero === null) {
    return undefined;
  }

  const normalized = String(numero).trim();
  return normalized.length > 0 ? normalized : undefined;
}

const SUPPORTED_DOCUMENT_TYPES = [
  'FacturaElectronica',
  'NotaCreditoElectronica',
  'NotaDebitoElectronica',
] as const;

function getDocumentSigno(documentType: string): 1 | -1 {
  return documentType === 'NotaCreditoElectronica' ? -1 : 1;
}

export async function parseInvoiceXML(xmlContent: string): Promise<ParsedXMLInvoice> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
  });

  try {
    const result = parser.parse(xmlContent);

    const documentNode = getDocumentNode(result);

    if (!documentNode) {
      throw new Error('Documento XML no reconocido');
    }

    if (documentNode.type === 'TiqueteElectronico') {
      throw new Error(
        'Este archivo es un TiqueteElectronico. Solo se permiten FacturaElectronica y notas de crédito/débito para procesar IVA.'
      );
    }

    if (!SUPPORTED_DOCUMENT_TYPES.includes(documentNode.type as any)) {
      throw new Error(
        `Documento no soportado: ${documentNode.type}. Solo se permiten FacturaElectronica y notas de crédito/débito.`
      );
    }

    const documentType = documentNode.type as DocumentType;
    const signo = getDocumentSigno(documentType);
    const factura = documentNode.node;

    const fecha = factura.FechaEmision;
    if (!fecha) {
      throw new Error('Fecha de emisión no encontrada');
    }

    const monedaCode = factura.ResumenFactura?.CodigoTipoMoneda?.CodigoMoneda;
    if (!monedaCode || !['CRC', 'USD'].includes(monedaCode)) {
      throw new Error(`Moneda no soportada: ${monedaCode}`);
    }
    const moneda = monedaCode as Currency;

    const totalImpuesto = parseFloat(factura.ResumenFactura?.TotalImpuesto || '0');

    const totalComprobante = parseFloat(factura.ResumenFactura?.TotalComprobante || '0');

    const tipoCambioXML = factura.ResumenFactura?.CodigoTipoMoneda?.TipoCambio;
    let tipoCambio: number;

    if (moneda === 'CRC') {
      tipoCambio = 1.0;
    } else if (moneda === 'USD') {
      if (!tipoCambioXML) {
        throw new Error('Factura en USD debe incluir tipo de cambio (TipoCambio)');
      }
      tipoCambio = parseFloat(tipoCambioXML);
      if (isNaN(tipoCambio) || tipoCambio <= 0) {
        throw new Error(`Tipo de cambio inválido: ${tipoCambioXML}`);
      }
      console.log(`✓ Factura USD - Tipo de cambio extraído: ${tipoCambio}`);
    } else {
      tipoCambio = 1.0;
    }

    const emisorNombre = factura.Emisor?.Nombre || factura.Emisor?.NombreComercial;
    const emisorIdentificacion = extractIdentification(factura.Emisor);

    const receptorNombre = factura.Receptor?.Nombre || factura.Receptor?.NombreComercial;
    const receptorIdentificacion = extractIdentification(factura.Receptor);

    const numeroConsecutivo = factura.NumeroConsecutivo ? String(factura.NumeroConsecutivo) : undefined;

    const clave = factura.Clave ? String(factura.Clave) : undefined;

    const {
      subtotalGravado: lineGravado,
      subtotalExento: lineExento,
      tarifaIVA,
      desgloseTarifas,
    } = parseLineItems(factura);

    const resumen = factura.ResumenFactura || {};
    const subtotalGravado = lineGravado;
    const subtotalExento = lineExento;
    const totalExonerado = parseNumber(resumen.TotalExonerado);
    const totalNoSujeto =
      parseNumber(resumen.TotalServNoSujeto) + parseNumber(resumen.TotalMercNoSujeta);

    return {
      fecha,
      moneda,
      documentType,
      signo,
      totalImpuesto,
      totalComprobante,
      emisor: {
        nombre: emisorNombre,
        identificacion: emisorIdentificacion,
      },
      receptor: {
        nombre: receptorNombre,
        identificacion: receptorIdentificacion,
      },
      numeroConsecutivo,
      clave,
      subtotalGravado,
      subtotalExento,
      subtotalExonerado: totalExonerado,
      subtotalNoSujeto: totalNoSujeto,
      tarifaIVA,
      desgloseTarifas,
      tipoCambio,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al parsear XML: ${error.message}`);
    }
    throw new Error('Error desconocido al parsear XML');
  }
}

function parseLineItems(factura: any): {
  subtotalGravado: number;
  subtotalExento: number;
  tarifaIVA: number;
  desgloseTarifas: DesgloseTarifa[];
} {
  let subtotalGravado = 0;
  let subtotalExento = 0;
  const tarifasMap = new Map<number, { base: number; impuesto: number }>();

  const detalleServicio = factura.DetalleServicio;
  if (!detalleServicio) {
    return {
      subtotalGravado: parseFloat(factura.ResumenFactura?.TotalGravado || '0'),
      subtotalExento: parseFloat(factura.ResumenFactura?.TotalExento || '0'),
      tarifaIVA: 13,
      desgloseTarifas: [],
    };
  }

  let lineas: LineaDetalle[] = [];
  if (detalleServicio.LineaDetalle) {
    lineas = Array.isArray(detalleServicio.LineaDetalle)
      ? detalleServicio.LineaDetalle
      : [detalleServicio.LineaDetalle];
  }

  for (const linea of lineas) {
    const baseImponible = parseFloat(linea.BaseImponible || linea.SubTotal || '0');

    let impuestos = linea.Impuesto;
    if (!impuestos) {
      subtotalExento += baseImponible;
      continue;
    }

    if (!Array.isArray(impuestos)) {
      impuestos = [impuestos];
    }

    const ivaImpuesto = impuestos.find((imp: any) => imp.Codigo === '01' || imp.Codigo === 1);

    if (!ivaImpuesto) {
      subtotalExento += baseImponible;
      continue;
    }

    const montoExoneracion = parseFloat(
      ivaImpuesto.Exoneracion?.MontoExoneracion || '0'
    );
    if (montoExoneracion > 0) {
      continue;
    }

    const tarifa = parseFloat(ivaImpuesto.Tarifa || '0');
    const montoImpuesto = parseFloat(ivaImpuesto.Monto || '0');

    if (tarifa === 0 || montoImpuesto === 0) {
      subtotalExento += baseImponible;

      if (!tarifasMap.has(0)) {
        tarifasMap.set(0, { base: 0, impuesto: 0 });
      }
      tarifasMap.get(0)!.base += baseImponible;
    } else {
      let baseCalculada = baseImponible;
      if (baseCalculada === 0 && montoImpuesto > 0 && tarifa > 0) {
        baseCalculada = montoImpuesto / (tarifa / 100);
      }

      subtotalGravado += baseCalculada;

      if (!tarifasMap.has(tarifa)) {
        tarifasMap.set(tarifa, { base: 0, impuesto: 0 });
      }
      tarifasMap.get(tarifa)!.base += baseCalculada;
      tarifasMap.get(tarifa)!.impuesto += montoImpuesto;
    }
  }

  let tarifaPredominante = 13;
  let maxBase = 0;

  for (const [tarifa, data] of tarifasMap.entries()) {
    if (tarifa > 0 && data.base > maxBase) {
      maxBase = data.base;
      tarifaPredominante = tarifa;
    }
  }

  const desgloseTarifas: DesgloseTarifa[] = [];
  for (const [tarifa, data] of tarifasMap.entries()) {
    desgloseTarifas.push({
      tarifa,
      base: data.base,
      impuesto: data.impuesto,
    });
  }

  return {
    subtotalGravado,
    subtotalExento,
    tarifaIVA: tarifaPredominante,
    desgloseTarifas,
  };
}

export function isValidXML(content: string): boolean {
  try {
    const parser = new XMLParser();
    parser.parse(content);
    return true;
  } catch {
    return false;
  }
}

export function getDocumentType(xmlContent: string): string | null {
  const parser = new XMLParser();
  try {
    const result = parser.parse(xmlContent);
    return getDocumentNode(result)?.type || null;
  } catch {
    return null;
  }
}

function getDocumentNode(
  parsedXML: unknown
): { type: string; node: any } | null {
  if (!parsedXML || typeof parsedXML !== 'object') {
    return null;
  }

  const entries = Object.entries(parsedXML as Record<string, unknown>);

  for (const [key, value] of entries) {
    if (key.startsWith('?')) {
      continue;
    }

    const normalizedType = key.includes(':') ? key.split(':').pop() || key : key;

    return {
      type: normalizedType,
      node: value,
    };
  }

  return null;
}
