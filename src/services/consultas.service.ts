/**
 * Servicio para consultar resultados del algoritmo desde la base de datos
 * Equivalente a ConsultasPedidosController del backend
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ==================== TIPOS DE RESPUESTA ====================

export interface ConsultaPedidosResponse {
  exito: boolean;
  mensajeError?: string;
  totalPedidos: number;
  pedidos: any[]; // Simplificado - definir tipos completos si necesario
  horaInicioVentana?: string;
  horaFinVentana?: string;
}

export interface ConsultaPedidoDetalleResponse {
  exito: boolean;
  mensajeError?: string;
  pedido: any;
  cantidadProductos: number;
  productos: any[];
}

export interface ConsultaProductosResponse {
  exito: boolean;
  mensajeError?: string;
  totalProductos: number;
  productos: any[];
  desgloseEstado: Record<string, number>;
}

export interface ConsultaProductosPorPedidoResponse {
  exito: boolean;
  mensajeError?: string;
  pedidoId: number;
  cantidadProductos: number;
  productos: any[];
}

export interface ConsultaVuelosResponse {
  exito: boolean;
  mensajeError?: string;
  totalVuelos: number;
  vuelos: any[];
  desgloseEstado: Record<string, number>;
}

export interface ConsultaVueloDetalleResponse {
  exito: boolean;
  mensajeError?: string;
  vuelo: any;
  cantidadProductos: number;
  cantidadPedidos: number;
  capacidadUsada: number;
  capacidadTotal: number;
  capacidadDisponible: number;
}

export interface ConsultaProductosPorVueloResponse {
  exito: boolean;
  mensajeError?: string;
  codigoVuelo: string;
  cantidadProductos: number;
  productos: any[];
  desgloseEstado: Record<string, number>;
}

export interface ConsultaPedidosPorVueloResponse {
  exito: boolean;
  mensajeError?: string;
  codigoVuelo: string;
  cantidadPedidos: number;
  detallesPedidos: any[];
  totalProductosEnVuelo: number;
}

export interface EstadisticasAsignacionResponse {
  exito: boolean;
  mensajeError?: string;
  totalProductos: number;
  productosAsignados: number;
  productosNoAsignados: number;
  tasaAsignacion: number;
}

// ==================== ENDPOINTS DE PEDIDOS ====================

/**
 * GET /api/consultas/pedidos
 * Obtiene todos los pedidos, opcionalmente filtrados por ventana de tiempo
 */
export async function consultarPedidos(
  horaInicio?: string,
  horaFin?: string
): Promise<ConsultaPedidosResponse> {
  const params = new URLSearchParams();
  if (horaInicio) params.append('horaInicio', horaInicio);
  if (horaFin) params.append('horaFin', horaFin);

  const url = `${API_BASE}/api/consultas/pedidos${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error al consultar pedidos: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/consultas/pedidos/{id}
 * Obtiene un pedido específico con sus productos
 */
export async function consultarPedidoPorId(
  pedidoId: number
): Promise<ConsultaPedidoDetalleResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/pedidos/${pedidoId}`);

  if (!response.ok) {
    throw new Error(`Error al consultar pedido ${pedidoId}: ${response.statusText}`);
  }

  return response.json();
}

// ==================== ENDPOINTS DE PRODUCTOS ====================

/**
 * GET /api/consultas/productos
 * Obtiene todos los productos con desglose de estados
 */
export async function consultarProductos(): Promise<ConsultaProductosResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/productos`);

  if (!response.ok) {
    throw new Error(`Error al consultar productos: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/consultas/productos/pedido/{pedidoId}
 * Obtiene productos de un pedido específico (divisiones)
 */
export async function consultarProductosPorPedido(
  pedidoId: number
): Promise<ConsultaProductosPorPedidoResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/productos/pedido/${pedidoId}`);

  if (!response.ok) {
    throw new Error(`Error al consultar productos del pedido ${pedidoId}: ${response.statusText}`);
  }

  return response.json();
}

// ==================== ENDPOINTS DE VUELOS ====================

/**
 * GET /api/consultas/vuelos
 * Obtiene todos los vuelos con desglose de estados
 */
export async function consultarVuelos(): Promise<ConsultaVuelosResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/vuelos`);

  if (!response.ok) {
    throw new Error(`Error al consultar vuelos: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/consultas/vuelos/{codigo}
 * Obtiene detalles de un vuelo específico
 */
export async function consultarVueloPorCodigo(
  codigoVuelo: string
): Promise<ConsultaVueloDetalleResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/vuelos/${encodeURIComponent(codigoVuelo)}`);

  if (!response.ok) {
    throw new Error(`Error al consultar vuelo ${codigoVuelo}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/consultas/vuelos/{codigo}/productos
 * Obtiene productos asignados a un vuelo
 */
export async function consultarProductosPorVuelo(
  codigoVuelo: string
): Promise<ConsultaProductosPorVueloResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/vuelos/${encodeURIComponent(codigoVuelo)}/productos`);

  if (!response.ok) {
    throw new Error(`Error al consultar productos del vuelo ${codigoVuelo}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/consultas/vuelos/{codigo}/pedidos
 * Obtiene pedidos con productos en un vuelo
 */
export async function consultarPedidosPorVuelo(
  codigoVuelo: string
): Promise<ConsultaPedidosPorVueloResponse> {
  const response = await fetch(`${API_BASE}/api/consultas/vuelos/${encodeURIComponent(codigoVuelo)}/pedidos`);

  if (!response.ok) {
    throw new Error(`Error al consultar pedidos del vuelo ${codigoVuelo}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * GET /api/consultas/vuelos/estado
 * Obtiene estadísticas generales de asignación de productos a vuelos
 */
export async function consultarEstadisticasAsignacion(): Promise<any> {
  const response = await fetch(`${API_BASE}/api/consultas/vuelos/estado`);

  if (!response.ok) {
    throw new Error(`Error al consultar estadísticas: ${response.statusText}`);
  }

  return response.json();
}

