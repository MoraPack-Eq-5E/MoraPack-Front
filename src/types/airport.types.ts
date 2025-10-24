/**
 * Airport Types
 * 
 * Tipos para la gestión de aeropuertos
 */

/**
 * Continentes disponibles
 */
export type Continente = 'AMERICA' | 'EUROPA' | 'ASIA' | 'AFRICA' | 'OCEANIA';

/**
 * Estados posibles de un aeropuerto
 */
export type EstadoAeropuerto = 'DISPONIBLE' | 'MANTENIMIENTO' | 'CERRADO';

/**
 * Ciudad asociada a un aeropuerto
 */
export interface Ciudad {
  id: number;
  codigo: string;
  nombre: string;
  pais: string;
  continente: Continente;
}

/**
 * Aeropuerto (respuesta del backend)
 */
export interface Airport {
  id: number;
  codigoIATA: string;
  zonaHorariaUTC: number;
  latitud: string;
  longitud: string;
  capacidadActual: number;
  capacidadMaxima: number;
  ciudad: Ciudad;
  estado: EstadoAeropuerto;
}

/**
 * Filtros para la lista de aeropuertos
 */
export interface AirportFilters {
  search: string;
  estado: string; // 'all' | EstadoAeropuerto
  continente: string; // 'all' | Continente
}

/**
 * Datos para el gráfico Top 5 aeropuertos más ocupados
 */
export interface TopOccupiedAirport {
  codigoIATA: string;
  ciudad: string;
  capacidadActual: number;
  capacidadMaxima: number;
  porcentajeOcupacion: number;
}

