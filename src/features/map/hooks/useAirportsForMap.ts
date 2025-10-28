/**
 * Hook para obtener aeropuertos desde el backend y adaptarlos para el mapa
 */

import { useQuery } from '@tanstack/react-query';
import type { Aeropuerto } from '@/types/map.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface AirportBackendResponse {
  id: number;
  codigoIATA: string;
  zonaHorariaUTC: number;
  latitud: string;  // ❗ Backend envía formato DMS: "24°54'00\" N"
  longitud: string; // ❗ Backend envía formato DMS: "67°09'00\" E"
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
  // Si ya es decimal (contiene solo números, punto y signo menos)
  if (/^-?\d+\.?\d*$/.test(dms.trim())) {
    return parseFloat(dms);
  }

  // Parsear formato DMS: "24°54'00" N" o "24°54'00\" N"
  const dmsRegex = /(\d+)°(\d+)'([\d.]+)["']?\s*([NSEW])?/i;
  const match = dms.match(dmsRegex);

  if (!match) {
    console.warn(`No se pudo parsear coordenada: ${dms}`);
    return 0;
  }

  const degrees = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3]);
  const direction = match[4]?.toUpperCase();

  // Convertir a decimal
  let decimal = degrees + minutes / 60 + seconds / 3600;

  // Aplicar signo según dirección
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Convierte un aeropuerto del backend al formato del mapa
 */
function adaptAirportForMap(airport: AirportBackendResponse): Aeropuerto {
  return {
    id: airport.id,
    codigo: airport.codigoIATA,
    capMaxAlmacen: airport.capacidadMaxima,
    cantActual: airport.capacidadActual,
    pais: airport.ciudad?.pais || 'Desconocido',
    latitud: parseDMSToDecimal(airport.latitud),
    longitud: parseDMSToDecimal(airport.longitud),
  };
}

/**
 * Obtiene aeropuertos desde el backend
 */
async function fetchAirportsFromBackend(): Promise<Aeropuerto[]> {
  const response = await fetch(`${API_BASE_URL}/aeropuertos`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener aeropuertos: ${response.statusText}`);
  }
  
  const data: AirportBackendResponse[] = await response.json();
  return data.map(adaptAirportForMap);
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
  });

  return {
    airports: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

