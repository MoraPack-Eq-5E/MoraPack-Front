/**
 * Hook para obtener aeropuertos desde el backend y adaptarlos para el mapa
 */

import { useQuery } from '@tanstack/react-query';
import type { Aeropuerto } from '@/types/map.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface AirportBackendResponse {
  id: number;
  codigoIATA: string;
  zonaHorariaUTC: number;
  latitud: string;  // Backend envía formato DMS: "24°54'00\" N"
  longitud: string; // Backend envía formato DMS: "67°09'00\" E"
  capacidadActual: number;
  capacidadMaxima: number;
  ciudad: {
    id: number;
    codigo: string;
    nombre: string;
    pais: string;
    continente: string;
  };
  estado: string;
}

/**
 * Parsea coordenadas en formato DMS (Degrees Minutes Seconds) a decimal
 * Ejemplos:
 *   "24°54'00\" N" → 24.9
 *   "67°09'00\" E" → 67.15
 *   "-12.0219" → -12.0219 (ya decimal)
 */
function parseDMSToDecimal(dms: string): number {
  console.log('🔍 [parseDMSToDecimal] Input RAW:', {
    valor: dms,
    tipo: typeof dms,
    contieneComa: dms.includes(','),
    contienePunto: dms.includes('.')
  });

  // Algunos sistemas envían "40,472222" en lugar de "40.472222"
  const dmsNormalizado = dms.replace(/,/g, '.');

  // Si ya es decimal (contiene solo números, punto y signo menos)
  if (/^-?\d+\.?\d*$/.test(dmsNormalizado.trim())) {
    const resultado = parseFloat(dmsNormalizado);
    console.log('✅ [parseDMSToDecimal] Ya es decimal:', {
      input: dms,
      normalizado: dmsNormalizado,
      output: resultado,
      esValido: !isNaN(resultado)
    });
    return resultado;
  }

  // Parsear formato DMS: "24°54'00" N" o "24°54'00\" N"
  // También normalizar comas en el regex para soportar "24°54'00,5\" N"
  const dmsRegex = /(\d+)°(\d+)'([\d.,]+)["']?\s*([NSEW])?/i;
  const match = dmsNormalizado.match(dmsRegex);

  if (!match) {
    console.warn('❌ [parseDMSToDecimal] No se pudo parsear coordenada:', dms);
    return 0;
  }

  const degrees = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3].replace(',', '.')); // Normalizar coma en segundos también
  const direction = match[4]?.toUpperCase();

  console.log('🔄 [parseDMSToDecimal] Parseando DMS:', {
    input: dms,
    normalizado: dmsNormalizado,
    degrees,
    minutes,
    seconds,
    direction
  });

  // Convertir a decimal
  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Aplicar signo según dirección
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  console.log('✅ [parseDMSToDecimal] Resultado DMS:', {
    input: dms,
    output: decimal,
    formula: `${degrees} + ${minutes}/60 + ${seconds}/3600`
  });

  return decimal;
}

/**
 * Aeropuertos principales de MoraPack (sedes)
 */
const MAIN_AIRPORTS = new Set(['SPIM', 'UBBB', 'EBCI']);

/**
 * Convierte un aeropuerto del backend al formato del mapa
 */
function adaptAirportForMap(airport: AirportBackendResponse): Aeropuerto {
  console.log('[adaptAirportForMap] Aeropuerto:', airport.codigoIATA);
  console.log('[adaptAirportForMap] Coordenadas RAW del backend:', {
    codigoIATA: airport.codigoIATA,
    latitudRAW: airport.latitud,
    longitudRAW: airport.longitud,
    tipoLatitud: typeof airport.latitud,
    tipoLongitud: typeof airport.longitud
  });

  const latitudParsed = parseDMSToDecimal(airport.latitud);
  const longitudParsed = parseDMSToDecimal(airport.longitud);

  console.log('✨ [adaptAirportForMap] Coordenadas FINALES:', {
    codigoIATA: airport.codigoIATA,
    latitud: latitudParsed,
    longitud: longitudParsed,
    sonValidas: !isNaN(latitudParsed) && !isNaN(longitudParsed) && 
                Math.abs(latitudParsed) <= 90 && Math.abs(longitudParsed) <= 180
  });

  return {
    id: airport.id,
    codigoIATA: airport.codigoIATA,
    capMaxAlmacen: airport.capacidadMaxima,
    cantActual: airport.capacidadActual,
    pais: airport.ciudad?.pais || 'Desconocido',
    latitud: latitudParsed,
    longitud: longitudParsed,
    // Si el estado es null/undefined, usar DISPONIBLE por defecto
    estado: (airport.estado as 'DISPONIBLE' | 'NO_DISPONIBLE') || 'DISPONIBLE',
    // Marcar si es un aeropuerto principal
    isPrincipal: MAIN_AIRPORTS.has(airport.codigoIATA),
  };
}

/**
 * Obtiene aeropuertos desde el backend
 */
async function fetchAirportsFromBackend(): Promise<Aeropuerto[]> {
  console.log('[fetchAirportsFromBackend] Fetching desde:', `${API_BASE_URL}/api/aeropuertos`);
  
  const response = await fetch(`${API_BASE_URL}/api/aeropuertos`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener aeropuertos: ${response.statusText}`);
  }
  
  const data: AirportBackendResponse[] = await response.json();
  
  console.log('[fetchAirportsFromBackend] Datos del backend:', {
    totalAeropuertos: data.length,
    primerAeropuerto: data[0] ? {
      codigoIATA: data[0].codigoIATA,
      latitud: data[0].latitud,
      longitud: data[0].longitud
    } : 'No hay aeropuertos'
  });

  const resultado = data.map(adaptAirportForMap);
  
  console.log('[fetchAirportsFromBackend] Resultado final:', {
    totalAeropuertos: resultado.length,
    primerAeropuerto: resultado[0] ? {
      codigoIATA: resultado[0].codigoIATA,
      latitud: resultado[0].latitud,
      longitud: resultado[0].longitud
    } : 'No hay aeropuertos'
  });

  return resultado;
}

/**
 * Hook para obtener aeropuertos adaptados para el mapa
 */
export function useAirportsForMap() {
  const query = useQuery<Aeropuerto[], Error>({
    queryKey: ['airportsForMap'],
    queryFn: fetchAirportsFromBackend,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    enabled: false, // NO hacer fetch automático - solo cuando se llame refetch() después de cargar datos
  });

  return {
    airports: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

