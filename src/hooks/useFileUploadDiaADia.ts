/**
 * useFileUploadDiaADia
 *
 * Hook para manejar la carga de archivos de pedidos en modo día a día.
 * Similar a useFileUpload pero específico para operación diaria.
 */

import { useState, useCallback } from 'react';
import { importOrdersDiaADia, type ImportResult } from '@/services/dataImport.service';

export interface FileUploadStateDiaADia {
  pedidos: {
    files: File[];
    isUploading: boolean;
    result: ImportResult | null;
    error: string | null;
  };
}

export function useFileUploadDiaADia() {
  const [state, setState] = useState<FileUploadStateDiaADia>({
    pedidos: {
      files: [],
      isUploading: false,
      result: null,
      error: null,
    },
  });

  // Establecer archivos de pedidos
  const setPedidosFiles = useCallback((files: File[]) => {
    setState((prev) => ({
      ...prev,
      pedidos: {
        ...prev.pedidos,
        files,
        result: null,
        error: null,
      },
    }));
  }, []);

  // Subir archivos de pedidos
  const uploadPedidos = useCallback(async () => {
    if (state.pedidos.files.length === 0) {
      setState((prev) => ({
        ...prev,
        pedidos: {
          ...prev.pedidos,
          error: 'No hay archivos de pedidos seleccionados',
        },
      }));
      return null;
    }

    setState((prev) => ({
      ...prev,
      pedidos: {
        ...prev.pedidos,
        isUploading: true,
        error: null,
      },
    }));

    try {
      // Calcular hora inicio (ahora) y hora fin (mañana a las 00:00)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const horaInicio = now.toISOString();
      const horaFin = tomorrow.toISOString();

      console.log('[useFileUploadDiaADia] Cargando pedidos:', {
        files: state.pedidos.files.length,
        horaInicio,
        horaFin,
      });

      const result = await importOrdersDiaADia(
        state.pedidos.files,
        horaInicio,
        horaFin
      );

      setState((prev) => ({
        ...prev,
        pedidos: {
          ...prev.pedidos,
          isUploading: false,
          result,
          error: null,
        },
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      setState((prev) => ({
        ...prev,
        pedidos: {
          ...prev.pedidos,
          isUploading: false,
          error: errorMessage,
        },
      }));

      return null;
    }
  }, [state.pedidos.files]);

  // Limpiar todo
  const clearAll = useCallback(() => {
    setState({
      pedidos: {
        files: [],
        isUploading: false,
        result: null,
        error: null,
      },
    });
  }, []);

  // Remover archivo de pedidos por índice
  const removePedidosFile = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      pedidos: {
        ...prev.pedidos,
        files: prev.pedidos.files.filter((_, i) => i !== index),
        result: null,
        error: null,
      },
    }));
  }, []);

  // Verificar si todos los archivos están cargados exitosamente
  const allUploaded = state.pedidos.result?.success === true;

  // Verificar si hay alguna carga en progreso
  const isUploading = state.pedidos.isUploading;

  // Obtener total de archivos
  const totalFiles = state.pedidos.files.length;

  return {
    state,
    setPedidosFiles,
    uploadPedidos,
    clearAll,
    removePedidosFile,
    allUploaded,
    isUploading,
    totalFiles,
  };
}

