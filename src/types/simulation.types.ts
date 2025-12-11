/**
 * Tipos para simulación en tiempo real
 */

export interface SimulationStatusResponse {
  simulationId: number;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  currentSimulatedTime: string;
  elapsedSimulatedSeconds: number;
  progressPercentage: number;
  currentDay: number;
  currentHour: number;
  currentMinute: number;
  activeFlights: ActiveFlight[];
  warehouses: WarehouseState[];
  metrics: SimulationMetrics;
  recentEvents: SimulationEvent[];
  timeScale: number;
  packageTracking?: PackageTrackingDTO[];
}

export interface ActiveFlight {
  flightId: number;
  flightCode: string;
  currentLat: number;
  currentLng: number;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  originCode: string;
  destinationCode: string;
  originCity: string;
  destinationCity: string;
  status: 'SCHEDULED' | 'IN_FLIGHT' | 'LANDED';
  progressPercentage: number;
  heading: number; // Dirección del vuelo en grados (0° = Norte, 90° = Este)
  packagesOnBoard: number[];
  capacityUsed: number;
  capacityMax: number;
  occupancyPercentage: number;
}

export interface WarehouseState {
  warehouseId: number;
  code: string;
  cityName: string;
  latitude: number;
  longitude: number;
  capacity: number;
  current: number;
  available: number;
  occupancyPercentage: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'FULL';
  isPrincipal: boolean;
}

export interface SimulationMetrics {
  totalFlights: number;
  flightsScheduled: number;
  flightsInAir: number;
  flightsCompleted: number;
  totalOrders: number;
  ordersDelivered: number;
  ordersInTransit: number;
  ordersWaiting: number;
  slaCompliancePercentage: number;
  averageWarehouseOccupancy: number;
}

/**
 * Tipos de eventos de simulación
 * 
 * Eventos de vuelos:
 * - FLIGHT_DEPARTURE: Vuelo despega de aeropuerto
 * - FLIGHT_ARRIVAL: Vuelo aterriza en aeropuerto
 * 
 * Eventos de pedidos:
 * - ORDER_DEPARTED: Pedido despegó en un vuelo
 * - ORDER_ARRIVED_AIRPORT: Pedido llegó a aeropuerto (escala o destino)
 * - ORDER_AT_DESTINATION: Pedido llegó a destino final
 * - ORDER_PICKED_UP: Cliente recogió el pedido
 * - ORDER_DELIVERED: Pedido entregado (legacy/compatibilidad)
 * 
 * Eventos de almacén:
 * - WAREHOUSE_WARNING: Almacén cerca de capacidad máxima
 * - WAREHOUSE_CRITICAL: Almacén en estado crítico
 * - WAREHOUSE_FULL: Almacén lleno
 * 
 * Otros:
 * - SLA_RISK: Riesgo de incumplimiento de SLA
 * - INFO: Información general
 */
export type SimulationEventType =
  | 'FLIGHT_DEPARTURE' 
  | 'FLIGHT_ARRIVAL' 
  | 'FLIGHT_CANCELED'
  | 'ORDER_DEPARTED'
  | 'ORDER_CREATED'
  | 'ORDER_ARRIVED_AIRPORT'
  | 'ORDER_AT_DESTINATION'
  | 'ORDER_PICKED_UP'
  | 'ORDER_DELIVERED' 
  | 'WAREHOUSE_WARNING' 
  | 'WAREHOUSE_CRITICAL' 
  | 'WAREHOUSE_FULL' 
  | 'SLA_RISK' 
  | 'INFO';

export interface SimulationEvent {
  id: string;
  type: SimulationEventType;
  message: string;
  simulatedTime: string;
  realTime: string;
  relatedFlightId?: number;
  relatedFlightCode?: string;
  relatedOrderId?: number;
  relatedOrderIds?: number[];
  relatedAirportCode?: string;
  relatedAirportName?: string;
  productCount?: number;
}

export interface StartVisualizationRequest {
  timeScale?: number;
  autoStart?: boolean;
}

// Control actions type
export type SimulationControlAction = 'pause' | 'resume' | 'stop' | 'setSpeed';

export interface SimulationControlRequest {
  action: SimulationControlAction;
  newSpeed?: number;
}

// Response after control action
export type SimulationControlResponse = SimulationStatusResponse;

export interface StartSimulationRequest {
  diasSimulacion?: number;
  tiempoLimiteSegundos?: number;
  iteracionesAlns?: number;
  modoDebug?: boolean;
  factorAceleracion?: number;
  autoStartVisualization?: boolean;
}

// Resultado de importación de archivos
export interface ImportResult {
  success: boolean;
  message: string;
  count?: number;
  cities?: number;
  orders?: number;
  products?: number;
  error?: string;
}

export interface SimulationInitResponse {
  simulacionId: number;
  mensaje: string;
  estado: string;
}

// Event Feed Configuration
export interface EventFeedConfig {
  maxEvents: number;
  showTimestamp: boolean;
  enableFilters: boolean;
  autoScroll: boolean;
}

export type EventCategory = 'FLIGHT' | 'WAREHOUSE' | 'ORDER' | 'ALERT' | 'ALL';

/**
 * Filtros avanzados para eventos de simulación
 */
export interface EventFilter {
  categories: EventCategory[];
  searchTerm?: string;
  
  // Filtros avanzados
  /** ID de pedido específico para filtrar */
  orderId?: string;
  /** Código de vuelo para filtrar (ej: "LIMA-BRUS-03:00") */
  flightCode?: string;
  /** Código IATA de aeropuerto para filtrar */
  airportCode?: string;
  /** Rango de fechas para filtrar por tiempo simulado */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

/**
 * Información de vuelo actual de un pedido en tránsito
 */
export interface CurrentFlightInfo {
  flightId: number;
  flightCode: string;
  /** ID del evento para encontrar el marcador en el mapa */
  eventId: string;
  originCode: string;
  destinationCode: string;
}

/**
 * Respuesta del endpoint de tracking de pedido
 */
export interface OrderTrackingResponse {
  exito: boolean;
  mensaje?: string;
  orderId: number;
  currentStatus: 'EN_ALMACEN' | 'EN_VUELO' | 'ENTREGADO' | 'EN_TRANSITO' | 'SIN_PRODUCTOS';
  isInFlight: boolean;
  currentFlightInfo?: CurrentFlightInfo | null;
  pedido: {
    id: number;
    fechaPedido: string | null;
    fechaLimiteEntrega: string | null;
    estado: string | null;
    origenIATA: string | null;
    destinoIATA: string | null;
  };
  cantidadProductos: number;
  productos: Array<{
    id: number;
    nombre: string;
    estado: string;
    instanciaVuelo: string | null;
    fechaLlegada: string | null;
  }>;
  productosEntregados: number;
  porcentajeEntrega: number;
}

/**
 * Información de tracking de un pedido para uso en el frontend
 */
export interface OrderTrackingInfo {
  orderId: number;
  currentStatus: string;
  isInFlight: boolean;
  currentFlightInfo?: CurrentFlightInfo | null;
  events: SimulationEvent[];
}

export type PackageTrackingStatus = 
  | 'EN_ORIGEN' 
  | 'EN_VUELO' 
  | 'EN_ESCALA' 
  | 'EN_DESTINO_ESPERANDO' 
  | 'ENTREGADO_PARCIAL' 
  | 'ENTREGADO_TOTAL';

export interface PackageTrackingDTO {
  packageId: number;
  totalProducts: number;
  productsDelivered: number;
  productsInFlight: number;
  productsAtWarehouse: Record<string, number>;
  status: PackageTrackingStatus;
  finalDestinationCode: string;
  currentAirportCode?: string;
  currentFlightId?: number;
  lastUpdateTime: string;
  deliveryPercentage: number;
  isFullyDelivered: boolean;
}

// ==================== DETALLE COMPLETO DE PEDIDO ====================

/**
 * Estado del pedido
 */
export type EstadoPedido = 'PENDIENTE' | 'EN_TRANSITO' | 'CANCELADO' | 'ENTREGADO' | 'RETRASADO';

/**
 * Estado de un producto
 */
export type EstadoProducto = 'EN_ALMACEN' | 'EN_VUELO' | 'ENTREGADO' | 'PERDIDO' | 'DESCONOCIDO';

/**
 * Información del pedido en el detalle completo
 */
export interface OrderDetailPedido {
  id: number;
  externalId: string | null;
  nombre: string | null;
  estado: EstadoPedido | string;
  prioridad: number;
  origenIATA: string | null;
  destinoIATA: string | null;
  fechaPedido: string | null;
  fechaLimiteEntrega: string | null;
  horasRecogida: number | null;
  cantidadProductos: number;
}

/**
 * Información del cliente en el detalle completo
 */
export interface OrderDetailCliente {
  nombreCompleto: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  correo: string | null;
  telefono: string | null;
  ciudadRecojo: string | null;
}

/**
 * Información de un producto en el detalle completo
 */
export interface OrderDetailProducto {
  id: number;
  nombre: string;
  peso: number;
  volumen: number;
  estado: EstadoProducto | string;
  instanciaVuelo: string | null;
  fechaLlegada: string | null;
}

/**
 * Métricas de urgencia y entrega del pedido
 */
export interface OrderDetailMetricas {
  tiempoRestanteMinutos: number;
  esUrgente: boolean;
  porcentajeEntrega: number;
  productosEntregados: number;
  productosEnVuelo: number;
  productosEnAlmacen: number;
}

/**
 * Respuesta del endpoint de detalle completo de pedido
 * GET /api/consultas/pedidos/{id}/detalle-completo
 */
export interface OrderDetailResponse {
  exito: boolean;
  mensaje?: string;
  pedido: OrderDetailPedido;
  cliente: OrderDetailCliente | null;
  productos: OrderDetailProducto[];
  metricas: OrderDetailMetricas;
}
