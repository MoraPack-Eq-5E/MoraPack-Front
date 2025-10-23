/**
 * Type Definitions
 * 
 * Esta carpeta contiene todas las definiciones de tipos e interfaces
 * globales de TypeScript para el proyecto.
 */

// Tipos de autenticación
export { 
  type LoginCredentials,
  type RegisterCredentials,
  type User, 
  type AuthResponse, 
  type AuthError, 
  type AuthState 
} from './auth.types';

// Tipos de mapa
export {
  type Aeropuerto,
  type Vuelo,
  type EstadoVuelo,
  type MapMode
} from './map.types';

// Tipos de dashboard
export {
  type DashboardMetrics,
  type FlightStatus,
  type FlightSchedule,
  type AlertType,
  type Alert,
  type DeliveryChartData,
  type CapacityData,
  type Sede
} from './dashboard.types';

// Tipos de API
// export type { Report, Service, Community, Membership } from './api';

// Tipos de UI
// export type { Theme, ColorScheme } from './ui';

// Tipos de utilidades
// export type { Nullable, AsyncState } from './utils';

