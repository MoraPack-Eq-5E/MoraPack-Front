import type { Aeropuerto } from '@/types/map.types';

/**
 * Seeds de aeropuertos (valores aproximados para la demo).
 */
const aeropuertosSeed: Aeropuerto[] = [
    {
        id: 101,
        codigo: 'BRU',
        capMaxAlmacen: 800,
        cantActual: 520,
        pais: 'Bélgica',
        latitud: 50.9010,
        longitud: 4.4844,
    },
    {
        id: 102,
        codigo: 'LIM',
        capMaxAlmacen: 700,
        cantActual: 430,
        pais: 'Perú',
        latitud: -12.0219,
        longitud: -77.1143,
    },
];

/** Devuelve una COPIA inmutable de los aeropuertos seed. */
export function getAirportsSeed(): Aeropuerto[] {
    return aeropuertosSeed.map(a => ({ ...a }));
}

/**
 * Hook liviano para consumir aeropuertos estáticos.
 * (Más adelante sustituimos esto por useQuery() hacia la API.)
 */
export function useAirports() {
    return { airports: getAirportsSeed() };
}
