/**
 * Servicio para ejecutar algoritmo ALNS en escenarios diario y semanal
 * Alineado con AlgoritmoController del backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AlgoritmoRequest {
  // Ventana de tiempo de simulación
  horaInicioSimulacion?: string; // ISO 8601
  horaFinSimulacion?: string;
  duracionSimulacionDias?: number; // Alternativa a horaFinSimulacion
  duracionSimulacionHoras?: number; // Para escenarios incrementales
  
  // Fuente de datos
  usarBaseDatos?: boolean; // true = BD, false = archivos
  pedidosIds?: number[]; // IDs específicos (opcional)
  
  // Parámetros del algoritmo
  maxIteraciones?: number;
  tasaDestruccion?: number;
  tiempoLimiteSegundos?: number;
  
  // Optimizaciones
  habilitarUnitizacion?: boolean;
  diasHorizonte?: number;
  
  // Debug
  modoDebug?: boolean;
}

export interface AlgoritmoResponse {
  // Estado
  exito: boolean;
  mensaje: string;
  ejecucionId?: number;
  
  // Métricas de tiempo
  tiempoInicioEjecucion: string;
  tiempoFinEjecucion: string;
  tiempoEjecucionSegundos: number;
  
  // Ventana de simulación
  horaInicioSimulacion?: string;
  horaFinSimulacion?: string;
  
  // Métricas de pedidos
  totalPedidos: number;
  pedidosAsignados: number;
  pedidosNoAsignados: number;
  pedidosNoAsignadosIds?: number[];
  
  // Métricas de productos
  totalProductos: number;
  productosAsignados: number;
  productosNoAsignados: number;
  productosPersistidos?: number;
  
  // Calidad de solución
  costoTotal?: number;
  costoPromedioPorProducto?: number;
  tiempoPromedioEntrega?: number;
  
  // Métricas de vuelos
  totalVuelos?: number;
  vuelosUtilizados?: number;
  capacidadPromedioUsada?: number;
  
  // Nota: productRoutes es null - usar endpoints de consulta
  productRoutes?: null;
  
  // Timeline de simulación (para visualización)
  lineaDeTiempo?: LineaDeTiempoSimulacionDTO;
}

// ============================================================================
// TIPOS PARA TIMELINE DE SIMULACIÓN
// ============================================================================

export interface EventoLineaDeTiempoVueloDTO {
  idEvento: string;
  tipoEvento: 'DEPARTURE' | 'ARRIVAL' | 'WAREHOUSE_TRANSFER';
  horaEvento: string; // ISO datetime
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
  horaInicioSimulacion: string; // ISO datetime
  horaFinSimulacion: string;     // ISO datetime
  totalEventos: number;
  duracionTotalMinutos?: number;
  totalProductos?: number;
  totalVuelos?: number;
  totalAeropuertos?: number;
}

/**
 * Ejecuta el algoritmo ALNS para escenario DIARIO (ventanas de 30 minutos)
 * POST /api/algoritmo/diario
 */
export async function ejecutarAlgoritmoDiario(
  request: AlgoritmoRequest
): Promise<AlgoritmoResponse> {
  const response = await fetch(`${API_BASE}/api/algoritmo/diario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Error al ejecutar algoritmo diario: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Ejecuta el algoritmo ALNS para escenario SEMANAL (7 días)
 * POST /api/algoritmo/semanal
 * 
 * Tiempo esperado: 30-90 minutos
 */
export async function ejecutarAlgoritmoSemanal(
  request: AlgoritmoRequest
): Promise<AlgoritmoResponse> {
  const response = await fetch(`${API_BASE}/api/algoritmo/semanal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Error al ejecutar algoritmo semanal: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Ejecuta el algoritmo ALNS genérico
 * POST /api/algoritmo/ejecutar
 */
export async function ejecutarAlgoritmo(
  request: AlgoritmoRequest
): Promise<AlgoritmoResponse> {
  const response = await fetch(`${API_BASE}/api/algoritmo/ejecutar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Error al ejecutar algoritmo: ${response.statusText}`);
  }

  return response.json();
}

