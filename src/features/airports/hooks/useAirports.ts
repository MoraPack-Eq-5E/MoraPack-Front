/**
 * Hook para obtener todos los aeropuertos
 */

import { useQuery } from '@tanstack/react-query';
import { fetchAirports } from '../services';
import type { Airport } from '@/types';

export function useAirports() {
  const query = useQuery<Airport[], Error>({
    queryKey: ['airports'],
    queryFn: fetchAirports,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });

  return {
    airports: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

