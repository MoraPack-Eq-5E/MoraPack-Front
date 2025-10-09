import { useState, useEffect } from 'react';
import { type Sede } from '@/types';

/**
 * Hook para obtener las sedes disponibles
 * TODO: Reemplazar con llamada API real cuando esté disponible
 */
export function useSedes() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSedes = async () => {
      try {
        setIsLoading(true);
        
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        // Mock data - sedes disponibles
        const mockSedes: Sede[] = [
          { id: 'lima', name: 'Lima' },
          { id: 'bogota', name: 'Bogotá' },
          { id: 'santiago', name: 'Santiago' },
          { id: 'brasilia', name: 'Brasília' },
        ];
        
        setSedes(mockSedes);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSedes();
  }, []);

  return { sedes, isLoading, error };
}

