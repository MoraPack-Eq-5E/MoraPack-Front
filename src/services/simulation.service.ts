/**
 * Servicio ACTUALIZADO - Ahora usa el algoritmo + player local
 * Ya NO hay simulación persistente en el backend
 */

import { 
  ejecutarAlgoritmo, 
  type EjecutarAlgoritmoRequest,
  type ResultadoAlgoritmoDTO 
} from './algoritmo.service';
import { SimulationPlayer } from './simulation-player.service';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Carga aeropuertos para el player
 */
async function cargarAeropuertos() {
  const response = await fetch(`${API_BASE}/api/aeropuertos`);
  if (!response.ok) {
    console.warn('No se pudieron cargar aeropuertos, el player no tendrá coordenadas');
    return [];
  }
  const aeropuertos = await response.json();
  return aeropuertos.map((a: any) => ({
    codigoIATA: a.codigoIATA,
    latitud: a.latitud,
    longitud: a.longitud
  }));
}

/**
 * Ejecuta el algoritmo y crea un player para la simulación
 */
export async function iniciarSimulacion(
  request: EjecutarAlgoritmoRequest
): Promise<{ resultado: ResultadoAlgoritmoDTO; player: SimulationPlayer }> {
  // 1. Ejecutar algoritmo en backend
  const resultado = await ejecutarAlgoritmo(request);

  // 2. Verificar que tengamos línea de tiempo
  if (!resultado.lineaDeTiempo) {
    throw new Error('El resultado no incluye línea de tiempo para simular');
  }

  // 3. Cargar aeropuertos para coordenadas
  const aeropuertos = await cargarAeropuertos();

  // 4. Crear player para reproducir localmente (con coordenadas)
  const player = new SimulationPlayer(aeropuertos);
  player.loadTimeline(resultado.lineaDeTiempo);

  return { resultado, player };
}

// Re-exportar tipos necesarios
export type {
  EjecutarAlgoritmoRequest,
  ResultadoAlgoritmoDTO,
  RutaDTO,
  VueloSimpleDTO,
  EventoLineaDeTiempoVueloDTO,
  LineaDeTiempoSimulacionDTO
} from './algoritmo.service';

export { SimulationPlayer } from './simulation-player.service';
export type { SimulationState, ActiveFlightState } from './simulation-player.service';
