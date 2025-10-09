import type { Vuelo } from '@/types/map.types';

/**
 * Seeds de vuelos para la simulación “en vivo”.
 * Estados: 'CONFIRMADO' | 'CON_RETRASO' | 'EN_CAMINO' | 'FINALIZADO'
 * Nota: añadimos headingDeg y speedKts (opcionales en el dominio) para animación.
 */

const vuelosSeed: Vuelo[] = [
    {
        id: 1,
        codigo: 'MP-350',

        ciudadOrigen: 'LIM',
        ciudadDestino: 'CDG',

        horaOrigen: '2025-08-28T10:20:00Z',
        horaDestino: '2025-08-28T18:10:00Z',

        husoOrigen: -5,
        husoDestino: 2,

        capacidadMax: 600,
        esIntercontinental: true,

        estado: 'EN_CAMINO',

        latitudActual: 6.0,
        longitudActual: -40.0,

        headingDeg: 90,
        speedKts: 420,
    },
    {
        id: 2,
        codigo: 'MP-127',

        ciudadOrigen: 'GRU',
        ciudadDestino: 'MAD',

        horaOrigen: '2025-08-28T11:05:00Z',
        horaDestino: '2025-08-28T19:45:00Z',

        husoOrigen: -3,
        husoDestino: 2,

        capacidadMax: 580,
        esIntercontinental: true,

        estado: 'CON_RETRASO',

        latitudActual: -2.5,
        longitudActual: -30.0,

        headingDeg: 80,
        speedKts: 400,
    },
    {
        id: 3,
        codigo: 'MP-911',

        ciudadOrigen: 'BOG',
        ciudadDestino: 'DSS',

        horaOrigen: '2025-08-28T09:40:00Z',
        horaDestino: '2025-08-28T16:35:00Z',

        husoOrigen: -5,
        husoDestino: 0,

        capacidadMax: 520,
        esIntercontinental: true,

        estado: 'CONFIRMADO',

        latitudActual: 8.0,
        longitudActual: -20.0,

        headingDeg: 70,
        speedKts: 380,
    },
];

/** Devuelve una COPIA inmutable de los vuelos seed. */
export function getFlightsSeed(): Vuelo[] {
    return vuelosSeed.map(v => ({ ...v }));
}