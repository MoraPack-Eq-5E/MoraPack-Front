import { useState, useEffect } from 'react';
import { type DashboardMetrics } from '@/types';

/**
 * Hook para obtener las métricas principales del dashboard
 * TODO: Reemplazar con llamada API real cuando esté disponible
 */
export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simular carga de datos
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        
        // Simular delay de API
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Mock data
        const mockMetrics: DashboardMetrics = {
          activeFlights: 1234,
          inWarehouse: 776,
          slaCompliance: 92,
          delayedPackages: 25,
          changes: {
            activeFlights: 5,
            inWarehouse: -1,
            slaCompliance: -3,
            delayedPackages: 10,
          },
        };
        
        setMetrics(mockMetrics);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, isLoading, error };
}

