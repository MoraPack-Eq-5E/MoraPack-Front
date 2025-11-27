/**
 * Tipos para la funcionalidad de carga de archivos de simulación
 */

/**
 * Tipo de archivo de simulación
 */

export const SimulationFileType = {
  AEROPUERTOS: 'AEROPUERTOS',
  VUELOS: 'VUELOS',
  PEDIDOS: 'PEDIDOS',
  CANCELACIONES: 'CANCELACIONES',
} as const;

export type SimulationFileType = typeof SimulationFileType[keyof typeof SimulationFileType];



/**
 * Resultado de validación para un archivo individual
 */
export interface FileValidationResult {
  /** Indica si el archivo pasó la validación */
  success: boolean;
  
  /** Tipo de archivo validado */
  fileType: SimulationFileType;
  
  /** Mensajes de error (si los hay) */
  errors?: string[];
  
  /** Mensajes de advertencia (si los hay) */
  warnings?: string[];
  
  /** Cantidad de registros parseados exitosamente */
  parsedCount?: number;
  
  /** Información adicional sobre el archivo */
  info?: string;
}

/**
 * Respuesta de validación para archivos de simulación
 */
export interface FileUploadValidationResponse {
  /** ID de sesión único para identificar los datos temporales */
  sessionId?: string;
  
  /** Indica si la validación general fue exitosa */
  success: boolean;
  
  /** Resultado de validación para aeropuertos.txt */
  aeropuertos?: FileValidationResult;
  
  /** Resultado de validación para vuelos.txt */
  vuelos?: FileValidationResult;
  
  /** Resultado de validación para pedidos.txt */
  pedidos?: FileValidationResult;
  /** Resultado de validación para cancelaciones.txt */
  cancelaciones?: FileValidationResult;

  /** Mensaje general sobre el resultado */
  message?: string;
  
  /** Indica si se usarán datos de la base de datos como fallback */
  usingDatabaseFallback: boolean;
}

/**
 * Estado de un archivo individual en el componente de upload
 */
export interface UploadedFile {
  /** Archivo File del navegador */
  file: File;
  
  /** Tipo de archivo */
  type: SimulationFileType;
  
  /** Resultado de validación (si ya se validó) */
  validationResult?: FileValidationResult;
}

/**
 * Estado de los archivos subidos
 */
export interface UploadFilesState {
  /** Archivo de aeropuertos */
  aeropuertos?: UploadedFile;
  
  /** Archivo de vuelos */
  vuelos?: UploadedFile;
  
  /** Archivo de pedidos */
  pedidos?: UploadedFile[];

  /** Archivo de cancelaciones */
  cancelaciones?: UploadedFile;
  
  /** ID de sesión después de validación exitosa */
  sessionId?: string;
  
  /** Indica si los archivos están siendo validados */
  isValidating: boolean;
  
  /** Resultado de la validación */
  validationResponse?: FileUploadValidationResponse;
}

