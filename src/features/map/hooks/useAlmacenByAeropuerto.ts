import { useQuery } from '@tanstack/react-query';
import { almacenService, type Almacen } from '@/services/almacen.service';

export function useAlmacenByAeropuerto(
  aeropuertoId: number,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery<Almacen | null>({
    queryKey: ['almacen', 'aeropuerto', aeropuertoId],
    queryFn: () => almacenService.obtenerPorAeropuerto(aeropuertoId),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 1000, // Por defecto cada segundo
    staleTime: 0, // Siempre considerar datos como stale para refetch
  });
}

export function useAlmacenes(options?: { enabled?: boolean }) {
  return useQuery<Almacen[]>({
    queryKey: ['almacenes'],
    queryFn: () => almacenService.listar(),
    enabled: options?.enabled ?? true,
  });
}

export function useEstadisticasAlmacenes(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: ['almacenes', 'estadisticas'],
    queryFn: () => almacenService.obtenerEstadisticas(),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
  });
}

