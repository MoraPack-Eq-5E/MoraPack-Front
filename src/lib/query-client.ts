/**
 * TanStack Query Client Configuration
 * Configuración del cliente de React Query
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración predeterminada para queries
 */
const defaultQueryOptions = {
  queries: {
    staleTime: 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

/**
 * Cliente de Query para toda la aplicación
 */
export const queryClient = new QueryClient({
  defaultOptions: defaultQueryOptions,
});

