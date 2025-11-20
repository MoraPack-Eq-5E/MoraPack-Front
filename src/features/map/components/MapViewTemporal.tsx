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
  // Agrupar productos por vuelo para calcular ocupación real
  const flightsForRender = useMemo(() => {
    // Agrupar vuelos por flightId para consolidar productos
    const flightGroups = new Map<number, typeof simulation.activeFlights>();
    
    simulation.activeFlights.forEach(flight => {
      if (!flightGroups.has(flight.flightId)) {
        flightGroups.set(flight.flightId, []);
      }
      flightGroups.get(flight.flightId)!.push(flight);
    });
    
    // Convertir grupos a formato de renderizado
    const flights = Array.from(flightGroups.entries()).map(([flightId, flightGroup]) => {
      const firstFlight = flightGroup[0];
      const origin = airports.find(a => a.id === firstFlight.originAirportId);
      const dest = airports.find(a => a.id === firstFlight.destinationAirportId);

      if (!origin || !dest) {
        console.warn(`[MapViewTemporal] Vuelo ${flightId} sin aeropuertos`);
        return null;
      }

      // Recopilar todos los productos y órdenes de este vuelo
      const productIds = flightGroup.map(f => f.productId);
      const orderIds = flightGroup.map(f => f.orderId);
      
      // Usar capacidad real del vuelo desde el backend
      const capacityMax = firstFlight.capacityMax;
      // Usar cantidadProductos del backend (ya viene agrupado correctamente)
      const capacityUsed = firstFlight.cantidadProductos || productIds.length;
      
      // Validación: si no viene capacidad del backend, usar fallback conservador con warning
      if (!capacityMax) {
        console.warn(`[MapViewTemporal] Vuelo ${flightId} sin capacidad definida, usando fallback de 100`);
      }
      
      return {
        eventId: `flight-${flightId}`,
        flightId: flightId,
        flightCode: firstFlight.flightCode,
        originCode: origin.codigoIATA || '',
        destinationCode: dest.codigoIATA || '',
        departureTime: firstFlight.departureTime,
        arrivalTime: firstFlight.arrivalTime,
        currentProgress: firstFlight.progress,
        productIds,
        orderIds,
        originLat: origin.latitud,
        originLon: origin.longitud,
        destLat: dest.latitud,
        destLon: dest.longitud,
        originAirportId: firstFlight.originAirportId,
        destinationAirportId: firstFlight.destinationAirportId,
        capacityMax: capacityMax || 100, // Usar 100 como fallback conservador
        capacityUsed,
      };
    }).filter((f): f is NonNullable<typeof f> => f !== null);
    
    console.log(`[MapViewTemporal] Vuelos activos: ${simulation.activeFlights.length} productos en ${flights.length} vuelos`);
    
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
          completedProductsCount={simulation.completedProductsCount}
          timeUnit={timeUnit}
          onTimeUnitChange={setTimeUnit}
        />
      )}

      {/* Leyenda de ocupación (bottom-left) */}
      <OccupancyLegend />
    </div>
  );
}

