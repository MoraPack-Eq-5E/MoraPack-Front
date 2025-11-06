/**
 * Servicio para carga y validación de archivos de simulación
 */

import type { FileUploadValidationResponse } from '@/types/fileUpload.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Valida archivos de simulación
 * @param aeropuertos Archivo aeropuertosinfo.txt (opcional)
 * @param vuelos Archivo vuelos.txt (opcional)
 * @param pedidos Archivo pedidos.txt (opcional)
 * @returns Respuesta de validación con sessionId si fue exitosa
 */
export async function validateSimulationFiles(
  aeropuertos?: File,
  vuelos?: File,
  pedidos?: File
): Promise<FileUploadValidationResponse> {
  // Crear FormData
  const formData = new FormData();
  
  if (aeropuertos) {
    formData.append('aeropuertos', aeropuertos);
  }
  
  if (vuelos) {
    formData.append('vuelos', vuelos);
  }
  
  if (pedidos) {
    formData.append('pedidos', pedidos);
  }
  
  // Si no hay archivos, retornar respuesta simulada
  if (!aeropuertos && !vuelos && !pedidos) {
    return {
      success: true,
      message: 'No se proporcionaron archivos. Se usarán los datos de la base de datos.',
      usingDatabaseFallback: true,
    };
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/simulacion/upload/validate`, {
      method: 'POST',
      body: formData,
    });
    
    const data: FileUploadValidationResponse = await response.json();
    
    if (!response.ok) {
      // Si el servidor devolvió error, pero tenemos data, usarla
      if (data) {
        return data;
      }
      throw new Error(
        data?.message || `Error al validar archivos: ${response.statusText}`
      );
    }
    
    return data;
  } catch (error) {
    console.error('Error validating files:', error);
    throw error;
  }
}

/**
 * Verifica si un archivo es de tipo .txt
 */
export function isTextFile(file: File): boolean {
  return file.name.endsWith('.txt') || file.type === 'text/plain';
}

/**
 * Valida el tamaño del archivo (máx 10MB)
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `El archivo ${file.name} es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)} MB). Tamaño máximo: 10 MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Valida el tipo de archivo (.txt)
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  if (!isTextFile(file)) {
    return {
      valid: false,
      error: `El archivo ${file.name} no es un archivo de texto (.txt)`,
    };
  }
  
  return { valid: true };
}

