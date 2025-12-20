// src/services/colapso.service.ts
//
// Servicio para encontrar una "zona de colapso" (aprox) sin correr 1 año completo de frente.
// Estrategia: búsqueda exponencial + búsqueda binaria usando ejecuciones "probe" rápidas,
// y luego devuelve un día recomendado con buffer (ej. +7 días) para correr el algoritmo real.

import {
    type AlgoritmoRequest,
    type AlgoritmoResponse,
    type PuntoColapso,
    ejecutarAlgoritmoSemanal,
    detectarPuntoColapso,
} from "./algoritmoSemanal.service";

// -------------------------------------------------------
// Tipos
// -------------------------------------------------------
export interface VentanaColapsoAprox {
    // Duraciones en días desde horaInicioSimulacion
    ultimoDiaOk: number;      // última duración que NO colapsa
    primerDiaFalla: number;   // primera duración que colapsa (aprox)

    // Buffer para robustez (por variabilidad del algoritmo)
    bufferDias: number;       // ej. 7
    diaRecomendado: number;   // primerDiaFalla + buffer (capado a maxDias)
    fechaRecomendadaISO: string;

    // Fechas aproximadas informativas
    fechaUltimoOkISO: string;
    fechaPrimerFallaISO: string;

    // Primer pedido que falla (si backend lo provee)
    puntoColapso: PuntoColapso | null;

    // Telemetría
    llamadasRealizadas: number;
}

export interface BuscarColapsoOptions {
    // Rango de búsqueda (días desde el inicio)
    minDias?: number;           // default 7
    maxDias?: number;           // default 365

    // Crecimiento en la búsqueda exponencial
    factorCrecimiento?: number; // default 2

    // Parámetros "rápidos" para el PROBE (para no demorar)
    probeMaxIteraciones?: number;        // default 200
    probeTiempoLimiteSegundos?: number;  // default 10

    // Buffer (margen) para la corrida final recomendada
    bufferDias?: number; // default 7

    // Límite de seguridad (evitar demasiadas llamadas)
    maxLlamadas?: number; // default 20
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function hayColapso(resultado: AlgoritmoResponse): boolean {
    // 1) Señal principal: info detallada de no asignados
    if (resultado.pedidosNoAsignadosInfo && resultado.pedidosNoAsignadosInfo.length > 0) return true;

    // 2) Señales numéricas directas
    if ((resultado.pedidosNoAsignados ?? 0) > 0) return true;
    if ((resultado.productosNoAsignados ?? 0) > 0) return true;

    // 3) Porcentaje de asignación (si existe)
    // Cubrimos ambos posibles formatos (0-1 o 0-100) con una regla simple:
    // - Si > 1 asumimos 0-100
    // - Si <= 1 asumimos 0-1
    if (typeof resultado.porcentajeAsignacion === "number") {
        const p = resultado.porcentajeAsignacion;
        if (p > 1) {
            if (p < 99.999) return true;
        } else {
            if (p < 0.99999) return true;
        }
    }

    // 4) Flags de éxito
    if (resultado.exito === false) return true;
    if (resultado.exitoso === false) return true;

    // 5) Fallback por texto
    const msg = (resultado.mensaje || "").toLowerCase();
    const palabrasFallo = ["colapso", "no asign", "sin ruta", "deadline", "capacidad", "fall", "error"];
    if (palabrasFallo.some(w => msg.includes(w))) return true;

    return false;
}

function addDaysISO(isoStart: string, daysToAdd: number): string {
    const d = new Date(isoStart);
    d.setDate(d.getDate() + daysToAdd);
    return d.toISOString();
}

// -------------------------------------------------------
// Función principal
// -------------------------------------------------------
export async function encontrarVentanaColapsoAprox(
    baseRequest: AlgoritmoRequest,
    options: BuscarColapsoOptions = {}
): Promise<VentanaColapsoAprox | null> {

    const {
        minDias = 7,
        maxDias = 365,
        factorCrecimiento = 2,
        probeMaxIteraciones = 200,
        probeTiempoLimiteSegundos = 10,
        bufferDias = 7,
        maxLlamadas = 20,
    } = options;

    if (!baseRequest.horaInicioSimulacion) {
        throw new Error("horaInicioSimulacion es obligatoria para encontrar colapso aproximado.");
    }

    let llamadas = 0;

    // -------------------------
    // FASE A: búsqueda exponencial
    // -------------------------
    let ultimoOk = 0;
    let d = minDias;

    let primeraFalla: number | null = null;
    let resFalla: AlgoritmoResponse | null = null;

    while (d <= maxDias) {
        if (llamadas >= maxLlamadas) {
            throw new Error(`Se alcanzó maxLlamadas=${maxLlamadas} buscando colapso.`);
        }

        const probeRequest: AlgoritmoRequest = {
            ...baseRequest,
            duracionSimulacionDias: d,

            // PROBE rápido: intencionalmente reducido
            maxIteraciones: probeMaxIteraciones,
            tiempoLimiteSegundos: probeTiempoLimiteSegundos,
            modoDebug: baseRequest.modoDebug ?? false,
        };

        const res = await ejecutarAlgoritmoSemanal(probeRequest);
        llamadas++;

        if (!hayColapso(res)) {
            ultimoOk = d;
            d = Math.min(maxDias, d * factorCrecimiento);
            if (ultimoOk === maxDias) break;
        } else {
            primeraFalla = d;
            resFalla = res;
            break;
        }
    }

    // Nunca falló -> no hay colapso detectado en el rango
    if (primeraFalla === null) {
        return null;
    }

    // -------------------------
    // FASE B: búsqueda binaria
    // -------------------------
    let low = Math.max(ultimoOk + 1, 1);
    let high = primeraFalla;

    while (low < high) {
        if (llamadas >= maxLlamadas) {
            throw new Error(`Se alcanzó maxLlamadas=${maxLlamadas} en búsqueda binaria.`);
        }

        const mid = Math.floor((low + high) / 2);

        const probeRequest: AlgoritmoRequest = {
            ...baseRequest,
            duracionSimulacionDias: mid,

            // PROBE rápido
            maxIteraciones: probeMaxIteraciones,
            tiempoLimiteSegundos: probeTiempoLimiteSegundos,
            modoDebug: baseRequest.modoDebug ?? false,
        };

        const resMid = await ejecutarAlgoritmoSemanal(probeRequest);
        llamadas++;

        if (hayColapso(resMid)) {
            high = mid;
            resFalla = resMid; // guardamos la primera falla más temprana vista
        } else {
            low = mid + 1;
            ultimoOk = mid;
        }
    }

    const primerDiaFalla = low;

    // Punto de colapso si backend provee pedidosNoAsignadosInfo
    const punto = resFalla ? detectarPuntoColapso(resFalla) : null;

    // Fechas informativas
    const fechaUltimoOkISO =
        ultimoOk <= 0
            ? baseRequest.horaInicioSimulacion
            : addDaysISO(baseRequest.horaInicioSimulacion, ultimoOk);

    const fechaPrimerFallaISO = addDaysISO(baseRequest.horaInicioSimulacion, primerDiaFalla);

    // Día recomendado para corrida final (margen contra variabilidad del algoritmo)
    const diaRecomendado = Math.min(primerDiaFalla + bufferDias, maxDias);
    const fechaRecomendadaISO = addDaysISO(baseRequest.horaInicioSimulacion, diaRecomendado);

    return {
        ultimoDiaOk: ultimoOk,
        primerDiaFalla,

        bufferDias,
        diaRecomendado,
        fechaRecomendadaISO,

        fechaUltimoOkISO,
        fechaPrimerFallaISO,

        puntoColapso: punto,
        llamadasRealizadas: llamadas,
    };
}
