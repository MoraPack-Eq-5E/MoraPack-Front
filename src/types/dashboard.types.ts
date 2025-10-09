/**
 * Dashboard Types
 * 
 * Tipos para el dashboard principal de la aplicación.
 */

/**
 * Métricas principales del dashboard
 */
export interface DashboardMetrics {
  activeFlights: number;
  inWarehouse: number;
  slaCompliance: number;
  delayedPackages: number;
  changes: {
    activeFlights: number;
    inWarehouse: number;
    slaCompliance: number;
    delayedPackages: number;
  };
}

/**
 * Estado de un vuelo
 */
export type FlightStatus = 'retrasado' | 'programado';

/**
 * Información de un vuelo programado
 */
export interface FlightSchedule {
  id: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  route: string;
  status: FlightStatus;
  capacityUsed: number;
  totalCapacity: number;
  stops: string;
  delays: string;
  impactOnDeliveries: string;
}

/**
 * Tipo de alerta
 */
export type AlertType = 'error' | 'warning' | 'info';

/**
 * Alerta del sistema
 */
export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

/**
 * Datos del gráfico de paquetes entregados
 */
export interface DeliveryChartData {
  day: string;
  packages: number;
}

/**
 * Datos de capacidad operativa
 */
export interface CapacityData {
  flightsCapacity: number;
  warehouseCapacity: number;
}

/**
 * Sede disponible
 */
export interface Sede {
  id: string;
  name: string;
}

