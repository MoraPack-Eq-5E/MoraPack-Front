/**
 * Servicio ACTUALIZADO - Ahora usa el algoritmo + player local
 * Ya NO hay simulación persistente en el backend
 */

import { 
  ejecutarAlgoritmo, 
  type EjecutarAlgoritmoRequest,
  type ResultadoAlgoritmoDTO,
  type AeropuertoAlmacenDTO
} from './algoritmo.service';
import { SimulationPlayer } from './simulation-player.service';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Tipo para respuesta del backend de aeropuertos
interface AeropuertoBackendResponse {
  id: number;
  codigoIATA: string;
  nombre?: string;
  ciudad?: { nombre: string };
  latitud: number;
  longitud: number;
  capacidadActual?: number;
  capacidadMaxima?: number;
}

/**
 * Carga aeropuertos para el player con información de almacén
 * Incluye capacidadActual (estado inicial) y capacidadMaxima
 */
export async function cargarAeropuertos(): Promise<AeropuertoAlmacenDTO[]> {
  const response = await fetch(`${API_BASE}/api/aeropuertos`);
  if (!response.ok) {
    console.warn('No se pudieron cargar aeropuertos, el player no tendrá coordenadas');
    return [];
  }
  const aeropuertos: AeropuertoBackendResponse[] = await response.json();
  return aeropuertos.map((a) => ({
    id: a.id,
    codigoIATA: a.codigoIATA,
    nombre: a.nombre || a.ciudad?.nombre,
    latitud: a.latitud,
    longitud: a.longitud,
    capacidadActual: a.capacidadActual ?? 0,  // Backup: 0 si no viene del backend
    capacidadMaxima: a.capacidadMaxima ?? 1000,
  }));
}

/**
 * Ejecuta el algoritmo y crea un player para la simulación
 * Retorna también los aeropuertos con capacidad inicial para tracking de almacenes
 */
export async function iniciarSimulacion(
  request: EjecutarAlgoritmoRequest
): Promise<{ resultado: ResultadoAlgoritmoDTO; player: SimulationPlayer; aeropuertos: AeropuertoAlmacenDTO[] }> {
  // 1. Ejecutar algoritmo en backend
  const resultado = await ejecutarAlgoritmo(request);

  // 2. Verificar que tengamos línea de tiempo
  if (!resultado.lineaDeTiempo) {
    throw new Error('El resultado no incluye línea de tiempo para simular');
  }

  // 3. Cargar aeropuertos para coordenadas y capacidad de almacén
  const aeropuertos = await cargarAeropuertos();

  // 4. Crear player para reproducir localmente (con coordenadas)
  const player = new SimulationPlayer(aeropuertos);
  player.loadTimeline(resultado.lineaDeTiempo);

  return { resultado, player, aeropuertos };
}

// Re-exportar tipos necesarios
export type {
  EjecutarAlgoritmoRequest,
  ResultadoAlgoritmoDTO,
  RutaDTO,
  VueloSimpleDTO,
  EventoLineaDeTiempoVueloDTO,
  LineaDeTiempoSimulacionDTO,
  AeropuertoAlmacenDTO
} from './algoritmo.service';

export { SimulationPlayer } from './simulation-player.service';
export type { SimulationState, ActiveFlightState } from './simulation-player.service';
