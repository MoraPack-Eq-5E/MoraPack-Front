import { useState, useEffect } from 'react';
import { type DeliveryChartData } from '@/types';

/**
 * Hook para obtener los datos del gráfico de entregas
 * TODO: Reemplazar con llamada API real cuando esté disponible
 */
export function useDeliveryChartData() {
  const [data, setData] = useState<DeliveryChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Mock data - últimos 7 días
        const mockData: DeliveryChartData[] = [
          { day: 'Lun', packages: 3100 },
          { day: 'Mar', packages: 3400 },
          { day: 'Mié', packages: 2600 },
          { day: 'Jue', packages: 3800 },
          { day: 'Vie', packages: 4800 },
          { day: 'Sáb', packages: 2000 },
          { day: 'Dom', packages: 2300 },
        ];
        
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

