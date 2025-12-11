/**
 * MapViewEnVivo
 *
 * Versión para operación diaria / En Vivo con funcionalidad completa de cancelación de vuelos
 * Muestra el panel lateral de vuelos del aeropuerto seleccionado y permite cancelar vuelos
 */

import {useState, useMemo, useEffect} from 'react';
import L from 'leaflet';
import { useTemporalSimulation, useAirportCapacityManager, type TimeUnit } from '../hooks';
import type { AlgoritmoResponse, EventoLineaDeTiempoVueloDTO } from '@/services/algoritmoSemanal.service';
import { MapCanvas } from './MapCanvas';
import { AirportMarker } from './AirportMarker';
import { AnimatedFlightMarker } from './AnimatedFlightMarker';
import { RoutesLayer } from './RoutesLayer';
import { OccupancyLegend } from './OccupancyLegend';
import { EventFeed } from './EventFeed';
import { cancelarInstanciaVuelo } from '@/services/vuelos.service';

// Interfaz extendida para eventos con ventanaIndex
interface EventoConVentana extends EventoLineaDeTiempoVueloDTO {
  ventanaIndex?: number;
}

interface MapViewEnVivoProps {
  resultado: AlgoritmoResponse;
  // Opcional: unidad de tiempo inicial (por defecto mantiene 'hours' para páginas semanales)
  initialTimeUnit?: TimeUnit;
  // Opcional: iniciar reproducción automáticamente
  autoPlay?: boolean;
  onCompletedOrdersChange?: (ids: number[]) => void;
  // Opcional: tiempo real actual para cancelación de vuelos (usado en En Vivo)
  // Si no se proporciona, usa currentSimDateTime del reproductor
  currentRealTime?: Date;
  // Opcional: tiempo de la siguiente ventana para reoptimización (usado en En Vivo)
  nextWindowTime?: Date;
}

// Constantes
const MAX_FLIGHTS_RENDERED = 120;
const CURVATURE = 0.25;

function isValidCoordinate(coord: number | undefined | null): coord is number {
  return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

export function MapViewEnVivo({ resultado, initialTimeUnit, autoPlay, onCompletedOrdersChange, currentRealTime, nextWindowTime}: MapViewEnVivoProps) {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(initialTimeUnit ??'hours');
  const [showControls, setShowControls] = useState(true);
  const [showEventFeed, setShowEventFeed] = useState(true);
  const [selectedAirportId, setSelectedAirportId] = useState<number | null>(null);
  // Hook de gestión de capacidades de aeropuertos
  const capacityManager = useAirportCapacityManager();
  const { airports, isLoading: airportsLoading } = capacityManager;
  const [canceledFlightKeys, setCanceledFlightKeys] = useState<Set<string>>(new Set());
  const [cancelingFlightKey, setCancelingFlightKey] = useState<string | null>(null);
  // Set de vuelos cancelados (usando idInstancia)
  const [canceledFlightInstances, setCanceledFlightInstances] = useState<Set<string>>(new Set());
  // Mapa de reducción de productos por vuelo (idInstancia -> cantidad reducida)
  const [flightProductReductions, setFlightProductReductions] = useState<Map<string, number>>(new Map());

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
    canceledFlightInstances: canceledFlightInstances,
  });
  const {  completedOrdersCount, totalOrdersCount, completedOrderIds, simulationEvents, addSimulationEvent } = simulation;
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

  // Envolver reset para también resetear capacidades y estados de cancelación
  /*const handleReset = () => {
    simulation.reset();
    capacityManager.resetCapacities();
    setCanceledFlightInstances(new Set());
    setFlightProductReductions(new Map());
  };*/
  async function handleCancelarVuelo(flight: (typeof flightsForRender)[number]) {
    try {
      setCancelingFlightKey(flight.eventId);

      const instanciaId = buildInstanciaIdFromFlight(
          flight.flightId,
          flight.departureTime
      );

      // Usar tiempo real si está disponible (modo En Vivo), sino usar tiempo de simulación
      let tiempoParaCancelar: Date;
      let tiempoParaEvento: Date;

      if (currentRealTime) {
        // En modo "En Vivo", currentRealTime es el horaActual parseado
        // Para el backend (cancelación), necesitamos ajustar restando 5 horas
        const HORAS_PERU = 5;
        tiempoParaCancelar = new Date(Date.now() - HORAS_PERU * 60 * 60 * 1000);

        // Para el evento visual, usamos currentRealTime directamente
        // porque formatTimestamp usa getHours() que interpreta en zona local
        tiempoParaEvento = new Date(Date.now());
      } else {
        // Modo simulación normal: usar tiempo del reproductor
        tiempoParaCancelar = simulation.currentSimDateTime;
        tiempoParaEvento = simulation.currentSimDateTime;
      }

      console.log('[CANCELAR VUELO] Tiempos:', {
        vueloSale: flight.departureTime.toISOString(),
        tiempoSimulacion: simulation.currentSimDateTime.toISOString(),
        tiempoRealRaw: currentRealTime?.toISOString() || 'No disponible',
        tiempoRealAjustado: tiempoParaCancelar.toISOString(),
        offsetMinutos: currentRealTime?.getTimezoneOffset(),
        diferenciaMilisegundos: flight.departureTime.getTime() - tiempoParaCancelar.getTime(),
        diferenciaMinutos: Math.round((flight.departureTime.getTime() - tiempoParaCancelar.getTime()) / 60000),
      });

      const result = await cancelarInstanciaVuelo(
          instanciaId,
          tiempoParaCancelar,
          nextWindowTime
      );

      if (!result.exitoso) {
        alert(result.mensaje);
        return;
      }

      // 1) Registrar vuelo cancelado para filtrarlo de la lista
      //setCanceledFlightInstances(prev => new Set(prev).add(result.idInstancia));
      setCanceledFlightInstances(prev => {
        const next = new Set(prev);
        next.add(instanciaId);
        console.log('[CANCELAR] Marcando instancia cancelada en frontend', {
          instanciaIdFront: instanciaId,
          instanciaIdBack: result.idInstancia,
        });
        return next;
      });
      // 1b) Registrar también la clave física del vuelo (eventId) para filtrarlo de la lista
      setCanceledFlightKeys(prev => {
        const next = new Set(prev);
        next.add(flight.eventId);
        console.log('[CANCELAR] Marcando flightPhysicalKey cancelado en frontend', {
          eventId: flight.eventId,
          instanciaIdFront: instanciaId,
          instanciaIdBack: result.idInstancia,
        });
        return next;
      });

      // 2) Buscar vuelos de conexión (escala->destino) que usaban este vuelo
      // y reducir su cantidad de productos
      const pedidosAfectados = flight.orderIds || [];

      // Buscar todos los vuelos posteriores que contengan los mismos pedidos
      // y provengan del destino del vuelo cancelado
      if (pedidosAfectados.length > 0 && resultado.lineaDeTiempo?.eventos) {
        const destinoCode = airports.find(a => a.id === flight.destinationAirportId)?.codigoIATA;

        resultado.lineaDeTiempo.eventos
          .filter(e =>
            e.tipoEvento === 'DEPARTURE' &&
            e.codigoIATAOrigen === destinoCode &&
            e.idsPedidos?.some(pid => pedidosAfectados.includes(pid))
          )
          .forEach(connectionEvent => {
            const connectionDepartureTime = new Date(connectionEvent.horaEvento);
            const connectionInstanciaId = buildInstanciaIdFromFlight(
              connectionEvent.idVuelo || 0,
              connectionDepartureTime
            );

            // Registrar reducción de productos en el vuelo de conexión
            setFlightProductReductions(prev => {
              const newMap = new Map(prev);
              const currentReduction = newMap.get(connectionInstanciaId) || 0;
              newMap.set(connectionInstanciaId, currentReduction + result.productosAfectados);
              return newMap;
            });
          });
      }

      // 3) Agregar evento de cancelación al feed de eventos en tiempo real
      addSimulationEvent(
        'FLIGHT_CANCELED',
        `Vuelo ${flight.flightCode || `#${flight.flightId}`} cancelado: ${result.origen} → ${result.destino}. ${result.productosAfectados} productos.`,
        tiempoParaEvento,
        {
          flightId: flight.flightId,
          flightCode: flight.flightCode,
          airportCode: result.origen,
          productCount: result.productosAfectados,
          orderIds: flight.orderIds,
        }
      );

      // 4) Mostrar mensaje de éxito (se removió la alerta modal para no interrumpir al usuario)
      console.info('[CANCELAR] Vuelo cancelado (no se muestra alerta modal).', {
        productosAfectados: result.productosAfectados,
        pedidosAfectados: result.pedidosAfectados,
        origen: result.origen,
        destino: result.destino,
      });

      // 5) Si requiere reoptimización, informar al usuario
      if (result.requiereReoptimizacion) {
        console.log('[CANCELACIÓN] Requiere reoptimización para próxima ventana');
        // Aquí podrías:
        // - pausar simulación
        // - llamar ejecutarAlgoritmo() para la siguiente ventana
        // - recargar timeline y reanudar
      }
    } catch (err) {
      console.error(err);
      alert(
          err instanceof Error
              ? err.message
              : 'Error desconocido al cancelar vuelo'
      );
    } finally {
      setCancelingFlightKey(null);
    }
  }
  // Canvas renderer para rutas (sin captura de eventos de puntero)
  const canvasRenderer = useMemo(() => L.canvas({
    padding: 0,
    pane: 'overlayPane' // Asegura que esté debajo de los marcadores
  }), []);

  // Convertir ActiveFlight a formato para AnimatedFlightMarker
  // Los vuelos ya vienen agrupados por vuelo físico desde useTemporalSimulation
  // (múltiples pedidos en el mismo vuelo se muestran como UN solo avión)
  /*const flightsForRender = useMemo(() => {
    const flights = simulation.activeFlights.map(flight => {
      const origin = airports.find(a => a.id === flight.originAirportId);
      const dest = airports.find(a => a.id === flight.destinationAirportId);

      if (!origin || !dest) {
        console.warn(`[MapViewEnVivo] Vuelo ${flight.eventId} sin aeropuertos`);
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
  }, [simulation.activeFlights, airports]);*/
  const flightsForRender = useMemo(() => {
    const flights = simulation.activeFlights
        .filter(flight => {
          // Construir instanciaId igual que en el resto del componente
          const instanciaId = buildInstanciaIdFromFlight(
              flight.flightId,
              flight.departureTime
          );

          const isCanceled =
              canceledFlightInstances.has(instanciaId) ||
              canceledFlightKeys.has(flight.eventId);

          if (isCanceled) {
            console.log('[MAPA] Ocultando vuelo cancelado en mapa', {
              eventId: flight.eventId,
              instanciaId,
            });
            return false; // No lo pasamos al mapa
          }

          return true;
        })
        .map(flight => {
          const origin = airports.find(a => a.id === flight.originAirportId);
          const dest = airports.find(a => a.id === flight.destinationAirportId);

          if (!origin || !dest) {
            console.warn(`[MapViewEnVivo] Vuelo ${flight.eventId} sin aeropuertos`);
            return null;
          }

          return {
            eventId: flight.eventId, // Clave física
            flightId: flight.flightId,
            flightCode: flight.flightCode,
            originCode: origin.codigoIATA || '',
            destinationCode: dest.codigoIATA || '',
            departureTime: flight.departureTime,
            arrivalTime: flight.arrivalTime,
            currentProgress: flight.progress,
            productIds: flight.productIds,
            orderIds: flight.orderIds,
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
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

    return flights;
  }, [
    simulation.activeFlights,
    airports,
    canceledFlightInstances,
    canceledFlightKeys,
  ]);

  // Obtener TODOS los vuelos planificados desde el aeropuerto seleccionado
  // (no solo los activos, sino todos los que están en el timeline)
  const flightsFromSelectedAirport = useMemo(() => {
    if (selectedAirportId == null || !resultado.lineaDeTiempo?.eventos) {
      return [];
    }

    const flightsMap = new Map<string, typeof flightsForRender[0]>();

    // Procesar todos los eventos DEPARTURE del timeline
    resultado.lineaDeTiempo.eventos
      .filter(e => e.tipoEvento === 'DEPARTURE' && e.idAeropuertoOrigen === selectedAirportId)
      .forEach(event => {
        const origin = airports.find(a => a.id === event.idAeropuertoOrigen);
        const dest = airports.find(a => a.id === event.idAeropuertoDestino);

        if (!origin || !dest) return;

        // Usar el mismo formato de clave física que en useTemporalSimulation
        const departureTime = new Date(event.horaEvento);
        const flightPhysicalKey = `${event.idVuelo}-${departureTime.getTime()}-${event.idAeropuertoOrigen}-${event.idAeropuertoDestino}`;

        // Verificar si este vuelo está cancelado
        const instanciaId = buildInstanciaIdFromFlight(event.idVuelo || 0, departureTime);
        /*if (canceledFlightInstances.has(instanciaId)) {
          return; // Saltar vuelos cancelados
        }*/
        // Verificar si este vuelo está cancelado (por instanciaId o por clave física)
        if (canceledFlightInstances.has(instanciaId) || canceledFlightKeys.has(flightPhysicalKey)) {
          console.log('[PANEL] Ocultando vuelo cancelado en lista', {
            flightPhysicalKey,
            instanciaId,
          });
          return; // Saltar vuelos cancelados
        }

        const existingFlight = flightsMap.get(flightPhysicalKey);

        if (existingFlight) {
          // Agregar pedidos a vuelo existente
          const eventOrderIds = event.idsPedidos && event.idsPedidos.length > 0
            ? event.idsPedidos
            : (event.idPedido ? [event.idPedido] : []);

          eventOrderIds.forEach(oid => {
            if (!existingFlight.orderIds.includes(oid)) {
              existingFlight.orderIds.push(oid);
            }
          });
        } else {
          // Calcular cantidad de productos considerando reducciones
          const baseCapacityUsed = event.cantidadProductos || 1;
          const reduction = flightProductReductions.get(instanciaId) || 0;
          const adjustedCapacityUsed = Math.max(0, baseCapacityUsed - reduction);

          // Si después de la reducción no hay productos, no mostrar el vuelo
          if (adjustedCapacityUsed === 0) {
            return;
          }

          // Crear nuevo vuelo
          flightsMap.set(flightPhysicalKey, {
            eventId: flightPhysicalKey,
            flightId: event.idVuelo || 0,
            flightCode: event.codigoVuelo || `Vuelo ${event.idVuelo}`,
            originCode: origin.codigoIATA || '',
            destinationCode: dest.codigoIATA || '',
            departureTime: departureTime,
            arrivalTime: new Date(event.horaEvento), // Placeholder, se calculará
            currentProgress: 0,
            productIds: event.idProducto ? [event.idProducto] : [],
            orderIds: event.idsPedidos && event.idsPedidos.length > 0
              ? [...event.idsPedidos]
              : (event.idPedido ? [event.idPedido] : []),
            originLat: origin.latitud,
            originLon: origin.longitud,
            destLat: dest.latitud,
            destLon: dest.longitud,
            originAirportId: event.idAeropuertoOrigen || 0,
            destinationAirportId: event.idAeropuertoDestino || 0,
            capacityMax: event.capacidadMaxima || 100,
            capacityUsed: adjustedCapacityUsed, // Usar cantidad ajustada
            windowIndex: (event as EventoConVentana).ventanaIndex,
          });
        }
      });

    // Filtrar solo vuelos futuros (no despegados aún)
    return Array.from(flightsMap.values())
      .filter(f => f.departureTime > simulation.currentSimDateTime)
      .sort((a, b) => a.departureTime.getTime() - b.departureTime.getTime());
  }, [selectedAirportId, resultado.lineaDeTiempo, airports, simulation.currentSimDateTime, canceledFlightInstances, canceledFlightKeys,flightProductReductions]);
  // Helper: debe matchear EXACTAMENTE el formato del back
  function buildInstanciaIdFromFlight(
      flightId: number,
      departureTime: Date
  ): string {
    const yyyy = departureTime.getFullYear();
    const mm = String(departureTime.getMonth() + 1).padStart(2, '0');
    const dd = String(departureTime.getDate()).padStart(2, '0');
    const HH = String(departureTime.getHours()).padStart(2, '0');
    const MM = String(departureTime.getMinutes()).padStart(2, '0');

    return `FL-${flightId}-${yyyy}${mm}${dd}-${HH}${MM}`;
  }

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

  /*if (!resultado.lineaDeTiempo) {
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
  }*/

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
              isSelected={selectedAirportId === airport.id}
              onClick={() => setSelectedAirportId(airport.id)}
              onClose={() => {
                // Si se cierra el popup del aeropuerto, limpiar la selección
                setSelectedAirportId(null);
             }}
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
      {/* Panel de vuelos desde aeropuerto seleccionado */}
      {selectedAirportId != null && (
          <div className="absolute left-6 top-80 z-[900]
            w-64 max-h-56
            bg-white/95 backdrop-blur-sm
            rounded-xl p-3
            border border-gray-200 shadow-xl
            pointer-events-auto text-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold tracking-wide text-gray-900">
                Vuelos saliendo del aeropuerto seleccionado
              </h3>
              <button
                  className="text-[10px] text-gray-500 hover:text-gray-700"
                  onClick={() => setSelectedAirportId(null)}
              >
                Cerrar
              </button>
            </div>

            {flightsFromSelectedAirport.length === 0 ? (
                <p className="text-[11px] text-gray-600">
                  No hay vuelos futuros desde este aeropuerto en la simulación.
                </p>
            ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {flightsFromSelectedAirport.map(f => {
                    const instanciaId = buildInstanciaIdFromFlight(
                        f.flightId,
                        f.departureTime
                    );
                    return (
                        <div
                            key={f.eventId}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-[11px]">
                              <div className="font-semibold text-gray-900">
                                {f.flightCode ?? `Vuelo ${f.flightId}`}
                              </div>
                              <div className="text-gray-600 text-[10px]">
                                {f.originCode} → {f.destinationCode}
                              </div>
                            </div>
                            <button
                                className="text-[10px] px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={cancelingFlightKey === f.eventId}
                                onClick={() => handleCancelarVuelo(f)}
                            >
                              {cancelingFlightKey === f.eventId
                                  ? 'Cancelando...'
                                  : 'Cancelar vuelo'}
                            </button>
                          </div>

                          <div className="flex justify-between text-[10px] text-gray-600">
                  <span>
                    Sale:{' '}
                    {f.departureTime.toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                            <span className="flex items-center gap-1">
                    <span>Productos: {f.capacityUsed || 0}</span>
                              {flightProductReductions.get(instanciaId) ? (
                                  <span className="text-amber-400" title="Cantidad reducida por cancelación de vuelo previo">
                        ⚠️
                      </span>
                              ) : null}
                  </span>
                          </div>

                          <div className="flex justify-between text-[10px] text-gray-600">
                            <span>
                    Pedidos:{' '}
                              {f.orderIds && f.orderIds.length > 0
                                  ? f.orderIds.length
                                  : '-'}
                  </span>
                          </div>

                          {f.orderIds && f.orderIds.length > 0 && (
                              <div className="mt-1 text-[10px] text-gray-700">
                    <span className="font-medium text-gray-900">
                      IDs de pedidos:
                    </span>{' '}
                                {f.orderIds.slice(0, 5).join(', ')}
                                {f.orderIds.length > 5 && '…'}
                              </div>
                          )}

                          <div className="mt-1 text-[9px] text-gray-500">
                            Instancia: <code className="text-xs text-gray-600">{instanciaId}</code>
                          </div>
                        </div>
                    );
                  })}
                </div>
            )}
          </div>
      )}

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
                  {/*<h3 className="text-sm font-semibold text-white">Reproductor</h3>*/}
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
                {/*<div className="flex gap-2 mb-3">
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
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 002 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
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
                </div>*/}
                {/* Estado simple "En vivo" en lugar de los botones de control */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    En vivo
                  </span>
                </div>

                {/* Barra de progreso */}
                {/*<div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, Math.max(0, simulation.progressPercent))}%` }}
                  />
                </div>*/}

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
                  events={simulationEvents}
                  enableSearch={true}
                  embedded={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leyenda de ocupación (bottom-left) */}
      <OccupancyLegend />
    </div>
  );
}

