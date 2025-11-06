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

  // 3. Crear player para reproducir localmente
  const player = new SimulationPlayer();
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
