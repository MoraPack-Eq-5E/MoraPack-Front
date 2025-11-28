/**
 * Application Constants
 * 
 * Esta carpeta contiene constantes globales de la aplicación.
 */

// URLs y endpoints
export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || '/api';

// Configuración de la app
export const APP_NAME = 'MoraPack Admin';
export const APP_VERSION = '0.0.0';

// Límites y configuraciones
export const PAGINATION_LIMIT = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Mensajes de autenticación
export * from './messages';

// Layout constants
export * from './layout';

// Mensajes generales
export const MESSAGES = {
  ERROR: {
    GENERIC: 'Ha ocurrido un error. Por favor, intenta de nuevo.',
    NETWORK: 'Error de conexión. Verifica tu internet.',
    UNAUTHORIZED: 'No tienes permisos para esta acción.',
  },
  SUCCESS: {
    SAVED: 'Guardado exitosamente.',
    DELETED: 'Eliminado exitosamente.',
    UPDATED: 'Actualizado exitosamente.',
  },
} as const;

