/**
 * MapView Component
 * 
 * Componente reutilizable que renderiza el mapa interactivo con vuelos y aeropuertos.
 * Soporta dos modos de operación: 'live' (tiempo real) y 'simulation' (escenarios de prueba).
 * 
 * @param mode - Modo de operación del mapa ('live' | 'simulation')
 * 
 * @example
 * ```tsx
 * <MapView mode="live" />
 * <MapView mode="simulation" />
 * ```
 */

import type { MapMode } from '@/types';
import { MapCanvas, FlightMarker, AirportMarker, StatsCard } from '@/features/map/components';
import { useLiveFlights, useMapStats } from '@/features/map/hooks';
import { useAirports } from '@/features/map/services/airports.service';

interface MapViewProps {
  mode: MapMode;
}

const FLIGHT_UPDATE_INTERVAL = 3000; // 3 seconds

export function MapView({ mode }: MapViewProps) {
  // Fetch data
  const { airports } = useAirports();
  const { flights } = useLiveFlights(FLIGHT_UPDATE_INTERVAL);
  const stats = useMapStats(flights);
  
  // TODO: Implement mode-specific behavior
  // - mode === 'live' -> fetch from /api/flights/live
  // - mode === 'simulation' -> fetch from /api/flights/simulation
  console.log('MapView mode:', mode);

  return (
    <div className="h-full w-full">
      <MapCanvas className="h-full w-full">
        {airports.map((airport) => (
          <AirportMarker key={airport.id} airport={airport} />
        ))}
        
        {flights.map((flight) => (
          <FlightMarker key={flight.id} vuelo={flight} />
        ))}
        
        <StatsCard
          flightsInAir={stats.total}
          slaPct={stats.slaPct}
          warehousePct={stats.whPct}
          now={stats.now}
        />
      </MapCanvas>
    </div>
  );
}

