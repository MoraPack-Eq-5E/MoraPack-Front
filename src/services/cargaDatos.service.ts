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

/** 🔹 NUEVO: respuesta para cargar solo aeropuertos y vuelos */
export interface CargaAeropuertosVuelosResponse {
  exito: boolean;
  mensaje: string;
  estadisticas: {
    aeropuertosCargados: number;
    vuelosCargados: number;
    erroresArchivos: number;
    duracionSegundos: number;
  };
  tiempoInicio: string;
  tiempoFin: string;
  tiempoEjecucionMs?: number;
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

/** 🔹 NUEVO: carga SOLO aeropuertos y vuelos desde una ruta del backend
 *  POST /api/datos/cargar-aeropuertos-vuelos
 *
 *  Si no mandas directorioArchivos, el backend usará su ruta por defecto.
 */
export async function cargarAeropuertosYVuelos(
    request?: { directorioArchivos?: string }
): Promise<CargaAeropuertosVuelosResponse> {
  const params = new URLSearchParams();

  if (request?.directorioArchivos) {
    params.append('directorioArchivos', request.directorioArchivos);
  }

  const url = `${API_BASE}/api/datos/cargar-aeropuertos-vuelos${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
        errorData.mensaje ||
        `Error al cargar aeropuertos y vuelos: ${response.statusText}`
    );
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

// === NUEVO: modelo mínimo de Pedido para consultar desde la API ===
interface PedidoAPI {
  id: number;
  fechaPedido?: string; // ISO 8601
  estado?: string;
  [key: string]: any;
}

/**
 * Carga pedidos desde la API /api/pedidos y los filtra por fechaPedido
 * usando la fecha de operación (solo día) que se pasa como parámetro.
 */
export async function cargarPedidosDesdeApiPorFecha(
    fechaOperacionISO: string
): Promise<CargaDatosResponse> {
  const diaOperacion = fechaOperacionISO.slice(0, 10);

  const response = await fetch(`${API_BASE}/api/pedidos`);
  if (!response.ok) {
    throw new Error(`Error al obtener pedidos desde la API: ${response.statusText}`);
  }

  const todosLosPedidos: PedidoAPI[] = await response.json();

  const pedidosFiltrados = todosLosPedidos.filter((p) => {
    if (!p.fechaPedido) return false;
    const diaPedido = p.fechaPedido.slice(0, 10);
    return diaPedido === diaOperacion;
  });

  const ahora = new Date().toISOString();

  const resultado: CargaDatosResponse = {
    exito: true,
    mensaje: `Se encontraron ${pedidosFiltrados.length} pedidos para la fecha ${diaOperacion}`,
    estadisticas: {
      pedidosCargados: pedidosFiltrados.length,
      pedidosCreados: pedidosFiltrados.length,
      pedidosFiltrados: todosLosPedidos.length - pedidosFiltrados.length,
      erroresParseo: 0,
      erroresArchivos: 0,
      duracionSegundos: 0,
    },
    tiempoInicio: ahora,
    tiempoFin: ahora,
    ventanaTiempo: {
      horaInicio: fechaOperacionISO,
      horaFin: fechaOperacionISO,
    },
    tiempoEjecucionMs: 0,
  };

  return resultado;
}

// === payload para insertar pedidos vía /api/datos/insertar-pedidos ===
export interface PedidoPayload {
  clienteId: number;
  aeropuertoDestinoCodigo: string;
  aeropuertoOrigenCodigo: string;
  fechaPedido: string;
  fechaLimiteEntrega: string;
  estado: string;
  prioridad: number;
  cantidadProductos: number;
  productos: any[];
  rutasIds: number[];
}

/**
 * Inserta pedidos directamente llamando a:
 * POST /api/datos/insertar-pedidos
 */
export async function insertarPedidosDesdeDatosApi(
    pedidos: PedidoPayload[]
): Promise<CargaDatosResponse> {
  const response = await fetch(`${API_BASE}/api/datos/insertar-pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pedidos),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
        errorData.mensaje || `Error al insertar pedidos: ${response.statusText}`,
    );
  }

  return response.json();
}
