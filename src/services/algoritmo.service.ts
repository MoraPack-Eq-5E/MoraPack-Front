/**
 * Servicio para ejecutar el algoritmo ALNS
 */

export interface EjecutarAlgoritmoRequest {
  fuente: 'ARCHIVOS' | 'BASE_DE_DATOS';
  maxIteraciones?: number;
  temperaturaInicial?: number;
  factorEnfriamiento?: number;
}

export interface RutaDTO {
  id?: number;
  aeropuertoOrigenId: number;
  aeropuertoDestinoId: number;
  tiempoTotal: number;
  costoTotal: number;
  vuelos: VueloSimpleDTO[];
  pedidosIds: number[];
}

export interface VueloSimpleDTO {
  id: number;
  codigo: string;
  codigoOrigen: string;
  codigoDestino: string;
  horaSalida: string;
  horaLlegada: string;
  tiempoTransporte: number;
  costo: number;
}

export interface RutaProductoDTO {
  idProducto: number;
  idPedido: number;
  vuelos: VueloSimpleDTO[];
}

export interface EventoLineaDeTiempoVueloDTO {
  idEvento: string;
  tipoEvento: 'DEPARTURE' | 'ARRIVAL' | 'WAREHOUSE_TRANSFER' | 'IN_FLIGHT';
  horaEvento: string; // LocalDateTime en ISO format
  idVuelo?: number;
  codigoVuelo?: string;
  idProducto?: number;
  idPedido?: number;
  ciudadOrigen?: string;
  ciudadDestino?: string;
  idAeropuertoOrigen?: number;
  idAeropuertoDestino?: number;
  tiempoTransporteDias?: number;
  capacidadMaxima?: number; // Capacidad máxima del vuelo
  cantidadProductos?: number; // Cantidad de productos en este vuelo
}

export interface LineaDeTiempoSimulacionDTO {
  eventos: EventoLineaDeTiempoVueloDTO[];
  horaInicioSimulacion: string; // ✅ Corregido para coincidir con backend
  horaFinSimulacion: string;     // ✅ Corregido para coincidir con backend
  totalEventos: number;
  duracionTotalMinutos?: number;
  totalProductos?: number;
  totalVuelos?: number;
  totalAeropuertos?: number;
}

export interface ResultadoAlgoritmoDTO {
  exitoso: boolean;
  mensaje: string;
  horaInicio: string;
  horaFin: string;
  segundosEjecucion: number;
  totalProductos: number;
  totalPedidos: number;
  rutasProductos: RutaProductoDTO[];
  costoTotal?: number;
  porcentajeAsignacion?: number;
  lineaDeTiempo?: LineaDeTiempoSimulacionDTO; // Nombre correcto del backend
  // Agregados para compatibilidad con UI
  cantidadRutas?: number;
  rutas?: RutaDTO[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Ejecuta el algoritmo ALNS y obtiene resultados + línea de tiempo
 */
export async function ejecutarAlgoritmo(
  request: EjecutarAlgoritmoRequest
): Promise<ResultadoAlgoritmoDTO> {
  const response = await fetch(`${API_BASE}/api/algoritmo/ejecutar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error al ejecutar algoritmo: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obtiene rutas guardadas (si existen)
 */
export async function obtenerRutas(): Promise<RutaDTO[]> {
  const response = await fetch(`${API_BASE}/api/rutas`);

  if (!response.ok) {
    throw new Error(`Error al obtener rutas: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Obtiene soluciones guardadas
 */
export async function obtenerSoluciones(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/api/soluciones`);

  if (!response.ok) {
    throw new Error(`Error al obtener soluciones: ${response.statusText}`);
  }

  return response.json();
}

