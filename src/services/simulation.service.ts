/**
 * Servicio para interactuar con la API de simulación en tiempo real
 */

import type {
  SimulationStatusResponse,
  StartVisualizationRequest,
  SimulationControlRequest,
  StartSimulationRequest,
  SimulationInitResponse
} from '@/types/simulation.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Inicia una nueva simulación (ejecuta ALNS)
 */
export async function startSimulation(
  request: StartSimulationRequest
): Promise<SimulationInitResponse> {
  const response = await fetch(`${API_BASE}/api/simulacion/semanal/iniciar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Error al iniciar simulación: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Inicia la visualización de una simulación ya completada
 */
export async function startVisualization(
  simulationId: number,
  request?: StartVisualizationRequest
): Promise<SimulationStatusResponse> {
  const response = await fetch(
    `${API_BASE}/api/simulations/${simulationId}/visualization/start`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request || {}),
    }
  );

  if (!response.ok) {
    throw new Error(`Error al iniciar visualización: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obtiene el estado actual de la simulación (POLLING)
 * Este endpoint debe llamarse cada 2-3 segundos
 */
export async function getSimulationStatus(
  simulationId: number
): Promise<SimulationStatusResponse> {
  const response = await fetch(
    `${API_BASE}/api/simulations/${simulationId}/status`
  );

  if (!response.ok) {
    // Crear error con información del status code
    const errorData = await response.json().catch(() => ({}));
    const error: any = new Error(
      errorData.message || `Error al obtener estado: ${response.statusText}`
    );
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

/**
 * Controla la simulación (pause/resume/stop/setSpeed)
 */
export async function controlSimulation(
  simulationId: number,
  request: SimulationControlRequest
): Promise<SimulationStatusResponse> {
  const response = await fetch(
    `${API_BASE}/api/simulations/${simulationId}/control`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(`Error al controlar simulación: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Verifica si una simulación está activa en memoria
 */
export async function isSimulationActive(
  simulationId: number
): Promise<boolean> {
  const response = await fetch(
    `${API_BASE}/api/simulations/${simulationId}/active`
  );

  if (!response.ok) {
    return false;
  }

  return response.json();
}

/**
 * Elimina una simulación de memoria
 */
export async function removeSimulation(simulationId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/simulations/${simulationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Error al eliminar simulación: ${response.statusText}`);
  }
}

/**
 * Obtiene el estado de una simulación (ALNS)
 */
export async function getSimulationState(simulationId: number) {
  const response = await fetch(
    `${API_BASE}/api/simulacion/${simulationId}/estado`
  );

  if (!response.ok) {
    throw new Error(`Error al obtener estado ALNS: ${response.statusText}`);
  }

  return response.json();
}

