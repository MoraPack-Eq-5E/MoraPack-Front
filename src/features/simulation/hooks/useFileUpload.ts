import { useState } from 'react';
import { validateSimulationFiles, validateFileSize, validateFileType } from '@/services/fileUpload.service';
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
    usingDatabaseFallback: false,
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
      if (!newState.aeropuertos && !newState.vuelos && !newState.pedidos) {
        newState.validationResponse = undefined;
        newState.sessionId = undefined;
      }
      return newState;
    });
    setClientErrors([]);
  };
  
  /**
   * Valida los archivos subidos
   */
  const validateFiles = async (): Promise<FileUploadValidationResponse | null> => {
    setFilesState((prev) => ({ ...prev, isValidating: true }));
    setClientErrors([]);
    
    try {
      const response = await validateSimulationFiles(
        filesState.aeropuertos?.file,
        filesState.vuelos?.file,
        filesState.pedidos?.file
      );
      
      setFilesState((prev) => ({
        ...prev,
        isValidating: false,
        validationResponse: response,
        sessionId: response.sessionId,
      }));
      
      return response;
    } catch (error) {
      console.error('Error validating files:', error);
      setFilesState((prev) => ({ ...prev, isValidating: false }));
      setClientErrors([
        error instanceof Error ? error.message : 'Error desconocido al validar archivos',
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
    filesState.aeropuertos || filesState.vuelos || filesState.pedidos
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

