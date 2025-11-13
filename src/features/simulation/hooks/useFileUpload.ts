import { useState } from 'react';
import { importAirports, importFlights, importOrders, importOrdersBatch } from '@/services/dataImport.service';
import { validateFileSize, validateFileType } from '@/services/fileUpload.service';
import { SimulationFileType } from '@/types/fileUpload.types';
import type {
  UploadFilesState,
  UploadedFile,
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
   * Añade un archivo (o múltiples si es PEDIDOS)
   */
  const addFile = (file: File | File[], type: SimulationFileType) => {
    const files = Array.isArray(file) ? file : [file];
    
    // Validar todos los archivos en el cliente
    const errors: string[] = [];
    files.forEach((f) => {
      const sizeValidation = validateFileSize(f);
      const typeValidation = validateFileType(f);
      
      if (!sizeValidation.valid) errors.push(`${f.name}: ${sizeValidation.error}`);
      if (!typeValidation.valid) errors.push(`${f.name}: ${typeValidation.error}`);
    });
    
    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }
    
    // Limpiar errores previos
    setClientErrors([]);
    
    if (type === SimulationFileType.PEDIDOS) {
      // Para pedidos, mantener array
      const uploadedFiles: UploadedFile[] = files.map(f => ({
        file: f,
        type,
      }));
      
      setFilesState((prev) => ({
        ...prev,
        pedidos: [...(prev.pedidos || []), ...uploadedFiles],
        // Limpiar validación previa
        validationResponse: undefined,
        sessionId: undefined,
      }));
    } else {
      // Para aeropuertos y vuelos, mantener archivo único
      const uploadedFile: UploadedFile = {
        file: files[0],
        type,
      };
      
      setFilesState((prev) => ({
        ...prev,
        [type.toLowerCase()]: uploadedFile,
        // Limpiar validación previa
        validationResponse: undefined,
        sessionId: undefined,
      }));
    }
  };
  
  /**
   * Elimina un archivo
   */
  const removeFile = (type: SimulationFileType) => {
    setFilesState((prev) => {
      const newState = { ...prev };
      delete newState[type.toLowerCase() as keyof UploadFilesState];
      // Limpiar validación si se eliminan todos los archivos
      if (!newState.aeropuertos && !newState.vuelos && (!newState.pedidos || newState.pedidos.length === 0)) {
        newState.validationResponse = undefined;
        newState.sessionId = undefined;
      }
      return newState;
    });
    setClientErrors([]);
  };
  
  /**
   * Elimina un archivo de pedidos por índice
   */
  const removeFileByIndex = (index: number) => {
    setFilesState((prev) => {
      const newPedidos = [...(prev.pedidos || [])];
      newPedidos.splice(index, 1);
      
      const newState = { ...prev, pedidos: newPedidos.length > 0 ? newPedidos : undefined };
      
      // Limpiar validación si se eliminan todos los archivos
      if (!newState.aeropuertos && !newState.vuelos && (!newState.pedidos || newState.pedidos.length === 0)) {
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
    modoSimulacion: string,
    horaInicio?: string, 
    horaFin?: string,
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
      if (filesState.pedidos && filesState.pedidos.length > 0) {
        const pedidosFiles = filesState.pedidos.map(p => p.file);
        
        if (pedidosFiles.length === 1) {
          // Un solo archivo: usar importación simple
          const ordersResult = await importOrders(pedidosFiles[0], modoSimulacion, horaInicio, horaFin);
          if (!ordersResult.success) {
            throw new Error(`Error al importar pedidos: ${ordersResult.message}`);
          }
          let message = `✓ ${ordersResult.count} pedidos importados`;
          if (horaInicio && horaFin) {
            message += ` (filtrados por ventana de tiempo)`;
          }
          results.push(message);
        } else {
          // Múltiples archivos: usar importación batch
          const batchResult = await importOrdersBatch(pedidosFiles, modoSimulacion,horaInicio, horaFin);
          if (!batchResult.success) {
            throw new Error(`Error al importar pedidos en batch: ${batchResult.message}`);
          }
          let message = `✓ ${batchResult.totalOrders} pedidos importados de ${batchResult.filesProcessed}/${batchResult.totalFiles} archivos`;
          if (horaInicio && horaFin) {
            message += ` (filtrados por ventana de tiempo)`;
          }
          results.push(message);
          
          // Añadir detalles por archivo
          if (batchResult.fileResults) {
            batchResult.fileResults.forEach((fileResult) => {
              if (fileResult.success) {
                results.push(`  - ${fileResult.filename}: ${fileResult.orders} pedidos`);
              } else {
                results.push(`  - ${fileResult.filename}: ERROR - ${fileResult.error}`);
              }
            });
          }
        }
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
    filesState.aeropuertos || filesState.vuelos || (filesState.pedidos && filesState.pedidos.length > 0)
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
    removeFileByIndex,
    validateFiles,
    clearAll,
  };
}

