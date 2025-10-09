import { useState, useEffect } from 'react';
import { type Alert } from '@/types';

/**
 * Hook para obtener las alertas del sistema
 * TODO: Reemplazar con llamada API real cuando esté disponible
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true);
        
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        // Mock data - alertas
        const mockAlerts: Alert[] = [
          {
            id: '1',
            type: 'error',
            message: 'Vuelo LIM-BRL al 95% de capacidad. Se requiere acción.',
          },
          {
            id: '2',
            type: 'error',
            message: 'Retraso de paquete PX-789: Incumplimiento de SLA.',
          },
          {
            id: '3',
            type: 'info',
            message: 'Recogida RY-456 fuera de la ventana de 2h.',
          },
        ];
        
        setAlerts(mockAlerts);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return { alerts, isLoading, error };
}

