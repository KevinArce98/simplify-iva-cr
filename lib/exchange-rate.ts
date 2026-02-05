/**
 * Exchange Rate Service
 * Fetches official USD -> CRC exchange rate from Banco Central de Costa Rica (BCCR)
 * Implements in-memory caching to avoid redundant API calls
 */

import { XMLParser } from 'fast-xml-parser';

type ExchangeRateCache = {
  [date: string]: number;
};

const cache: ExchangeRateCache = {};

/**
 * Fetches exchange rate (tipo de cambio venta) for a given date from BCCR
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Exchange rate (venta) or fallback rate if API fails
 */
export async function getExchangeRate(date: string): Promise<number> {
  // Check cache first
  if (cache[date]) {
    return cache[date];
  }

  try {
    // Format date for BCCR API (DD/MM/YYYY)
    const [year, month, day] = date.split('T')[0].split('-');
    const formattedDate = `${day}/${month}/${year}`;

    // Get credentials from environment variables
    const email = process.env.BCCR_EMAIL;
    const token = process.env.BCCR_TOKEN;
    const name = process.env.BCCR_NAME || 'Usuario';

    if (!email || !token) {
      console.warn('BCCR credentials not found in environment variables, using fallback rate');
      return getFallbackRate(date);
    }

    // BCCR API endpoint
    const url = 'https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicos';
    
    // Build form data for POST request
    const params = new URLSearchParams({
      Indicador: '318', // 318 = Tipo de cambio venta USD
      FechaInicio: formattedDate,
      FechaFinal: formattedDate,
      Nombre: name,
      SubNiveles: 'N',
      CorreoElectronico: email,
      Token: token,
    });

    // Make request to BCCR API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.warn(`BCCR API returned status ${response.status}, using fallback rate`);
      return getFallbackRate(date);
    }

    const xmlText = await response.text();
    
    // Parse XML response
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true, // Remove namespace prefixes for easier navigation
    });

    const result = parser.parse(xmlText);
    
    // Navigate the XML structure: DataSet -> diffgram -> Datos_de_INGC011_CAT_INDICADORECONOMIC -> INGC011_CAT_INDICADORECONOMIC -> NUM_VALOR
    const dataSet = result?.DataSet;
    
    if (!dataSet) {
      console.warn('DataSet not found in BCCR response, using fallback rate');
      return getFallbackRate(date);
    }

    const diffgram = dataSet?.diffgram;
    if (!diffgram) {
      console.warn('Diffgram not found in BCCR response, using fallback rate');
      return getFallbackRate(date);
    }

    const datos = diffgram?.Datos_de_INGC011_CAT_INDICADORECONOMIC;
    if (!datos) {
      console.warn('Datos not found in BCCR response, using fallback rate');
      return getFallbackRate(date);
    }

    const indicadores = datos?.INGC011_CAT_INDICADORECONOMIC;
    if (!indicadores) {
      console.warn('No exchange rate data found in BCCR response, using fallback rate');
      return getFallbackRate(date);
    }

    // Get the rate value (NUM_VALOR) - can be single object or array
    const rateValue = Array.isArray(indicadores) ? indicadores[0]?.NUM_VALOR : indicadores?.NUM_VALOR;
    
    if (!rateValue) {
      console.warn('Exchange rate value not found in BCCR response, using fallback rate');
      return getFallbackRate(date);
    }

    const rate = parseFloat(rateValue);
    
    if (isNaN(rate) || rate <= 0) {
      console.warn(`Invalid exchange rate from BCCR: ${rateValue}, using fallback rate`);
      return getFallbackRate(date);
    }

    // Cache the result
    cache[date] = rate;
    
    console.log(`✅ Exchange rate for ${date}: ${rate.toFixed(2)}`);
    
    return rate;
  } catch (error) {
    console.error(`Error fetching exchange rate for ${date}:`, error);
    return getFallbackRate(date);
  }
}

/**
 * Fallback exchange rates (approximate historical rates)
 * In production, this should be replaced with actual BCCR API integration
 */
function getFallbackRate(date: string): number {
  const year = parseInt(date.split('-')[0]);
  const month = parseInt(date.split('-')[1]);
  
  // Approximate rates for 2023-2024
  if (year === 2023) {
    if (month >= 10) return 535.50; // Oct-Dec 2023
    if (month >= 7) return 540.25;  // Jul-Sep 2023
    if (month >= 4) return 545.80;  // Apr-Jun 2023
    return 550.00; // Jan-Mar 2023
  }
  
  if (year === 2024) {
    if (month >= 10) return 520.75; // Oct-Dec 2024
    if (month >= 7) return 525.50;  // Jul-Sep 2024
    if (month >= 4) return 530.25;  // Apr-Jun 2024
    return 532.00; // Jan-Mar 2024
  }

  if (year === 2025) {
    return 515.00; // 2025 rate
  }

  if (year === 2026) {
    return 510.00; // 2026 rate
  }
  
  // Default fallback
  return 530.00;
}

/**
 * Clears the exchange rate cache
 */
export function clearExchangeRateCache(): void {
  Object.keys(cache).forEach((key) => delete cache[key]);
}

/**
 * Gets cached exchange rates (for debugging)
 */
export function getCachedRates(): ExchangeRateCache {
  return { ...cache };
}
