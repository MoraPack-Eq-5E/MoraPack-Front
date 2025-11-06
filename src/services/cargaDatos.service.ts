/**
 * Servicio para cargar datos desde archivos a la base de datos
 * Equivalente a DataLoadAPI del backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface CargaDatosRequest {
  directorioArchivos?: string;
  horaInicio?: string; // ISO 8601 format
  horaFin?: string;
}

export interface CargaDatosResponse {
  exito: boolean;
  mensaje: string;
  estadisticas: {
    pedidosCargados: number;
    pedidosCreados: number;
    pedidosFiltrados: number;
    erroresParseo: number;
    erroresArchivos: number;
    duracionSegundos: number;
  };
  tiempoInicio: string;
  tiempoFin: string;
  ventanaTiempo?: {
    horaInicio: string;
    horaFin: string;
  };
  tiempoEjecucionMs?: number;
}

export interface EstadoDatosResponse {
  exito: boolean;
  mensaje: string;
  directorioArchivos: string;
  estadisticas: {
    totalAeropuertos: number;
    totalPedidos: number;
    pedidosPendientes: number;
  };
}

/**
 * Carga pedidos desde archivos _pedidos_{AEROPUERTO}_ hacia la base de datos
 * POST /api/datos/cargar-pedidos
 */
export async function cargarPedidos(
  request?: CargaDatosRequest
): Promise<CargaDatosResponse> {
  const params = new URLSearchParams();
  
  if (request?.directorioArchivos) {
    params.append('directorioArchivos', request.directorioArchivos);
  }
  if (request?.horaInicio) {
    params.append('horaInicio', request.horaInicio);
  }
  if (request?.horaFin) {
    params.append('horaFin', request.horaFin);
  }

  const url = `${API_BASE}/api/datos/cargar-pedidos${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Error al cargar pedidos: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obtiene el estado actual de los datos en la base de datos
 * GET /api/datos/estado
 */
export async function obtenerEstadoDatos(): Promise<EstadoDatosResponse> {
  const response = await fetch(`${API_BASE}/api/datos/estado`);

  if (!response.ok) {
    throw new Error(`Error al obtener estado de datos: ${response.statusText}`);
  }

  return response.json();
}

