/**
 * File Upload Store - Zustand
 * 
 * Store global para mantener el estado de la subida de archivos.
 * Permite que la importación continúe en background cuando el usuario
 * navega a otras páginas.
 */

import { create } from 'zustand';
import { importAirports, importFlights, importOrders, importOrdersBatch, importCancellations, limpiarDataPrueba } from '@/services/dataImport.service';
import { validateFileSize, validateFileType } from '@/services/fileUpload.service';
import { SimulationFileType } from '@/types/fileUpload.types';
import type {
  UploadFilesState,
  UploadedFile,
  FileUploadValidationResponse,
} from '@/types/fileUpload.types';

interface FileUploadStoreState {
  filesState: UploadFilesState;
  clientErrors: string[];
  
  // Estado de importación en progreso
  importProgress: {
    isImporting: boolean;
    currentStep: string;
    completedSteps: string[];
    error: string | null;
  };
}

interface FileUploadStoreActions {
  // Acciones de archivos
  addFile: (file: File | File[], type: SimulationFileType) => void;
  removeFile: (type: SimulationFileType) => void;
  removeFileByIndex: (index: number) => void;
  
  // Validación e importación
  validateFiles: (
    modoSimulacion: string,
    horaInicio?: string,
    horaFin?: string,
  ) => Promise<FileUploadValidationResponse | null>;
  
  // Limpieza
  clearAll: () => Promise<{ success: boolean; message?: string } | null>;
  clearErrors: () => void;
  
  // Getters
  hasFiles: () => boolean;
  isValidated: () => boolean;
}

const initialState: FileUploadStoreState = {
  filesState: {
    isValidating: false,
  },
  clientErrors: [],
  importProgress: {
    isImporting: false,
    currentStep: '',
    completedSteps: [],
    error: null,
  },
};

export const useFileUploadStore = create<FileUploadStoreState & FileUploadStoreActions>((set, get) => ({
  ...initialState,
  
  addFile: (file, type) => {
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
      set({ clientErrors: errors });
      return;
    }
    
    // Limpiar errores previos
    set({ clientErrors: [] });
    
    if (type === SimulationFileType.PEDIDOS) {
      const uploadedFiles: UploadedFile[] = files.map(f => ({
        file: f,
        type,
      }));
      
      set((state) => ({
        filesState: {
          ...state.filesState,
          pedidos: [...(state.filesState.pedidos || []), ...uploadedFiles],
          validationResponse: undefined,
          sessionId: undefined,
        },
      }));
    } else {
      const uploadedFile: UploadedFile = {
        file: files[0],
        type,
      };
      
      set((state) => ({
        filesState: {
          ...state.filesState,
          [type.toLowerCase()]: uploadedFile,
          validationResponse: undefined,
          sessionId: undefined,
        },
      }));
    }
  },
  
  removeFile: (type) => {
    set((state) => {
      const newFilesState = { ...state.filesState };
      delete newFilesState[type.toLowerCase() as keyof UploadFilesState];
      
      if (!newFilesState.aeropuertos && !newFilesState.vuelos && 
          (!newFilesState.pedidos || newFilesState.pedidos.length === 0) &&
          !newFilesState.cancelaciones) {
        newFilesState.validationResponse = undefined;
        newFilesState.sessionId = undefined;
      }
      
      return { 
        filesState: newFilesState, 
        clientErrors: [] 
      };
    });
  },
  
  removeFileByIndex: (index) => {
    set((state) => {
      const newPedidos = [...(state.filesState.pedidos || [])];
      newPedidos.splice(index, 1);
      
      const newFilesState = { 
        ...state.filesState, 
        pedidos: newPedidos.length > 0 ? newPedidos : undefined 
      };
      
      if (!newFilesState.aeropuertos && !newFilesState.vuelos && 
          (!newFilesState.pedidos || newFilesState.pedidos.length === 0) &&
          !newFilesState.cancelaciones) {
        newFilesState.validationResponse = undefined;
        newFilesState.sessionId = undefined;
      }
      
      return { 
        filesState: newFilesState, 
        clientErrors: [] 
      };
    });
  },
  
  validateFiles: async (modoSimulacion, horaInicio, horaFin) => {
    const state = get();
    
    set((s) => ({ 
      filesState: { ...s.filesState, isValidating: true },
      clientErrors: [],
      importProgress: {
        isImporting: true,
        currentStep: 'Limpiando base de datos...',
        completedSteps: [],
        error: null,
      },
    }));
    
    try {
      // 🧹 LIMPIAR SIEMPRE LA BD AL INICIAR UNA IMPORTACIÓN
      const clear = await limpiarDataPrueba();
      if (!clear.success) {
        throw new Error(`Error limpiando BD: ${clear.message}`);
      }
      
      const results: string[] = [];
      const completedSteps: string[] = ['Limpieza de BD'];
      
      set((s) => ({
        importProgress: { ...s.importProgress, completedSteps, currentStep: 'Importando aeropuertos...' }
      }));

      // 1. Importar aeropuertos
      if (state.filesState.aeropuertos?.file) {
        const airportsResult = await importAirports(state.filesState.aeropuertos.file);
        if (!airportsResult.success) {
          throw new Error(`Error al importar aeropuertos: ${airportsResult.message}`);
        }
        const airportsMsg = `✓ ${airportsResult.count} aeropuertos importados${airportsResult.count === 0 ? ' (Son los mismos que los de la base de datos)' : ''}`;
        results.push(airportsMsg);
        completedSteps.push('Aeropuertos');
      }
      
      set((s) => ({
        importProgress: { ...s.importProgress, completedSteps: [...completedSteps], currentStep: 'Importando vuelos...' }
      }));
      
      // 2. Importar vuelos
      if (state.filesState.vuelos?.file) {
        const flightsResult = await importFlights(state.filesState.vuelos.file);
        if (!flightsResult.success) {
          throw new Error(`Error al importar vuelos: ${flightsResult.message}`);
        }
        const flightsMsg = `✓ ${flightsResult.count} vuelos importados${flightsResult.count === 0 ? ' (Son los mismos que los de la base de datos)' : ''}`;
        results.push(flightsMsg);
        completedSteps.push('Vuelos');
      }
      
      set((s) => ({
        importProgress: { ...s.importProgress, completedSteps: [...completedSteps], currentStep: 'Importando pedidos...' }
      }));
      
      // 3. Importar pedidos
      if (state.filesState.pedidos && state.filesState.pedidos.length > 0) {
        const pedidosFiles = state.filesState.pedidos.map(p => p.file);
        
        if (pedidosFiles.length === 1) {
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
          const batchResult = await importOrdersBatch(pedidosFiles, modoSimulacion, horaInicio, horaFin);
          if (!batchResult.success) {
            throw new Error(`Error al importar pedidos en batch: ${batchResult.message}`);
          }
          let message = `✓ ${batchResult.totalOrders} pedidos importados de ${batchResult.filesProcessed}/${batchResult.totalFiles} archivos`;
          if (horaInicio && horaFin) {
            message += ` (filtrados por ventana de tiempo)`;
          }
          results.push(message);
          
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
        completedSteps.push('Pedidos');
      }

      set((s) => ({
        importProgress: { ...s.importProgress, completedSteps: [...completedSteps], currentStep: 'Importando cancelaciones...' }
      }));

      // 4. Importar cancelaciones
      if (state.filesState.cancelaciones?.file) {
        const cancResult = await importCancellations(state.filesState.cancelaciones.file);
        if (!cancResult.success) {
          throw new Error(`Error al importar cancelaciones: ${cancResult.message}`);
        }
        results.push(`✓ ${cancResult.count} cancelaciones importadas`);
        completedSteps.push('Cancelaciones');
      }

      const response: FileUploadValidationResponse = {
        success: true,
        message: results.join('\n'),
        sessionId: 'imported',
        usingDatabaseFallback: false,
      };
      
      set({
        filesState: {
          ...get().filesState,
          isValidating: false,
          validationResponse: response,
          sessionId: 'imported',
        },
        importProgress: {
          isImporting: false,
          currentStep: '¡Completado!',
          completedSteps,
          error: null,
        },
      });
      
      return response;
    } catch (error) {
      console.error('Error importing files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al importar archivos';
      
      set((s) => ({ 
        filesState: { ...s.filesState, isValidating: false },
        clientErrors: [errorMessage],
        importProgress: {
          ...s.importProgress,
          isImporting: false,
          currentStep: '',
          error: errorMessage,
        },
      }));
      
      return null;
    }
  },
  
  clearAll: async () => {
    set({
      filesState: { isValidating: false },
      clientErrors: [],
      importProgress: {
        isImporting: false,
        currentStep: '',
        completedSteps: [],
        error: null,
      },
    });

    try {
      const res = await limpiarDataPrueba();
      set({ filesState: { isValidating: false } });
      return res;
    } catch (error) {
      console.error('Error limpiando data de prueba:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
    }
  },
  
  clearErrors: () => {
    set({ clientErrors: [] });
  },
  
  hasFiles: () => {
    const { filesState } = get();
    return Boolean(
      filesState.aeropuertos || 
      filesState.vuelos || 
      (filesState.pedidos && filesState.pedidos.length > 0) || 
      filesState.cancelaciones
    );
  },
  
  isValidated: () => {
    const { filesState } = get();
    return Boolean(filesState.validationResponse?.success && filesState.sessionId);
  },
}));

