/**
 * MapViewTemporal
 *
 * Versión para simulación semanal - Solo visualización, sin cancelación de vuelos
 * Con filtrado avanzado de eventos y apertura automática de popups de aviones
 */

import {useState, useMemo, useEffect, useRef, useCallback} from 'react';
import L, { Marker as LeafletMarker } from 'leaflet';
import { useTemporalSimulation, useAirportCapacityManager, useSimulationEvents, type TimeUnit } from '../hooks';
import type { AlgoritmoResponse } from '@/services/algoritmoSemanal.service';
import type { EventFilter } from '@/types/simulation.types';
import { MapCanvas } from './MapCanvas';
import { AirportMarker } from './AirportMarker';
import { AnimatedFlightMarker } from './AnimatedFlightMarker';
import { RoutesLayer } from './RoutesLayer';
import { OccupancyLegend } from './OccupancyLegend';
import { EventFeed } from './EventFeed';
import { OrderDetailDrawer } from './OrderDetailDrawer';

interface MapViewTemporalProps {
  resultado: AlgoritmoResponse;
  // Opcional: unidad de tiempo inicial (por defecto mantiene 'hours' para páginas semanales)
  initialTimeUnit?: TimeUnit;
  // Opcional: iniciar reproducción automáticamente
  autoPlay?: boolean;
  onCompletedOrdersChange?: (ids: number[]) => void;
}

// Constantes
const MAX_FLIGHTS_RENDERED = 120;
const CURVATURE = 0.25;

function isValidCoordinate(coord: number | undefined | null): coord is number {
  return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

export function MapViewTemporal({ resultado, initialTimeUnit, autoPlay, onCompletedOrdersChange}: MapViewTemporalProps) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(initialTimeUnit ??'hours');
  const [showControls, setShowControls] = useState(true);
  const [showEventFeed, setShowEventFeed] = useState(true);
  
  // Estado de filtros para eventos
  const [eventFilter, setEventFilter] = useState<EventFilter>({
    categories: ['ALL'],
    searchTerm: '',
  });

  // Estado para el drawer de detalles de pedido
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  // Info del vuelo actual si el pedido está en vuelo
  const [selectedOrderFlightInfo, setSelectedOrderFlightInfo] = useState<{
    flightCode: string;
    originCode: string;
    destinationCode: string;
  } | null>(null);

  // Refs para marcadores de aviones (para abrir popups)
  const markerRefsRef = useRef<Map<string, LeafletMarker>>(new Map());
  
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
  const {  completedOrdersCount, totalOrdersCount, completedOrderIds, simulationEvents } = simulation;
  
  // Hook para gestión de eventos con filtrado avanzado
  const { filteredEvents } = useSimulationEvents(simulationEvents, {
    maxEvents: 200,
    enableFilters: true,
  });

  // Aplicar filtros del estado local a los eventos
  const displayedEvents = useMemo(() => {
    let events = filteredEvents;
    
    // Aplicar filtro por orderId
    if (eventFilter.orderId) {
      const orderIdNum = parseInt(eventFilter.orderId, 10);
      events = events.filter(e => 
        e.relatedOrderId === orderIdNum ||
        e.relatedOrderIds?.includes(orderIdNum) ||
        e.message.includes(eventFilter.orderId!)
      );
    }
    
    // Aplicar filtro por flightCode
    if (eventFilter.flightCode) {
      const flightCodeLower = eventFilter.flightCode.toLowerCase();
      events = events.filter(e =>
        e.relatedFlightCode?.toLowerCase().includes(flightCodeLower) ||
        e.message.toLowerCase().includes(flightCodeLower)
      );
    }
    
    // Aplicar filtro por airportCode
    if (eventFilter.airportCode) {
      const airportCodeLower = eventFilter.airportCode.toLowerCase();
      events = events.filter(e =>
        e.relatedAirportCode?.toLowerCase() === airportCodeLower ||
        e.message.toLowerCase().includes(airportCodeLower)
      );
    }
    
    // Aplicar filtro por categorías
    if (!eventFilter.categories.includes('ALL')) {
      events = events.filter(e => {
        const type = e.type;
        if (eventFilter.categories.includes('FLIGHT') && 
            (type === 'FLIGHT_DEPARTURE' || type === 'FLIGHT_ARRIVAL' || type === 'FLIGHT_CANCELED')) {
          return true;
        }
        if (eventFilter.categories.includes('ORDER') &&
            (type === 'ORDER_DEPARTED' || type === 'ORDER_ARRIVED_AIRPORT' || 
             type === 'ORDER_AT_DESTINATION' || type === 'ORDER_PICKED_UP' || type === 'ORDER_DELIVERED')) {
          return true;
        }
        if (eventFilter.categories.includes('WAREHOUSE') &&
            (type === 'WAREHOUSE_WARNING' || type === 'WAREHOUSE_CRITICAL' || type === 'WAREHOUSE_FULL')) {
          return true;
        }
        if (eventFilter.categories.includes('ALERT') && type === 'SLA_RISK') {
          return true;
        }
        return false;
      });
    }
    
    return events;
  }, [filteredEvents, eventFilter]);

  // Función para abrir popup de un avión por eventId
  const openFlightPopup = useCallback((eventId: string) => {
    const marker = markerRefsRef.current.get(eventId);
    if (marker) {
      console.log(`[MapViewTemporal] Abriendo popup para vuelo ${eventId}`);
      marker.openPopup();
    } else {
      console.warn(`[MapViewTemporal] Marcador no encontrado para eventId: ${eventId}`);
    }
  }, []);

  // Callback para registrar marcadores
  const handleMarkerCreated = useCallback((eventId: string, marker: LeafletMarker) => {
    markerRefsRef.current.set(eventId, marker);
  }, []);

  // Callback para eliminar marcadores (cuando el vuelo termina)
  const handleMarkerRemoved = useCallback((eventId: string) => {
    markerRefsRef.current.delete(eventId);
  }, []);

  // Preparar lista de vuelos activos para EventFeed
  const activeFlightsForEventFeed = useMemo(() => {
    return simulation.activeFlights.map(f => ({
      eventId: f.eventId,
      orderIds: f.orderIds,
      flightCode: f.flightCode,
    }));
  }, [simulation.activeFlights]);

  // Preparar lista de aeropuertos para filtros
  const airportsForFilters = useMemo(() => {
    return airports.map(a => ({
      codigoIATA: a.codigoIATA,
      nombre: a.ciudad || a.codigoIATA,
    }));
  }, [airports]);

  // Handler para abrir el drawer de detalles de pedido
  const handleOpenOrderDetail = useCallback((orderId: number) => {
    console.log(`[MapViewTemporal] Abriendo detalles del pedido #${orderId}`);
    
    // Buscar si el pedido está actualmente en un vuelo activo
    const flightWithOrder = simulation.activeFlights.find(f => f.orderIds.includes(orderId));
    
    if (flightWithOrder) {
      // El pedido está en vuelo - guardar info del vuelo
      const originAirport = airports.find(a => a.id === flightWithOrder.originAirportId);
      const destAirport = airports.find(a => a.id === flightWithOrder.destinationAirportId);
      
      setSelectedOrderFlightInfo({
        flightCode: flightWithOrder.flightCode,
        originCode: originAirport?.codigoIATA || '???',
        destinationCode: destAirport?.codigoIATA || '???',
      });
      console.log(`[MapViewTemporal] Pedido #${orderId} está en vuelo ${flightWithOrder.flightCode}`);
    } else {
      // El pedido no está en vuelo
      setSelectedOrderFlightInfo(null);
    }
    
    setSelectedOrderId(orderId);
  }, [simulation.activeFlights, airports]);

  // Handler para cerrar el drawer
  const handleCloseOrderDetail = useCallback(() => {
    setSelectedOrderId(null);
    setSelectedOrderFlightInfo(null);
  }, []);

  // Handler para filtrar eventos por pedido desde el drawer
  const handleFilterByOrderFromDrawer = useCallback((orderId: number) => {
    setEventFilter(prev => ({
      ...prev,
      orderId: orderId.toString(),
    }));
    setSelectedOrderId(null); // Cerrar drawer al filtrar
  }, []);

  // Auto-play si se solicita (por ejemplo EnVivoPage quiere reproducción en tiempo real)
  // Iniciamos la reproducción cuando haya timeline y autoPlay esté activado
  useEffect(() => {
    if (autoPlay && resultado.lineaDeTiempo) {
      simulation.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, resultado.lineaDeTiempo]);
  useEffect(() => {
    if (onCompletedOrdersChange) {
      onCompletedOrdersChange(completedOrderIds);
    }
  }, [completedOrderIds, onCompletedOrdersChange]);
  // Mapa: aeropuertoId -> lista de vuelos activos relacionados
  /*const flightsByAirport = useMemo(() => {
    const map = new Map<number, typeof activeFlights>();

    activeFlights.forEach(flight => {
      // Contar tanto origen como destino
      [flight.originAirportId, flight.destinationAirportId].forEach(airportId => {
        if (airportId == null) return;
        if (!map.has(airportId)) {
          map.set(airportId, []);
        }
        map.get(airportId)!.push(flight);
      });
    });

    return map;
  }, [activeFlights]);
*/
  // Aeropuerto seleccionado (objeto completo)
  /*const selectedAirport = useMemo(
      () => airports.find(a => a.id === selectedAirportId) ?? null,
      [airports, selectedAirportId]
  );*/

  // Vuelos asociados al aeropuerto seleccionado
  /*const flightsForSelectedAirport = useMemo(
      () => (selectedAirportId != null ? (flightsByAirport.get(selectedAirportId) ?? []) : []),
      [selectedAirportId, flightsByAirport]
  );*/

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
        windowIndex: flight.windowIndex,
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
              //isSelected={false}
              //onClick={() => {}}
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
              onMarkerCreated={handleMarkerCreated}
              onMarkerRemoved={handleMarkerRemoved}
              onOrderIdClick={handleOpenOrderDetail}
            />
          );
        })}
      </MapCanvas>

      {/* Panel lateral unificado (controles + eventos) */}
      {resultado.lineaDeTiempo && (
        <div className="absolute top-3 right-3 bottom-3 z-[1000] w-80 flex flex-col gap-2 pointer-events-none">
          {/* Sección de Controles */}
          <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden flex-shrink-0 pointer-events-auto transition-all duration-300 ${!showControls ? 'flex-grow-0' : ''}`}>
            {/* Header de controles - clickeable para colapsar */}
            <div 
              className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2.5 cursor-pointer select-none"
              onClick={() => setShowControls(!showControls)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-white">Reproductor</h3>
                  {/* Mini indicador de estado cuando está colapsado */}
                  {!showControls && (
                    <span className="text-[10px] text-white/80 font-mono">
                      {simulation.formatSimulationTime(simulation.currentSimTime)}
                    </span>
                  )}
                </div>
                <button
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  title={showControls ? 'Colapsar' : 'Expandir'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showControls ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Contenido de controles - colapsable */}
            <div className={`overflow-hidden transition-all duration-300 ${showControls ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3">
                {/* Botones Play/Pause/Reset */}
                <div className="flex gap-2 mb-3">
                  {!simulation.isPlaying ? (
                    <button
                      onClick={simulation.play}
                      className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Reproducir
                    </button>
                  ) : (
                    <button
                      onClick={simulation.pause}
                      className="flex-1 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Pausar
                    </button>
                  )}
                  
                  <button
                    onClick={handleReset}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-sm"
                    title="Reiniciar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, Math.max(0, simulation.progressPercent))}%` }}
                  />
                </div>
                
                {/* Selector de velocidad */}
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1.5 font-medium">
                    Velocidad: 1 segundo real =
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { unit: 'seconds' as TimeUnit, label: '1 seg' },
                      { unit: 'minutes' as TimeUnit, label: '1 min' },
                      { unit: 'hours' as TimeUnit, label: '1 hora' },
                      { unit: 'days' as TimeUnit, label: '1 día' },
                    ].map(({ unit, label }) => (
                      <button
                        key={unit}
                        onClick={() => setTimeUnit(unit)}
                        className={`px-2 py-1.5 text-xs font-bold rounded transition-all ${
                          timeUnit === unit
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Estadísticas */}
                <div className="text-xs space-y-1.5 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Tiempo:</span>
                    <span className="font-mono font-bold text-teal-700">
                      {simulation.formatSimulationTime(simulation.currentSimTime)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Vuelos activos:</span>
                    <span className="font-semibold text-sky-600">
                      {simulation.flightStats.inFlight}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span className="font-medium">Pedidos entregados:</span>
                    <span className="font-semibold text-emerald-600">
                      {completedOrdersCount}/{totalOrdersCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sección de Eventos */}
          <div className={`bg-white/95 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden pointer-events-auto transition-all duration-300 ${showEventFeed ? 'flex-1 min-h-0 flex flex-col' : 'flex-shrink-0'}`}>
            {/* Header de eventos - clickeable para colapsar */}
            <div 
              className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2.5 cursor-pointer flex-shrink-0 select-none"
              onClick={() => setShowEventFeed(!showEventFeed)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-white ${simulationEvents.length > 0 ? 'animate-pulse' : ''}`}></div>
                  <h3 className="text-sm font-semibold text-white">Eventos en Tiempo Real</h3>
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {simulationEvents.length}
                  </span>
                </div>
                <button
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  title={showEventFeed ? 'Colapsar' : 'Expandir'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showEventFeed ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Contenido de eventos - colapsable */}
            {showEventFeed && (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <EventFeed 
                  events={displayedEvents}
                  enableSearch={true}
                  embedded={true}
                  filter={eventFilter}
                  onFilterChange={setEventFilter}
                  airports={airportsForFilters}
                  onFlightPopupRequest={openFlightPopup}
                  activeFlights={activeFlightsForEventFeed}
                  onOpenOrderDetail={handleOpenOrderDetail}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leyenda de ocupación (bottom-left) */}
      <OccupancyLegend />

      {/* Drawer de detalles de pedido */}
      <OrderDetailDrawer
        orderId={selectedOrderId}
        onClose={handleCloseOrderDetail}
        onFilterByOrder={handleFilterByOrderFromDrawer}
        currentFlightInfo={selectedOrderFlightInfo}
      />
    </div>
  );
}
