/**
 * Entidades del dominio para el mapa en tiempo real
 */

export type EstadoVuelo = 'SCHEDULED' | 'IN_FLIGHT' | 'LANDED';

export type MapMode = 'live' | 'simulation';

export interface Aeropuerto {
    id: number;
    codigoIATA: string;
    capMaxAlmacen: number;
    cantActual: number;
    pais: string;
    latitud: number;
    longitud: number;
    estado: 'DISPONIBLE' | 'NO_DISPONIBLE';
    isPrincipal?: boolean; // Indica si es una sede principal de MoraPack
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
    heading: number; // Dirección del vuelo en grados (0° = Norte, 90° = Este)
    
    paquetesABordo: number;
    capacidadUsada: number;
    capacidadMax: number;
}