/**
 * MapView Component
 * 
 * Visualización en tiempo real de vuelos desde el backend
 * 
 * @param simulationId - ID de la simulación activa en el backend
 */

import { useState } from 'react';
import { MapCanvas, FlightMarker, FlightRoute, AirportMarker, StatsCard, LoadingOverlay, OccupancyLegend } from '@/features/map/components';
import { useLiveFlights, useMapStats, useAirportsForMap } from '@/features/map/hooks';
import type { Vuelo } from '@/types/map.types';

interface MapViewProps {
  simulationId: number | null;
}

const POLLING_INTERVAL = 2000; // 2 segundos

export function MapView({ simulationId }: MapViewProps) {
  const { airports, isLoading: airportsLoading } = useAirportsForMap();
  const { flights, status, loadingStatus, error } = useLiveFlights(simulationId, POLLING_INTERVAL);
  const stats = useMapStats(flights);
  
  // Estado para el vuelo seleccionado (para mostrar su ruta)
  const [selectedFlight, setSelectedFlight] = useState<Vuelo | null>(null);
  
  const handleFlightClick = (vuelo: Vuelo) => {
    // Si clickean el mismo vuelo, deseleccionar
    if (selectedFlight?.id === vuelo.id) {
      setSelectedFlight(null);
    } else {
      setSelectedFlight(vuelo);
    }
  };

  // Cargando aeropuertos
  if (airportsLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Cargando aeropuertos...</p>
        </div>
      </div>
    );
  }

  // Sin simulación activa
  if (!simulationId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No hay simulación activa
          </h2>
          <p className="text-gray-500">
            Inicia una simulación para ver vuelos en tiempo real
          </p>
        </div>
      </div>
    );
  }

  // Error de conexión
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            Error de conexión
          </h2>
          <p className="text-red-600">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Loading Overlay - Muestra el progreso de carga */}
      <LoadingOverlay
        status={loadingStatus}
        message={
          loadingStatus === 'loading-visualization'
            ? 'Esto puede tomar unos segundos...'
            : undefined
        }
      />

      <MapCanvas className="h-full w-full">
        {/* Aeropuertos */}
        {airports.map((airport) => (
          <AirportMarker key={airport.id} airport={airport} />
        ))}
        
        {/* Línea de ruta del vuelo seleccionado */}
        {selectedFlight && (
          <FlightRoute vuelo={selectedFlight} />
        )}
        
        {/* Vuelos en tiempo real */}
        {flights.map((flight) => (
          <FlightMarker 
            key={flight.id} 
            vuelo={flight}
            onClick={handleFlightClick}
          />
        ))}
        
        {/* Stats card con datos reales */}
        <StatsCard
          flightsInAir={stats.total}
          slaPct={status?.metrics.slaCompliancePercentage || 0}
          warehousePct={status?.metrics.averageWarehouseOccupancy || 0}
          now={status?.currentSimulatedTime || new Date().toISOString()}
        />
      </MapCanvas>
      
      {/* Leyenda de colores de ocupación */}
      {loadingStatus === 'ready' && <OccupancyLegend />}
      
      {/* Indicador de vuelo seleccionado */}
      {selectedFlight && loadingStatus === 'ready' && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 border border-gray-200">
          <div className="text-sm font-medium text-gray-700">
            Ruta: {selectedFlight.codigo}
          </div>
          <div className="text-xs text-gray-500">
            {selectedFlight.ciudadOrigen} → {selectedFlight.ciudadDestino}
          </div>
          <button
            onClick={() => setSelectedFlight(null)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            Ocultar ruta
          </button>
        </div>
      )}
    </div>
  );
}

