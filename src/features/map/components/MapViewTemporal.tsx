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
import { MapCanvas } from './MapCanvas';
import { AirportMarker } from './AirportMarker';
import { AnimatedFlightMarker } from './AnimatedFlightMarker';
import { RoutesLayer } from './RoutesLayer';
import { SimulationControlsFloating } from './SimulationControlsFloating';
import { OccupancyLegend } from './OccupancyLegend';

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

  // Hook de gestión de capacidades de aeropuertos
  const capacityManager = useAirportCapacityManager();
  const { airports, isLoading: airportsLoading } = capacityManager;

  // Mapear aeropuertos al formato que espera useTemporalSimulation
  const aeropuertosParaSimulacion = useMemo(() => {
    return airports.map(a => ({
      id: a.id,
      codigoIATA: a.codigoIATA,
      capacidadActual: a.cantActual || 0,
      capacidadMaxima: a.capMaxAlmacen || 1000,
    }));
  }, [airports]);

  // Hook temporal simulation con callback de capacidad
  const simulation = useTemporalSimulation({
    timeline: resultado.lineaDeTiempo,
    timeUnit,
    onFlightCapacityChange: capacityManager.handleFlightCapacityEvent,
    aeropuertos: aeropuertosParaSimulacion,
  });

  // Envolver reset para también resetear capacidades
  const handleReset = () => {
    simulation.reset();
    capacityManager.resetCapacities();
  };

  // Canvas renderer para rutas (sin captura de eventos de puntero)
  const canvasRenderer = useMemo(() => L.canvas({ 
    padding: 0,
    pane: 'overlayPane' // Asegura que esté debajo de los marcadores
  }), []);

  // Convertir ActiveFlight a formato para AnimatedFlightMarker
  // Los vuelos ya vienen agrupados por vuelo físico desde useTemporalSimulation
  // (múltiples pedidos en el mismo vuelo se muestran como UN solo avión)
  const flightsForRender = useMemo(() => {
    const flights = simulation.activeFlights.map(flight => {
      const origin = airports.find(a => a.id === flight.originAirportId);
      const dest = airports.find(a => a.id === flight.destinationAirportId);

      if (!origin || !dest) {
        console.warn(`[MapViewTemporal] Vuelo ${flight.eventId} sin aeropuertos`);
        return null;
      }

      return {
        eventId: flight.eventId, // Clave física del vuelo (agrupa pedidos del mismo vuelo)
        flightId: flight.flightId,
        flightCode: flight.flightCode,
        originCode: origin.codigoIATA || '',
        destinationCode: dest.codigoIATA || '',
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        currentProgress: flight.progress,
        productIds: flight.productIds, // Todos los productos en este vuelo
        orderIds: flight.orderIds,     // Todos los pedidos en este vuelo
        originLat: origin.latitud,
        originLon: origin.longitud,
        destLat: dest.latitud,
        destLon: dest.longitud,
        originAirportId: flight.originAirportId,
        destinationAirportId: flight.destinationAirportId,
        capacityMax: flight.capacityMax || 100,
        capacityUsed: flight.cantidadProductos || flight.orderIds.length,
      };
    }).filter((f): f is NonNullable<typeof f> => f !== null);
    
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
          completedOrdersCount={simulation.completedOrdersCount}
          totalOrdersCount={simulation.totalOrdersCount}
          timeUnit={timeUnit}
          onTimeUnitChange={setTimeUnit}
        />
      )}

      {/* Leyenda de ocupación (bottom-left) */}
      <OccupancyLegend />
    </div>
  );
}

