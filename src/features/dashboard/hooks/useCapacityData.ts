import { useState, useEffect } from 'react';
import { type CapacityData } from '@/types';

/**
 * Hook para obtener los datos de capacidad operativa
 * TODO: Reemplazar con llamada API real cuando esté disponible
 */
export function useCapacityData() {
  const [data, setData] = useState<CapacityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Mock data
        const mockData: CapacityData = {
          flightsCapacity: 85,
          warehouseCapacity: 70,
        };
        
        setData(mockData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading, error };
}

