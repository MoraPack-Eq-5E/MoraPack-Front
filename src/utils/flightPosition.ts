import type {Vuelo, EstadoVuelo} from "@/types/map.types.ts";

// Objeto con claves literales; TS verifica que cubrimos TODAS las variantes.
export const FLIGHT_COLORS = {
    CONFIRMADO:   '#1a7f37', // verde
    EN_CAMINO:    '#22a06b', // verde
    CON_RETRASO:  '#e11d48', // rojo
    FINALIZADO:   '#6b7280', // gris
} as const satisfies Record<EstadoVuelo, string>;

export function statusColor(status: EstadoVuelo): string {
    return FLIGHT_COLORS[status];
}

/** =========================
 *  Movimiento / Geodesia simple (para simulación)
 *  =========================
 *  Aproximación ligera:
 *  - 1 nudo = 1 NM/h; 1 NM ≈ 1/60 grado de latitud
 *  - Escalamos la longitud por cos(lat) para que no “salte” en polos
 *  - Rumbo en grados 0..359 (0 = norte, 90 = este)
 */
const DEG_PER_NM = 1 / 60;

function normalizeHeadingDeg(h: number): number {
    // Pasa  -inf..inf  -> 0..359
    const r = h % 360;
    return r < 0 ? r + 360 : r;
}

function clampLat(lat: number): number {
    // Evita problemas de tiles cerca de los polos
    return Math.max(-85, Math.min(85, lat));
}

function wrapLng(lng: number): number {
    // Envuelve a [-180, 180]
    let x = lng;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
}

/**
 * Calcula la siguiente posición de un vuelo tras `minutes`.
 * No modifica el objeto original (retorna tuplas nuevas).
 */
export function nextPosition(v: Pick<Vuelo, 'latitudActual' | 'longitudActual' | 'headingDeg' | 'speedKts' | 'estado'>,
                             minutes = 0.3) : {lat: number; lng: number; heading: number} {

    // Si ya finalizó, queda quieto
    if (v.estado === 'FINALIZADO') {
        return {
            lat: v.latitudActual,
            lng: v.longitudActual,
            heading: normalizeHeadingDeg(v.headingDeg ?? 90),
        };
    }

    const heading = normalizeHeadingDeg(v.headingDeg ?? 90);
    const speedKts = v.speedKts ?? 400; // valor típico para aviación comercial
    const nm = speedKts * (minutes / 60);   // millas náuticas recorridas
    const deg = nm * DEG_PER_NM;

    // Bearing: 0=N, 90=E, 180=S, 270=O
    const rad = (heading * Math.PI) / 180;

    // Latitud: “deg” directo
    const dLat = deg * Math.cos(rad);

    // Longitud: escalada por cos(lat) actual para que sea más realista
    const latRad = (v.latitudActual * Math.PI) / 180;
    const cosLat = Math.max(0.15, Math.cos(latRad)); // evita divisiones cercanas a 0
    const dLng = (deg * Math.sin(rad)) / cosLat;

    const nextLat = clampLat(v.latitudActual + dLat);
    const nextLng = wrapLng(v.longitudActual + dLng);

    return { lat: nextLat, lng: nextLng, heading };
}

/**
 * Retorna un NUEVO objeto Vuelo con lat/lng/heading actualizados.
 * Útil dentro de un setState(prev => prev.map(advanceVuelo)).
 */
export function advanceVuelo(v: Vuelo, minutes = 0.3): Vuelo {
    const { lat, lng, heading } = nextPosition(v, minutes);
    return {
        ...v,
        latitudActual: lat,
        longitudActual: lng,
        headingDeg: heading,
    };
}