/**
 * MapViewTemporal
 * 
 * Versión mejorada de MapView que usa useTemporalSimulation
 */

import { useState, useMemo } from 'react';
import L from 'leaflet';
import { useTemporalSimulation, type TimeUnit } from '../hooks/useTemporalSimulation';
import { useAirportCapacityManager } from '../hooks/useAirportCapacityManager';
import type { AlgoritmoResponse } from '@/services/algoritmoSemanal.service';
import type { Aeropuerto } from '@/types/map.types';
import { MapCanvas } from './MapCanvas';
import { AirportMarker } from './AirportMarker';
import { AnimatedFlightMarker } from './AnimatedFlightMarker';
import { RoutesLayer } from './RoutesLayer';
import { FlightDetailsModal } from './FlightDetailsModal';
import { AirportDetailsModal } from './AirportDetailsModal';
import { SimulationControlsFloating } from './SimulationControlsFloating';
import { StatsCard } from './StatsCard';

interface MapViewTemporalProps {
  resultado: AlgoritmoResponse;
}

// Constantes
const MAX_FLIGHTS_RENDERED = 120;
const CURVATURE = 0.25;

function isValidCoordinate(coord: number | undefined | null): coord is number {
  return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

export function MapViewTemporal({ resultado }: MapViewTemporalProps) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('hours');
  const [selectedAirport, setSelectedAirport] = useState<Aeropuerto | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null);

  // Hook de gestión de capacidades de aeropuertos
  const capacityManager = useAirportCapacityManager();
  const { airports, isLoading: airportsLoading } = capacityManager;

  // Hook temporal simulation con callback de capacidad
  const simulation = useTemporalSimulation({
    timeline: resultado.lineaDeTiempo,
    timeUnit,
    onFlightCapacityChange: capacityManager.handleFlightCapacityEvent,
  });

  // Envolver reset para también resetear capacidades
  const handleReset = () => {
    simulation.reset();
    capacityManager.resetCapacities();
  };

  // Canvas renderer
  const canvasRenderer = useMemo(() => L.canvas(), []);

  // Convertir ActiveFlight a formato para AnimatedFlightMarker
  const flightsForRender = useMemo(() => {
    const flights = simulation.activeFlights.map(flight => {
      const origin = airports.find(a => a.id === flight.originAirportId);
      const dest = airports.find(a => a.id === flight.destinationAirportId);

      if (!origin || !dest) {
        console.warn(`[MapViewTemporal] Vuelo ${flight.flightId} sin aeropuertos: origen=${flight.originAirportId}, destino=${flight.destinationAirportId}`);
        return null;
      }

      return {
        eventId: `${flight.flightId}-${flight.productId}`,
        flightId: flight.flightId,
        flightCode: flight.flightCode,
        originCode: origin.codigoIATA || '',
        destinationCode: dest.codigoIATA || '',
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        currentProgress: flight.progress,
        productIds: [flight.productId],
        orderIds: [flight.orderId],
        originLat: origin.latitud,
        originLon: origin.longitud,
        destLat: dest.latitud,
        destLon: dest.longitud,
        originAirportId: flight.originAirportId,
        destinationAirportId: flight.destinationAirportId,
      };
    }).filter((f): f is NonNullable<typeof f> => f !== null);
    
    console.log(`[MapViewTemporal] simulation.activeFlights: ${simulation.activeFlights.length}, flightsForRender: ${flights.length}`);
    
    return flights;
  }, [simulation.activeFlights, airports]);

  // Culling de vuelos
  const culledFlights = useMemo(() => {
    if (flightsForRender.length <= MAX_FLIGHTS_RENDERED) {
      return flightsForRender;
    }
    return [...flightsForRender]
      .sort((a, b) => b.currentProgress - a.currentProgress)
      .slice(0, MAX_FLIGHTS_RENDERED);
  }, [flightsForRender]);

  if (airportsLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Cargando aeropuertos...</p>
        </div>
      </div>
    );
  }

  if (!resultado.lineaDeTiempo) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Timeline no disponible
          </h3>
          <p className="text-gray-600">
            El algoritmo completó pero no retornó datos de timeline para visualización.
          </p>
        </div>
      </div>
    );
  }

  const totalFlights = simulation.flightStats.completed + 
                      simulation.flightStats.inFlight + 
                      simulation.flightStats.pending;

  return (
    <div className="h-full w-full relative">
      {/* Mapa */}
      <MapCanvas className="h-full w-full">
        {/* Aeropuertos */}
        {airports
          .filter(airport => 
            isValidCoordinate(airport.latitud) && 
            isValidCoordinate(airport.longitud)
          )
          .map((airport) => (
            <AirportMarker 
              key={airport.id} 
              airport={airport}
              onClick={() => setSelectedAirport(airport)}
            />
          ))}
        
        {/* Rutas */}
        {culledFlights.length > 0 && (
          <RoutesLayer 
            flights={culledFlights}
            airports={airports}
            canvasRenderer={canvasRenderer}
            curvature={CURVATURE}
          />
        )}
        
        {/* Aviones animados */}
        {culledFlights.map((flight) => {
          if (!isValidCoordinate(flight.originLat) || 
              !isValidCoordinate(flight.originLon) || 
              !isValidCoordinate(flight.destLat) || 
              !isValidCoordinate(flight.destLon)) {
            return null;
          }
          
          return (
            <AnimatedFlightMarker 
              key={flight.eventId} 
              flight={flight}
              curvature={CURVATURE}
              onClick={() => setSelectedFlight(flight)}
            />
          );
        })}
      </MapCanvas>

      {/* Controles flotantes (top-right) */}
      {resultado.lineaDeTiempo && (
        <SimulationControlsFloating
          isPlaying={simulation.isPlaying}
          onPlay={simulation.play}
          onPause={simulation.pause}
          onReset={handleReset}
          progressPercent={simulation.progressPercent}
          currentSimTime={simulation.currentSimTime}
          formatSimulationTime={simulation.formatSimulationTime}
          flightStats={simulation.flightStats}
          completedProductsCount={simulation.completedProductsCount}
          timeUnit={timeUnit}
          onTimeUnitChange={setTimeUnit}
        />
      )}

      {/* Stats cards (bottom) */}
      {resultado.lineaDeTiempo && (
        <div className="absolute bottom-6 left-6 right-6 z-[999]">
          <div className="grid grid-cols-4 gap-3">
            <StatsCard 
              label="Tiempo de Simulación"
              value={simulation.formatSimulationTime(simulation.currentSimTime)}
            />
            <StatsCard 
              label="Vuelos Completados"
              value={`${simulation.flightStats.completed} / ${totalFlights}`}
            />
            <StatsCard 
              label="Vuelos en Vuelo"
              value={`${simulation.flightStats.inFlight}`}
              sublabel={culledFlights.length < flightsForRender.length 
                ? `(mostrando ${culledFlights.length})` 
                : undefined}
            />
            <StatsCard 
              label="Vuelos Pendientes"
              value={`${simulation.flightStats.pending}`}
            />
          </div>
        </div>
      )}

      {/* Modales */}
      {selectedAirport && (
        <AirportDetailsModal 
          airport={selectedAirport}
          onClose={() => setSelectedAirport(null)}
        />
      )}
      
      {selectedFlight && (
        <FlightDetailsModal
          flight={{
            ...selectedFlight,
            status: 'IN_FLIGHT',
            departureTime: new Date(),
            arrivalTime: new Date(),
          }}
          origin={airports.find(a => a.id === selectedFlight.originAirportId) || null}
          destination={airports.find(a => a.id === selectedFlight.destinationAirportId) || null}
          onClose={() => setSelectedFlight(null)}
        />
      )}
    </div>
  );
}

