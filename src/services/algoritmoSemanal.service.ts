/**
 * Servicio para ejecutar algoritmo ALNS en escenarios diario y semanal
 * Alineado con AlgoritmoController del backend
 */
const API_URL = import.meta.env.VITE_API_URL || '/api';

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
  inicioOperacionDiaADia?: boolean;
}

/**
 * Información de un pedido no asignado - para detección de colapso
 */
export interface PedidoNoAsignadoInfoDTO {
  id: number;
  fechaPedido: string; // ISO datetime
  fechaLimiteEntrega: string; // ISO datetime
  codigoOrigen: string;
  codigoDestino: string;
  cantidadProductos: number;
  motivo: string;
}

export interface AlgoritmoResponse {
  // Estado
  exito?: boolean;
  exitoso?: boolean; // Backend usa 'exitoso'
  mensaje: string;
  ejecucionId?: number;
  
  // Métricas de tiempo
  tiempoInicioEjecucion?: string;
  tiempoFinEjecucion?: string;
  tiempoEjecucionSegundos?: number;
  horaInicio?: string; // Backend usa estos nombres
  horaFin?: string;
  segundosEjecucion?: number;
  
  // Ventana de simulación
  horaInicioSimulacion?: string;
  horaFinSimulacion?: string;
  
  // Métricas de pedidos
  totalPedidos: number;
  pedidosAsignados?: number;
  pedidosNoAsignados?: number;
  pedidosNoAsignadosIds?: number[];
  pedidosNoAsignadosInfo?: PedidoNoAsignadoInfoDTO[]; // Info detallada para detectar colapso
  
  // Métricas de productos
  totalProductos: number;
  productosAsignados?: number;
  productosNoAsignados?: number;
  productosPersistidos?: number;
  
  // Calidad de solución
  costoTotal?: number;
  costoPromedioPorProducto?: number;
  tiempoPromedioEntrega?: number;
  porcentajeAsignacion?: number;
  
  // Métricas de vuelos
  totalVuelos?: number;
  vuelosUtilizados?: number;
  capacidadPromedioUsada?: number;
  
  // Nota: productRoutes es null - usar endpoints de consulta
  productRoutes?: null;
  
  // Timeline de simulación (para visualización)
  lineaDeTiempo?: LineaDeTiempoSimulacionDTO;
  
  // Rutas de productos
  rutasProductos?: RutaProductoDTO[];
}
/**
 * Interfaz para el payload que espera el servidor
 */
export interface ColapsoRequest {
  sessionId: string;
  horaInicioSimulacion: string;
}
// ============================================================================
// TIPOS PARA TIMELINE DE SIMULACIÓN
// ============================================================================

export interface VueloSimpleDTO {
  id: number;
  codigo: string;
  codigoOrigen: string;
  codigoDestino: string;
  horaSalida?: string;
  horaLlegada?: string;
  tiempoTransporte?: number;
  capacidadMaxima?: number;
  idAeropuertoOrigen?: number;
  idAeropuertoDestino?: number;
  horaSalidaReal?: string;  // ISO datetime - fecha+hora exacta de salida
  horaLlegadaReal?: string; // ISO datetime - fecha+hora exacta de llegada
}

export interface RutaProductoDTO {
  idProducto: number;
  idPedido: number;
  fechaPedido?: string;
  nombrePedido?: string;
  nombreProducto?: string;
  peso?: number;
  volumen?: number;
  codigoOrigen?: string;
  codigoDestino?: string; // ← Destino FINAL del pedido
  vuelos: VueloSimpleDTO[];
  cantidadVuelos?: number;
  tiempoTotalHoras?: number;
  estado?: string;
  // NUEVOS: Información temporal calculada por ALNS
  horaEntregaEstimada?: string; // ISO datetime - hora de llegada al destino final
  llegoATiempo?: boolean;       // true si llega antes del deadline
  margenHoras?: number;         // Horas de margen (positivo=a tiempo, negativo=tarde)
}

export interface EventoLineaDeTiempoVueloDTO {
  idEvento: string;
  tipoEvento: 'DEPARTURE' | 'ARRIVAL' | 'WAREHOUSE_TRANSFER';
  horaEvento: string; // ISO datetime
  idVuelo?: number;
  codigoVuelo?: string;
  idProducto?: number;
  idPedido?: number; // Para compatibilidad (primer pedido del grupo)
  idsPedidos?: number[]; // ← TODOS los pedidos en este vuelo agrupado
  ciudadOrigen?: string;
  ciudadDestino?: string;
  codigoIATAOrigen?: string;  // Código IATA del aeropuerto origen
  codigoIATADestino?: string; // Código IATA del aeropuerto destino
  esDestinoFinal?: boolean;   // true si este vuelo llega al destino FINAL del pedido
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
  rutasProductos?: RutaProductoDTO[]; // Rutas para determinar destino final
}

/**
 * Ejecuta el algoritmo ALNS para escenario DIARIO (ventanas de 30 minutos)
 * POST /api/algoritmo/diario
 */
export async function ejecutarAlgoritmoDiario(
  request: AlgoritmoRequest
): Promise<AlgoritmoResponse> {
  const response = await fetch(`${API_URL}/api/algoritmo/diario`, {
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
  const response = await fetch(`${API_URL}/api/algoritmo/semanal`, {
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
  const response = await fetch(`${API_URL}/api/algoritmo/ejecutar`, {
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

// ============================================================================
// MODO COLAPSO - Usa el mismo endpoint semanal pero SIN límite de días
// El frontend detecta el punto de colapso basándose en pedidosNoAsignadosInfo
// ============================================================================

/**
 * Información del punto de colapso detectado en frontend
 */
export interface PuntoColapso {
  pedidoId: number;
  fechaColapso: string; // Fecha del pedido que causó el colapso
  fechaLimiteEntrega: string;
  codigoOrigen: string;
  codigoDestino: string;
  motivo: string;
  pedidosAntesColapso: number;
  pedidosDespuesColapso: number;
}

/**
 * Ejecuta el algoritmo ALNS en modo colapso (INDEFINIDO hasta encontrar colapso)
 * Usa el mismo endpoint semanal pero SIN límite de días - procesa todos los pedidos
 * POST /api/algoritmo/semanal
 */
export async function ejecutarAlgoritmoColapso(
  request: AlgoritmoRequest
): Promise<AlgoritmoResponse> {
  // En modo colapso, no enviamos duracionSimulacionDias para procesar TODOS los pedidos
  const requestColapso: AlgoritmoRequest = {
    ...request,
    duracionSimulacionDias: 365, // Procesar hasta 1 año (efectivamente "todos")
  };
  
  const response = await fetch(`${API_URL}/api/algoritmo/semanal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestColapso),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Error al ejecutar algoritmo de colapso: ${response.statusText}`);
  }

  return response.json();
}
export async function ejecutarAlgoritmoColapsoInMem(
  payload: ColapsoRequest // ✅ Ahora recibe un objeto simple
): Promise<AlgoritmoResponse> {
  const response = await fetch(`${API_URL}/api/algoritmo/colapso-en-ram`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // ✅ Indicamos que enviamos JSON
    },
    body: JSON.stringify(payload), // ✅ Convertimos el objeto a string
});
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.mensaje || `Error al ejecutar algoritmo de colapso inMem: ${response.statusText}`);
  }
  return response.json();
}
/**
 * Detecta el punto de colapso basándose en los pedidos no asignados
 * Retorna el primer pedido cronológicamente que no pudo ser asignado
 */
export function detectarPuntoColapso(resultado: AlgoritmoResponse): PuntoColapso | null {
  if (!resultado.pedidosNoAsignadosInfo || resultado.pedidosNoAsignadosInfo.length === 0) {
    return null; // No hubo colapso, todos los pedidos fueron asignados
  }
  
  // Ordenar por fecha de pedido (cronológico) y obtener el primero
  const pedidosOrdenados = [...resultado.pedidosNoAsignadosInfo].sort(
    (a, b) => new Date(a.fechaPedido).getTime() - new Date(b.fechaPedido).getTime()
  );
  
  const primerFallo = pedidosOrdenados[0];
  
  // Contar cuántos pedidos hay antes y después del colapso
  //const fechaColapso = new Date(primerFallo.fechaPedido);
  const pedidosAntesColapso = resultado.pedidosAsignados || 0;
  const pedidosDespuesColapso = resultado.pedidosNoAsignados || 0;
  
  return {
    pedidoId: primerFallo.id,
    fechaColapso: primerFallo.fechaPedido,
    fechaLimiteEntrega: primerFallo.fechaLimiteEntrega,
    codigoOrigen: primerFallo.codigoOrigen,
    codigoDestino: primerFallo.codigoDestino,
    motivo: primerFallo.motivo || "No se encontró ruta válida dentro del deadline",
    pedidosAntesColapso,
    pedidosDespuesColapso,
  };
}

/**
 * Recorta el timeline hasta el punto de colapso
 * Solo incluye eventos que ocurren antes de la fecha del colapso
 */
export function recortarTimelineHastaColapso(
  timeline: LineaDeTiempoSimulacionDTO | undefined,
  fechaColapso: string
): LineaDeTiempoSimulacionDTO | undefined {
  if (!timeline || !timeline.eventos) {
    return timeline;
  }
  
  const fechaLimite = new Date(fechaColapso);
  
  // Filtrar eventos que ocurren antes del colapso
  const eventosRecortados = timeline.eventos.filter(
    evento => new Date(evento.horaEvento) <= fechaLimite
  );
  
  // Recalcular métricas
  const horaFinRecortada = eventosRecortados.length > 0
    ? eventosRecortados[eventosRecortados.length - 1].horaEvento
    : timeline.horaInicioSimulacion;
  
  return {
    ...timeline,
    eventos: eventosRecortados,
    horaFinSimulacion: horaFinRecortada,
    totalEventos: eventosRecortados.length,
    duracionTotalMinutos: Math.floor(
      (new Date(horaFinRecortada).getTime() - new Date(timeline.horaInicioSimulacion).getTime()) / 60000
    ),
  };
}