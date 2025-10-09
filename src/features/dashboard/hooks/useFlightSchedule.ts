import { useState, useEffect } from 'react';
import { type FlightSchedule } from '@/types';

/**
 * Hook para obtener el cronograma de vuelos
 * TODO: Reemplazar con llamada API real cuando esté disponible
 */
export function useFlightSchedule() {
  const [flights, setFlights] = useState<FlightSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        setIsLoading(true);
        
        await new Promise((resolve) => setTimeout(resolve, 400));
        
        // Mock data - próximos vuelos
        const mockFlights: FlightSchedule[] = [
          {
            id: '1',
            departureDate: '20/08',
            departureTime: '10:00',
            arrivalDate: '20/08',
            arrivalTime: '12:00',
            route: 'SKBO-SCEL',
            status: 'retrasado',
            capacityUsed: 200,
            totalCapacity: 200,
            stops: 'Directo',
            delays: 'Retraso 30min',
            impactOnDeliveries: '45 pedidos afectados',
          },
          {
            id: '2',
            departureDate: '20/08',
            departureTime: '14:30',
            arrivalDate: '20/08',
            arrivalTime: '20:00',
            route: 'SBBR-SKBO',
            status: 'programado',
            capacityUsed: 150,
            totalCapacity: 200,
            stops: '2 escalas',
            delays: 'Ninguno',
            impactOnDeliveries: '30 pedidos afectados',
          },
          {
            id: '3',
            departureDate: '21/08',
            departureTime: '08:00',
            arrivalDate: '21/08',
            arrivalTime: '16:00',
            route: 'SKBO-SBBR',
            status: 'programado',
            capacityUsed: 250,
            totalCapacity: 250,
            stops: 'Directo',
            delays: 'Ninguno',
            impactOnDeliveries: '15 pedidos afectados',
          },
          {
            id: '4',
            departureDate: '21/08',
            departureTime: '18:00',
            arrivalDate: '21/08',
            arrivalTime: '21:00',
            route: 'SPIM-SKBO',
            status: 'retrasado',
            capacityUsed: 180,
            totalCapacity: 200,
            stops: 'Directo',
            delays: 'Retraso 15min',
            impactOnDeliveries: '50 pedidos afectados',
          },
          {
            id: '5',
            departureDate: '22/08',
            departureTime: '09:00',
            arrivalDate: '20/08',
            arrivalTime: '10:00',
            route: 'SKBO-SCEL',
            status: 'programado',
            capacityUsed: 220,
            totalCapacity: 250,
            stops: '1 escala',
            delays: 'Ninguno',
            impactOnDeliveries: '20 pedidos afectados',
          },
        ];
        
        setFlights(mockFlights);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlights();
  }, []);

  return { flights, isLoading, error };
}

