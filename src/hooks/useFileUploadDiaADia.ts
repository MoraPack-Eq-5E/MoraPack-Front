/**
 * useFileUploadDiaADia
 *
 * Hook para manejar la carga de archivos de pedidos en modo día a día.
 * Similar a useFileUpload pero específico para operación diaria.
 */

import { useState, useCallback } from 'react';
import {importOrdersDiaADia} from '@/services/dataImport.service';
import type { ImportResult } from '@/services/dataImport.service';

export interface FileUploadStateDiaADia {
  pedidos: {
    file: File | null;
    isUploading: boolean;
    result: ImportResult | null;
    error: string | null;
  };
}

export function useFileUploadDiaADia() {
  const [state, setState] = useState<FileUploadStateDiaADia>({
    pedidos: {
      file: null,
      isUploading: false,
      result: null,
      error: null,
    },
  });

  // Establecer archivos de pedidos
  const setPedidosFiles = useCallback((file: File | null) => {
    setState((prev) => ({
      ...prev,
      pedidos: {
        ...prev.pedidos,
        file,
        result: null,
        error: null,
      },
    }));
  }, []);

  // Subir archivo de pedidos
  const uploadPedidos = useCallback(async () => {
    if (!state.pedidos.file) {
      setState((prev) => ({
        ...prev,
        pedidos: {
          ...prev.pedidos,
          error: 'No hay archivo de pedidos seleccionado',
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

      // Formatear fechas en formato LocalDateTime sin Z (yyyy-MM-ddTHH:mm:ss)
      const formatLocalDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const horaInicio = formatLocalDateTime(now);
      const horaFin = formatLocalDateTime(tomorrow);

      console.log('[useFileUploadDiaADia] Cargando pedido:', {
        filename: state.pedidos.file.name,
        horaInicio,
        horaFin,
      });

      const result = await importOrdersDiaADia(
        state.pedidos.file,
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
  }, [state.pedidos.file]);

  // Limpiar todo
  const clearAll = useCallback(() => {
    setState({
      pedidos: {
        file: null,
        isUploading: false,
        result: null,
        error: null,
      },
    });
  }, []);

  // Verificar si todos los archivos están cargados exitosamente
  const allUploaded = state.pedidos.result?.success === true;

  // Verificar si hay alguna carga en progreso
  const isUploading = state.pedidos.isUploading;

  // Obtener total de archivos
  const totalFiles = state.pedidos.file ? 1 : 0;

  return {
    state,
    setPedidosFiles,
    uploadPedidos,
    clearAll,
    allUploaded,
    isUploading,
    totalFiles,
  };
}

