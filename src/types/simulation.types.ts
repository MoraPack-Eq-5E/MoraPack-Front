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

export interface SimulationEvent {
  id: string;
  type: 'FLIGHT_DEPARTURE' | 'FLIGHT_ARRIVAL' | 'ORDER_DELIVERED' | 
        'WAREHOUSE_WARNING' | 'WAREHOUSE_CRITICAL' | 'WAREHOUSE_FULL' | 
        'SLA_RISK' | 'INFO';
  message: string;
  simulatedTime: string;
  realTime: string;
  relatedFlightId?: number;
  relatedOrderId?: number;
  relatedAirportCode?: string;
}

export interface StartVisualizationRequest {
  timeScale?: number;
  autoStart?: boolean;
}

export interface SimulationControlRequest {
  action: 'pause' | 'resume' | 'stop' | 'setSpeed';
  newSpeed?: number;
}

export interface StartSimulationRequest {
  diasSimulacion?: number;
  tiempoLimiteSegundos?: number;
  iteracionesAlns?: number;
  habilitarUnitizacion?: boolean;
  modoDebug?: boolean;
  factorAceleracion?: number;
  autoStartVisualization?: boolean;
}

export interface SimulationInitResponse {
  simulacionId: number;
  mensaje: string;
  estado: string;
}

