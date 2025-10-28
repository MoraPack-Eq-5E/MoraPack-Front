/**
 * Entidades del dominio para el mapa en tiempo real
 */

export type EstadoVuelo = 'SCHEDULED' | 'IN_FLIGHT' | 'LANDED';

export type MapMode = 'live' | 'simulation';

export interface Aeropuerto {
    id: number;
    codigo: string;
    capMaxAlmacen: number;
    cantActual: number;
    pais: string;
    latitud: number;
    longitud: number;
}

/**
 * Vuelo en tiempo real (simplificado del backend)
 */
export interface Vuelo {
    id: number;
    codigo: string;
    
    ciudadOrigen: string;
    ciudadDestino: string;
    codigoOrigen: string;
    codigoDestino: string;
    
    latitudActual: number;
    longitudActual: number;
    
    // Coordenadas de origen y destino para dibujar ruta
    latitudOrigen: number;
    longitudOrigen: number;
    latitudDestino: number;
    longitudDestino: number;
    
    estado: EstadoVuelo;
    progreso: number; // 0-100
    
    paquetesABordo: number;
    capacidadUsada: number;
    capacidadMax: number;
}