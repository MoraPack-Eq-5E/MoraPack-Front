/** =========================
 *  Enums del dominio
 *  =========================
 */
export enum EstadoVuelo {
    CONFIRMADO = 'CONFIRMADO',
    CON_RETRASO = 'CON_RETRASO',
    EN_CAMINO = 'EN_CAMINO',
    FINALIZADO = 'FINALIZADO',
}

/** =========================
 *  Entidades del dominio
 *  (shape canon para el front)
 *  =========================
 */
export interface Aeropuerto {
    id: number,
    codigo: string,
    capMaxAlmacen: number,
    cantActual: number,
    pais: string,
    latitud: string,
    longitud: string
}

export interface Vuelo {
    id: number;
    codigo: string;

    ciudadOrigen: string;
    ciudadDestino: string;

    horaOrigen: string; // ISO string (DateTime). Ej: "2025-08-28T13:15:14Z"
    horaDestino: string;

    capacidadMax: number;
    esIntercontinental: boolean;

    estado: EstadoVuelo;

    latitudActual: number;
    longitudActual: number;

    /** ---- Campos opcionales útiles SOLO para el mapa en vivo ---- */
    headingDeg?: number;    // rumbo 0-359, para rotar el ícono (simulación/UI)
    speedKts?: number;      // nudos, para animación
}