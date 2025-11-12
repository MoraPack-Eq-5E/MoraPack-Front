import { useState } from 'react';
import { importAirports, importFlights, importOrders, importCancellations } from '@/services/dataImport.service';
import { validateFileSize, validateFileType } from '@/services/fileUpload.service';
import type {
  UploadFilesState,
  UploadedFile,
  SimulationFileType,
  FileUploadValidationResponse,
} from '@/types/fileUpload.types';

/**
 * Hook para manejar la carga y validación de archivos de simulación
 */
export function useFileUpload() {
  const [filesState, setFilesState] = useState<UploadFilesState>({
    isValidating: false,
  });
  
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  
  /**
   * Añade un archivo
   */
  const addFile = (file: File, type: SimulationFileType) => {
    // Validar en el cliente
    const sizeValidation = validateFileSize(file);
    const typeValidation = validateFileType(file);
    
    const errors: string[] = [];
    if (!sizeValidation.valid) errors.push(sizeValidation.error!);
    if (!typeValidation.valid) errors.push(typeValidation.error!);
    
    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }
    
    // Limpiar errores previos
    setClientErrors([]);
    
    const uploadedFile: UploadedFile = {
      file,
      type,
    };
    
    setFilesState((prev) => ({
      ...prev,
      [type.toLowerCase()]: uploadedFile,
      // Limpiar validación previa
      validationResponse: undefined,
      sessionId: undefined,
    }));
  };
  
  /**
   * Elimina un archivo
   */
  const removeFile = (type: SimulationFileType) => {
    setFilesState((prev) => {
      const newState = { ...prev };
      delete newState[type.toLowerCase() as keyof UploadFilesState];
      // Limpiar validación si se eliminan todos los archivos
      if (!newState.aeropuertos && !newState.vuelos && !newState.pedidos && !newState.cancelaciones) {
        newState.validationResponse = undefined;
        newState.sessionId = undefined;
      }
      return newState;
    });
    setClientErrors([]);
  };
  
  /**
   * Valida e importa los archivos subidos secuencialmente a la BD
   * @param horaInicio Opcional: filtrar pedidos desde esta hora (ISO 8601)
   * @param horaFin Opcional: filtrar pedidos hasta esta hora (ISO 8601)
   */
  const validateFiles = async (
    horaInicio?: string, 
    horaFin?: string
  ): Promise<FileUploadValidationResponse | null> => {
    setFilesState((prev) => ({ ...prev, isValidating: true }));
    setClientErrors([]);
    
    try {
      const results: string[] = [];
      let totalCount = 0;
      
      // 1. Importar aeropuertos (primero, requerido para vuelos y pedidos)
      if (filesState.aeropuertos?.file) {
        const airportsResult = await importAirports(filesState.aeropuertos.file);
        if (!airportsResult.success) {
          throw new Error(`Error al importar aeropuertos: ${airportsResult.message}`);
        }
        results.push(`✓ ${airportsResult.count} aeropuertos importados`);
        totalCount += airportsResult.count || 0;
      }
      
      // 2. Importar vuelos (requiere aeropuertos)
      if (filesState.vuelos?.file) {
        const flightsResult = await importFlights(filesState.vuelos.file);
        if (!flightsResult.success) {
          throw new Error(`Error al importar vuelos: ${flightsResult.message}`);
        }
        results.push(`✓ ${flightsResult.count} vuelos importados`);
        totalCount += flightsResult.count || 0;
      }
      
      // 3. Importar pedidos (requiere aeropuertos) con filtrado opcional por tiempo
      if (filesState.pedidos?.file) {
        const ordersResult = await importOrders(filesState.pedidos.file, horaInicio, horaFin);
        if (!ordersResult.success) {
          throw new Error(`Error al importar pedidos: ${ordersResult.message}`);
        }
        let message = `✓ ${ordersResult.count} pedidos importados`;
        if (horaInicio && horaFin) {
          message += ` (filtrados por ventana de tiempo)`;
        }
        results.push(message);
      }

      // 4. Importar cancelaciones (opcional)
      if (filesState.cancelaciones?.file) {
        const cancResult = await importCancellations(filesState.cancelaciones.file);
        if (!cancResult.success) {
          throw new Error(`Error al importar cancelaciones: ${cancResult.message}`);
        }
        results.push(`✓ ${cancResult.count} cancelaciones importadas`);
        totalCount += cancResult.count || 0;
      }
      
      const response: FileUploadValidationResponse = {
        success: true,
        message: results.join('\n'),
        sessionId: 'imported', // Ya no usamos sessionId real, solo flag
        usingDatabaseFallback: false,
      };
      
      setFilesState((prev) => ({
        ...prev,
        isValidating: false,
        validationResponse: response,
        sessionId: 'imported',
      }));
      
      return response;
    } catch (error) {
      console.error('Error importing files:', error);
      setFilesState((prev) => ({ ...prev, isValidating: false }));
      setClientErrors([
        error instanceof Error ? error.message : 'Error desconocido al importar archivos',
      ]);
      return null;
    }
  };
  
  /**
   * Limpia todos los archivos y el estado
   */
  const clearAll = () => {
    setFilesState({
      isValidating: false,
    });
    setClientErrors([]);
  };
  
  /**
   * Verifica si hay archivos cargados
   */
  const hasFiles = Boolean(
    filesState.aeropuertos || filesState.vuelos || filesState.pedidos || filesState.cancelaciones
  );
  
  /**
   * Verifica si la validación fue exitosa
   */
  const isValidated = Boolean(
    filesState.validationResponse?.success && filesState.sessionId
  );
  
  return {
    // Estado
    filesState,
    clientErrors,
    hasFiles,
    isValidated,
    
    // Acciones
    addFile,
    removeFile,
    validateFiles,
    clearAll,
  };
}

