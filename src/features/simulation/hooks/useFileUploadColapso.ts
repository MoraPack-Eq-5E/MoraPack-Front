import { useState } from 'react';
import { validateFileSize, validateFileType } from '@/services/fileUpload.service';
import { SimulationFileType } from '@/types/fileUpload.types';
import type { UploadFilesState, FileUploadValidationResponse } from '@/types/fileUpload.types';

// Simulamos el servicio que llamarás en el backend
// Este servicio NO debe guardar en la BD, solo validar y mantener en RAM
import { validarEstructuraVolatil } from '@/services/dataImport.service'; 

export function useFileUploadColapso() {
  const [filesState, setFilesState] = useState<UploadFilesState>({
    isValidating: false,
    pedidos: [],
    sessionId: undefined, // Aseguramos que esté aquí
  });
  const [clientErrors, setClientErrors] = useState<string[]>([]);

  const addFile = (file: File | File[], type: SimulationFileType) => {
    const files = Array.isArray(file) ? file : [file];
    const errors: string[] = [];
    
    files.forEach((f) => {
      const sizeVal = validateFileSize(f);
      const typeVal = validateFileType(f);
      if (!sizeVal.valid) errors.push(`${f.name}: ${sizeVal.error}`);
      if (!typeVal.valid) errors.push(`${f.name}: ${typeVal.error}`);
    });

    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }

    setFilesState(prev => ({
      ...prev,
      [type === SimulationFileType.PEDIDOS ? 'pedidos' : 'cancelaciones']: 
        type === SimulationFileType.PEDIDOS ? [...(prev.pedidos || []), ...files] : files[0]
    }));
    setClientErrors([]);
  };
  // NUEVA: Función para eliminar archivos
  const removeFile = (type: SimulationFileType, index?: number) => {
    setFilesState(prev => {
      if (type === SimulationFileType.PEDIDOS) {
        const newPedidos = [...(prev.pedidos || [])];
        if (index !== undefined) newPedidos.splice(index, 1);
        return { ...prev, pedidos: newPedidos };
      } else {
        return { ...prev, cancelaciones: undefined };
      }
    });
  };
  const validateAll = async (): Promise<FileUploadValidationResponse | null> => {
    if (!filesState.pedidos || filesState.pedidos.length === 0) {
      setClientErrors(['Es necesario subir al menos un archivo de pedidos.']);
      return null;
    }

    setFilesState(prev => ({ ...prev, isValidating: true }));

    try {
      // LLAMADA AL BACKEND: Enviamos los archivos para validación RAM
      // El backend debe responder con un sessionId pero NO guardar en DB
      const response = await validarEstructuraVolatil(
        filesState.pedidos as unknown as File[], 
        filesState.cancelaciones as File | undefined
      );
      // GUARDAMOS EL ID DE SESIÓN
      setFilesState(prev => ({
        ...prev,
        isValidating: false,
        validationResponse: response,
        sessionId: response.sessionId // Este ID identifica la carga en la RAM del backend
      }));

      return response;
    } catch (error) {
      setFilesState(prev => ({ ...prev, isValidating: false }));
      setClientErrors(['Error en la comunicación con el servidor de validación.']);
      return null;
    }
  };

  const clearAll = () => {
    // CORRECCIÓN: Limpiar TODO el estado, no solo pedidos
    setFilesState({ 
        isValidating: false, 
        pedidos: [], 
        cancelaciones: undefined,
        sessionId: undefined,
        validationResponse: undefined
    });
    setClientErrors([]);
  };

  const hasFiles = Boolean(filesState.pedidos && filesState.pedidos.length > 0);
  const isValidated = Boolean(filesState.validationResponse?.success && filesState.sessionId);

  return {
    filesState,
    clientErrors,
    addFile,
    removeFile,
    validateAll,
    clearAll,
    hasFiles,
    isValidated
  };
}