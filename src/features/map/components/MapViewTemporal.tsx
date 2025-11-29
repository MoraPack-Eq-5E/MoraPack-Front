/**
 * MapViewTemporal
 *
 * Versión mejorada de MapView que usa useTemporalSimulation
 */

import { useState, useMemo/*, useEffect*/ } from 'react';
import L from 'leaflet';
import { useTemporalSimulation, useAirportCapacityManager, type TimeUnit } from '../hooks';
import type { AlgoritmoResponse } from '@/services/algoritmoSemanal.service';
import { MapCanvas } from './MapCanvas';
import { AirportMarker } from './AirportMarker';
import { AnimatedFlightMarker } from './AnimatedFlightMarker';
import { RoutesLayer } from './RoutesLayer';
import { SimulationControlsFloating } from './SimulationControlsFloating';
import { OccupancyLegend } from './OccupancyLegend';

interface MapViewTemporalProps {
  resultado: AlgoritmoResponse;
  // Opcional: unidad de tiempo inicial (por defecto mantiene 'hours' para páginas semanales)
  //initialTimeUnit?: TimeUnit;
  // Opcional: iniciar reproducción automáticamente
  //autoPlay?: boolean;
}

// Constantes
const MAX_FLIGHTS_RENDERED = 120;
const CURVATURE = 0.25;

function isValidCoordinate(coord: number | undefined | null): coord is number {
  return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

export function MapViewTemporal({ resultado/*, /*initialTimeUnit*//*, autoPlay*/ }: MapViewTemporalProps) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(/*initialTimeUnit ??*/ 'hours');

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

  // Auto-play si se solicita (por ejemplo EnVivoPage quiere reproducción en tiempo real)
  // Iniciamos la reproducción cuando haya timeline y autoPlay esté activado
  //useEffect(() => {
  //  if (autoPlay && resultado.lineaDeTiempo) {
  //    simulation.play();
  //  }
  //  // eslint-disable-next-line react-hooks/exhaustive-deps
  //}, [autoPlay, resultado.lineaDeTiempo]);

  // Envolver reset para también resetear capacidades
  const handleReset = () => {
    simulation.reset();
    capacityManager.resetCapacities();
  };

  // Canvas renderer
  const canvasRenderer = useMemo(() => L.canvas(), []);

  // Convertir ActiveFlight a formato para AnimatedFlightMarker
  // IMPORTANTE: Usar eventId como clave única (no flightId) porque el mismo vuelo físico
  // puede usarse en diferentes días/horas y cada instancia debe mostrarse como un avión separado
  const flightsForRender = useMemo(() => {
    const flights = simulation.activeFlights.map(flight => {
      const origin = airports.find(a => a.id === flight.originAirportId);
      const dest = airports.find(a => a.id === flight.destinationAirportId);

      if (!origin || !dest) {
        console.warn(`[MapViewTemporal] Vuelo ${flight.eventId} sin aeropuertos`);
        return null;
      }

      return {
        eventId: flight.eventId, // Usar eventId como clave única
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
        capacityMax: flight.capacityMax || 100,
        capacityUsed: flight.cantidadProductos || 1,
      };
    }).filter((f): f is NonNullable<typeof f> => f !== null);

    console.log(`[MapViewTemporal] Renderizando ${flights.length} vuelos activos`);

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
