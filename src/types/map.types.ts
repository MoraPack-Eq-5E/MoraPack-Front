/**
 *  Entidades del dominio
 *  (shape canon para el front)
 *
 */
export type EstadoVuelo = 'CONFIRMADO' | 'CON_RETRASO' | 'EN_CAMINO' | 'FINALIZADO';

/**
 * Modo de visualización del mapa
 */
export type MapMode = 'live' | 'simulation';

export interface Aeropuerto {
    id: number,
    codigo: string;
    capMaxAlmacen: number;
    cantActual: number;
    pais: string;
    latitud: number;
    longitud: number;
}

export interface Vuelo {
    id: number;
    codigo: string;

    ciudadOrigen: string;
    ciudadDestino: string;

    horaOrigen: string; // ISO string (DateTime). Ej: "2025-08-28T13:15:14Z"
    horaDestino: string;

    husoOrigen: number;
    husoDestino: number;

    capacidadMax: number;
    esIntercontinental: boolean;

    estado: EstadoVuelo;

    latitudActual: number;
    longitudActual: number;

    /** ---- Campos opcionales útiles SOLO para el mapa en vivo ---- */
    headingDeg?: number;    // rumbo 0-359, para rotar el ícono (simulación/UI)
    speedKts?: number;      // nudos, para animación
}