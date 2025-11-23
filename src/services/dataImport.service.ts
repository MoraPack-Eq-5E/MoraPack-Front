/**
 * Servicio para importar datos desde archivos .txt
 * Sigue el patrón de MoraPack-Backend: cada archivo se sube y guarda en BD inmediatamente
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface ImportResult {
  success: boolean;
  message: string;
  count?: number;
  cities?: number;
  orders?: number;
  products?: number;
  error?: string;
}

/**
 * Importa aeropuertos desde archivo .txt
 * POST /api/data-import/airports
 * 
 * El archivo se procesa y guarda en BD inmediatamente
 * @param file Archivo aeropuertosinfo.txt
 * @returns Resultado de la importación con count de aeropuertos y ciudades
 */
export async function importAirports(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/api/data-import/airports`, {
      method: 'POST',
      body: formData,
    });

    const result: ImportResult = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Error importando aeropuertos');
    }

    return result;
  } catch (error) {
    console.error('Error importando aeropuertos:', error);
    throw error;
  }
}

/**
 * Importa vuelos desde archivo .txt
 * POST /api/data-import/flights
 * 
 * Requiere que existan aeropuertos en BD
 * El archivo se procesa y guarda en BD inmediatamente
 * @param file Archivo vuelos.txt
 * @returns Resultado de la importación con count de vuelos
 */
export async function importFlights(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/api/data-import/flights`, {
      method: 'POST',
      body: formData,
    });

    const result: ImportResult = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Error importando vuelos');
    }

    return result;
  } catch (error) {
    console.error('Error importando vuelos:', error);
    throw error;
  }
}

/**
 * Importa pedidos desde archivo .txt
 * POST /api/data-import/orders
 * 
 * Requiere que existan aeropuertos en BD
 * El archivo se procesa y guarda en BD inmediatamente
 * Opcionalmente filtra por ventana de tiempo
 * 
 * @param file Archivo pedidos.txt o _pedidos_{AIRPORT}_.txt
 * @param horaInicio Opcional: solo cargar pedidos después de esta hora (ISO 8601)
 * @param horaFin Opcional: solo cargar pedidos antes de esta hora (ISO 8601)
 * @returns Resultado de la importación con count de pedidos
 */
export async function importOrders(
  file: File, 
  modo: string,
  horaInicio?: string, 
  horaFin?: string,
): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  // ⚠️ CORREGIR: Enviar modo como query parameter, NO como form-data
  const queryParams = new URLSearchParams();
  queryParams.append('modo', modo); // ✅ Esto va en la URL
  if (horaInicio) queryParams.append('horaInicio', horaInicio);
  if (horaFin) queryParams.append('horaFin', horaFin);

  try {
    const response = await fetch(`${API_URL}/api/data-import/orders?${queryParams.toString()}`, {
      method: 'POST',
      body: formData, // Solo el archivo va en el body
    });

    const result: ImportResult = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Error importando pedidos');
    }

    return result;
  } catch (error) {
    console.error('Error importando pedidos:', error);
    throw error;
  }
}

export async function importCancellations(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/api/data-import/cancelaciones`, {
      method: 'POST',
      body: formData,
    });
    const result: ImportResult = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Error importando cancelaciones');
    }
    return result;
  } catch (error) {
    console.error('Error importando cancelaciones:', error);
    throw error;
  }
}

/**
 * Resultado detallado de batch import
 */
export interface FileImportResult {
  filename: string;
  success: boolean;
  orders?: number;
  error?: string;
  loaded?: number;
  filtered?: number;
}

export interface BatchImportResult {
  success: boolean;
  message: string;
  totalOrders: number;
  filesProcessed: number;
  totalFiles: number;
  filesWithErrors?: number;
  fileResults: FileImportResult[];
  errors?: string[];
}

/**
 * Importa múltiples archivos de pedidos en batch
 * POST /api/data-import/orders/batch
 * 
 * Requiere que existan aeropuertos en BD
 * Cada archivo se procesa con su propio aeropuerto de origen
 * 
 * @param files Array de archivos de pedidos (_pedidos_{AIRPORT}_.txt)
 * @param modo Modo de simulación: SEMANAL o COLAPSO
 * @param horaInicio Opcional: solo cargar pedidos después de esta hora (ISO 8601)
 * @param horaFin Opcional: solo cargar pedidos antes de esta hora (ISO 8601)
 * @returns Resultado detallado del batch import con información por archivo
 */
export async function importOrdersBatch(
  files: File[], 
  modo: string, // 🔥 AÑADIR este parámetro
  horaInicio?: string, 
  horaFin?: string
): Promise<BatchImportResult> {
  const formData = new FormData();
  
  // Añadir todos los archivos al FormData
  files.forEach((file) => {
    formData.append('files', file);
  });

  // Construir URL con parámetros opcionales
  const url = new URL(`${API_URL}/api/data-import/orders/batch`);
  url.searchParams.append('modo', modo); // ✅ Añadir modo
  if (horaInicio) {
    url.searchParams.append('horaInicio', horaInicio);
  }
  if (horaFin) {
    url.searchParams.append('horaFin', horaFin);
  }
  if (modo) {
    url.searchParams.append('modo', modo);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
    });

    const result: BatchImportResult = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Error importando pedidos en batch');
    }

    return result;
  } catch (error) {
    console.error('Error importando pedidos en batch:', error);
    throw error;
  }
}
export async function importCancellations(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/api/data-import/cancelaciones`, {
      method: 'POST',
      body: formData,
    });
    const result: ImportResult = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Error importando cancelaciones');
    }
    return result;
  } catch (error) {
    console.error('Error importando cancelaciones:', error);
    throw error;
  }
}

/**
 * Resultado detallado de batch import
 */
export interface FileImportResult {
  filename: string;
  success: boolean;
  orders?: number;
  error?: string;
  loaded?: number;
  filtered?: number;
}

export interface BatchImportResult {
  success: boolean;
  message: string;
  totalOrders: number;
  filesProcessed: number;
  totalFiles: number;
  filesWithErrors?: number;
  fileResults: FileImportResult[];
  errors?: string[];
}

/**
 * Importa múltiples archivos de pedidos en batch
 * POST /api/data-import/orders/batch
 * 
 * Requiere que existan aeropuertos en BD
 * Cada archivo se procesa con su propio aeropuerto de origen
 * 
 * @param files Array de archivos de pedidos (_pedidos_{AIRPORT}_.txt)
 * @param horaInicio Opcional: solo cargar pedidos después de esta hora (ISO 8601)
 * @param horaFin Opcional: solo cargar pedidos antes de esta hora (ISO 8601)
 * @returns Resultado detallado del batch import con información por archivo
 */
// export async function importOrdersBatch(
//   files: File[], 
//   horaInicio?: string, 
//   horaFin?: string
// ): Promise<BatchImportResult> {
//   const formData = new FormData();
  
//   // Añadir todos los archivos al FormData
//   files.forEach((file) => {
//     formData.append('files', file);
//   });

//   // Construir URL con parámetros opcionales
//   const url = new URL(`${API_URL}/api/data-import/orders/batch`);
//   if (horaInicio) {
//     url.searchParams.append('horaInicio', horaInicio);
//   }
//   if (horaFin) {
//     url.searchParams.append('horaFin', horaFin);
//   }

//   try {
//     const response = await fetch(url.toString(), {
//       method: 'POST',
//       body: formData,
//     });

//     const result: BatchImportResult = await response.json();
    
//     if (!response.ok) {
//       throw new Error(result.message || 'Error importando pedidos en batch');
//     }

//     return result;
//   } catch (error) {
//     console.error('Error importando pedidos en batch:', error);
//     throw error;
//   }
// }

/**
 * Obtiene el estado de los endpoints de importación
 * GET /api/data-import/status
 */
export async function getImportStatus(): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${API_URL}/api/data-import/status`);
    return await response.json();
  } catch (error) {
    console.error('Error obteniendo estado de importación:', error);
    throw error;
  }
}

export async function limpiarDataPrueba(): Promise<ImportResult> {
  try {
    const response = await fetch(`${API_URL}/api/data-import/clear-DataPrueba`, {
      method: 'DELETE',
    });

    const result: ImportResult = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Error limpiando base de datos');
    }

    return result;
  } catch (error) {
    console.error('Error limpiando base de datos:', error);
    throw error;
  }
}
