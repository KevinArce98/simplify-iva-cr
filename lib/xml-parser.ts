import { XMLParser } from 'fast-xml-parser';
import type { Currency, ParsedXMLInvoice, LineaDetalle, DesgloseTarifa } from './types';

function extractIdentification(personNode: any): string | undefined {
  const numero = personNode?.Identificacion?.Numero;
  if (numero === undefined || numero === null) {
    return undefined;
  }

  const normalized = String(numero).trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Parses Costa Rica electronic invoice XML (v4.4)
 * Supports: FacturaElectronica
 * Ignores: MensajeReceptor
 */
export async function parseInvoiceXML(xmlContent: string): Promise<ParsedXMLInvoice> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false, // Don't auto-convert numbers to avoid scientific notation
    parseAttributeValue: false,
  });

  try {
    const result = parser.parse(xmlContent);

    const documentNode = getDocumentNode(result);

    // Navigate the XML structure for FacturaElectronica
    if (!documentNode || documentNode.type !== 'FacturaElectronica') {
      throw new Error('Documento no es una FacturaElectronica válida');
    }

    const factura = documentNode.node;

    // Extract date (FechaEmision)
    const fecha = factura.FechaEmision;
    if (!fecha) {
      throw new Error('Fecha de emisión no encontrada');
    }

    // Extract currency code (CodigoMoneda)
    const monedaCode = factura.ResumenFactura?.CodigoTipoMoneda?.CodigoMoneda;
    if (!monedaCode || !['CRC', 'USD'].includes(monedaCode)) {
      throw new Error(`Moneda no soportada: ${monedaCode}`);
    }
    const moneda = monedaCode as Currency;

    // Extract TotalImpuesto (IVA total)
    const totalImpuesto = parseFloat(factura.ResumenFactura?.TotalImpuesto || '0');

    // Extract TotalComprobante
    const totalComprobante = parseFloat(factura.ResumenFactura?.TotalComprobante || '0');

    // Extract TipoCambio from ResumenFactura.CodigoTipoMoneda
    // For CRC invoices, this should be 1.0
    // For USD invoices, this should contain the exchange rate (e.g., 497.49)
    const tipoCambioXML = factura.ResumenFactura?.CodigoTipoMoneda?.TipoCambio;
    let tipoCambio: number;
    
    if (moneda === 'CRC') {
      // For CRC, always use 1.0
      tipoCambio = 1.0;
    } else if (moneda === 'USD') {
      // For USD, require the exchange rate
      if (!tipoCambioXML) {
        throw new Error('Factura en USD debe incluir tipo de cambio (TipoCambio)');
      }
      tipoCambio = parseFloat(tipoCambioXML);
      if (isNaN(tipoCambio) || tipoCambio <= 0) {
        throw new Error(`Tipo de cambio inválido: ${tipoCambioXML}`);
      }
      console.log(`✓ Factura USD - Tipo de cambio extraído: ${tipoCambio}`);
    } else {
      // Shouldn't reach here due to earlier validation
      tipoCambio = 1.0;
    }

    // Extract emisor name
    const emisorNombre = factura.Emisor?.Nombre || factura.Emisor?.NombreComercial;
    const emisorIdentificacion = extractIdentification(factura.Emisor);

    // Extract receptor name
    const receptorNombre = factura.Receptor?.Nombre || factura.Receptor?.NombreComercial;
    const receptorIdentificacion = extractIdentification(factura.Receptor);

    // Extract numero consecutivo
    const numeroConsecutivo = factura.NumeroConsecutivo ? String(factura.NumeroConsecutivo) : undefined;
    
    // Extract clave - always convert to string to avoid type issues
    const clave = factura.Clave ? String(factura.Clave) : undefined;

    // Parse line items to calculate subtotals by IVA rate
    const { subtotalGravado, subtotalExento, tarifaIVA, desgloseTarifas } = parseLineItems(factura);

    // Get totals from ResumenFactura as fallback
    const totalGravado = parseFloat(factura.ResumenFactura?.TotalGravado || '0');
    const totalExento = parseFloat(factura.ResumenFactura?.TotalExento || '0');

    return {
      fecha,
      moneda,
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
      // New fields for Hacienda
      subtotalGravado: subtotalGravado || totalGravado,
      subtotalExento: subtotalExento || totalExento,
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

/**
 * Parses line items (DetalleServicio) to calculate subtotals by IVA rate
 * For lines with IVA, calculates base = IVA / tarifa
 * For lines without IVA (tarifa 0%), sums the subtotal directly
 */
function parseLineItems(factura: any): { 
  subtotalGravado: number; 
  subtotalExento: number; 
  tarifaIVA: number;
  desgloseTarifas: DesgloseTarifa[];
} {
  let subtotalGravado = 0;
  let subtotalExento = 0;
  const tarifasMap = new Map<number, { base: number; impuesto: number }>();
  
  // Get line items - can be a single object or array
  const detalleServicio = factura.DetalleServicio;
  if (!detalleServicio) {
    // Fallback to ResumenFactura values
    return {
      subtotalGravado: parseFloat(factura.ResumenFactura?.TotalGravado || '0'),
      subtotalExento: parseFloat(factura.ResumenFactura?.TotalExento || '0'),
      tarifaIVA: 13, // Default IVA rate in Costa Rica
      desgloseTarifas: [],
    };
  }
  
  // Normalize to array
  let lineas: LineaDetalle[] = [];
  if (detalleServicio.LineaDetalle) {
    lineas = Array.isArray(detalleServicio.LineaDetalle) 
      ? detalleServicio.LineaDetalle 
      : [detalleServicio.LineaDetalle];
  }
  
  for (const linea of lineas) {
    const baseImponible = parseFloat(linea.BaseImponible || linea.SubTotal || '0');
    
    // Get tax info - can be a single object or array
    let impuestos = linea.Impuesto;
    if (!impuestos) {
      // Line without taxes - considered exempt
      subtotalExento += baseImponible;
      continue;
    }
    
    // Normalize to array
    if (!Array.isArray(impuestos)) {
      impuestos = [impuestos];
    }
    
    // Only process IVA (Codigo = 01)
    const ivaImpuesto = impuestos.find((imp: any) => imp.Codigo === '01' || imp.Codigo === 1);
    
    if (!ivaImpuesto) {
      // No IVA on this line - considered exempt
      subtotalExento += baseImponible;
      continue;
    }
    
    const tarifa = parseFloat(ivaImpuesto.Tarifa || '0');
    const montoImpuesto = parseFloat(ivaImpuesto.Monto || '0');
    
    if (tarifa === 0 || montoImpuesto === 0) {
      // IVA rate is 0% - exempt
      subtotalExento += baseImponible;
      
      // Track 0% rate
      if (!tarifasMap.has(0)) {
        tarifasMap.set(0, { base: 0, impuesto: 0 });
      }
      tarifasMap.get(0)!.base += baseImponible;
    } else {
      // Has IVA - calculate base from tax if needed
      // Use BaseImponible from XML if available, otherwise calculate from tax
      let baseCalculada = baseImponible;
      if (baseCalculada === 0 && montoImpuesto > 0 && tarifa > 0) {
        // Calculate base: base = impuesto / (tarifa / 100)
        baseCalculada = montoImpuesto / (tarifa / 100);
      }
      
      subtotalGravado += baseCalculada;
      
      // Track by rate
      if (!tarifasMap.has(tarifa)) {
        tarifasMap.set(tarifa, { base: 0, impuesto: 0 });
      }
      tarifasMap.get(tarifa)!.base += baseCalculada;
      tarifasMap.get(tarifa)!.impuesto += montoImpuesto;
    }
  }
  
  // Determine the predominant IVA rate (the one with highest base amount)
  let tarifaPredominante = 13; // Default
  let maxBase = 0;
  
  for (const [tarifa, data] of tarifasMap.entries()) {
    if (tarifa > 0 && data.base > maxBase) {
      maxBase = data.base;
      tarifaPredominante = tarifa;
    }
  }
  
  // Build desglose array
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

/**
 * Validates if content is valid XML
 */
export function isValidXML(content: string): boolean {
  try {
    const parser = new XMLParser();
    parser.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts document type from XML
 */
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
    // Skip declaration nodes like ?xml
    if (key.startsWith('?')) {
      continue;
    }

    // Normalize namespace prefixes (e.g. ns:FacturaElectronica)
    const normalizedType = key.includes(':') ? key.split(':').pop() || key : key;

    return {
      type: normalizedType,
      node: value,
    };
  }

  return null;
}
