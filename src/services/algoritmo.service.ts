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
  codigoDestino?: string;
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
  horaEvento: string; // LocalDateTime en ISO format
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
  horaInicioSimulacion: string; // ✅ Corregido para coincidir con backend
  horaFinSimulacion: string;     // ✅ Corregido para coincidir con backend
  totalEventos: number;
  duracionTotalMinutos?: number;
  totalProductos?: number;
  totalVuelos?: number;
  totalAeropuertos?: number;
  rutasProductos?: RutaProductoDTO[]; // Rutas para determinar destino final de cada pedido
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
 * Interfaz para soluciones guardadas
 */
export interface SolucionDTO {
  id?: number;
  nombre?: string;
  fechaCreacion?: string;
  costoTotal?: number;
  totalProductos?: number;
  totalPedidos?: number;
  rutas?: RutaDTO[];
}

/**
 * DTO para aeropuerto con información de almacén
 * Usado para tracking de capacidad en simulación frontend
 */
export interface AeropuertoAlmacenDTO {
  id: number;
  codigoIATA: string;
  nombre?: string;
  latitud: number;
  longitud: number;
  capacidadActual: number;  // Estado inicial del almacén (productos)
  capacidadMaxima: number;  // Capacidad máxima del almacén
}

/**
 * Obtiene soluciones guardadas
 */
export async function obtenerSoluciones(): Promise<SolucionDTO[]> {
  const response = await fetch(`${API_BASE}/api/soluciones`);

  if (!response.ok) {
    throw new Error(`Error al obtener soluciones: ${response.statusText}`);
  }

  return response.json();
}

