/**
 * Adapter Service
 * Servicios para adaptar la información que viene de la BD
 */

import type {Aeropuerto, Vuelo, EstadoVuelo} from "@/types/map.types.ts";

/**
 * Tipos "crudos" como vendrían del backend (según las tablas de la BD)
 */
export interface AeropuertoAPI {
    id: number;
    codigoIATA: string;
    capMaxAlmacen: number;
    cantActual: number;
    pais: string;
    latitud: string;
    longitud: string;
}

export interface VueloAPI {
    id: number;
    codigo: string;
    ciudadOrigen: string;
    ciudadDestino: string;
    horaOrigen: string; // DateTime en string ISO/SQL
    horaDestino: string;
    husoOrigen: number;
    husoDestino: number;
    capacidadMax: number;
    esIntercontinental: boolean;
    estado: EstadoVuelo;
    latitudActual: string;
    longitudActual: string;
}

/**
 * Funcion para transformar los datos que llegan de la API
 * de Aeropuerto al tipo de datos que se maneja en UI
 * @param a
 */
export function toAeropuerto(a: AeropuertoAPI) : Aeropuerto {
    return {
        ...a,
        latitud: parseFloat(a.latitud),
        longitud: parseFloat(a.longitud),
    };
}

/**
 * Funcion para transformar los datos que llegan de la API
 * de Vuelo al tipo de datos que se maneja en UI
 * @param v
 */
export function toVuelo(v: VueloAPI): Vuelo {
    return {
      ...v,
      latitudActual: parseFloat(v.latitudActual),
      longitudActual: parseFloat(v.longitudActual),
    };
}