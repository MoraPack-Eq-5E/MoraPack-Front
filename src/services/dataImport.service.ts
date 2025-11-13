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

  // ⚙️ Todo va en el mismo cuerpo form-data
  if (horaInicio) formData.append('horaInicio', horaInicio);
  if (horaFin) formData.append('horaFin', horaFin);
  if (modo) formData.append('modo', modo);

  try {
    const response = await fetch(`${API_URL}/api/data-import/orders`, {
      method: 'POST',
      body: formData,
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

