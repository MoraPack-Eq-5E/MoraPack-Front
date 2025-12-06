/**
 * useTemporalSimulation
 *
 * Hook para procesar y reproducir una simulación temporal basada en eventos de timeline.
 *
 * Características:
 * - Control de velocidad (seconds, minutes, hours, days)
 * - Play/Pause/Reset/Seek
 * - Tracking de vuelos activos
 * - Estadísticas en tiempo real
 * - Formateo de tiempo
 * - NUEVO: Sincroniza con Zustand store para persistir entre navegaciones
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { LineaDeTiempoSimulacionDTO, EventoLineaDeTiempoVueloDTO } from '@/services/algoritmoSemanal.service';
import type { SimulationEvent, SimulationEventType } from '@/types/simulation.types';
//import { useSimulationStore } from '@/store';

export interface ActiveFlight {
  eventId: string; // ID único del evento (para diferenciar instancias del mismo vuelo)
  flightId: number;
  flightCode: string;
  productId: number;
  orderId: number;
  productIds: number[];
  orderIds: number[];
  originAirportId: number;
  destinationAirportId: number;
  departureTime: Date;
  arrivalTime: Date;
  progress: number; // 0-1
  capacityMax?: number; // Capacidad máxima del vuelo
  cantidadProductos?: number; // Cantidad de productos en este vuelo
  windowIndex?: number;
  windowIndexes?: number[];
}

export interface FlightCapacityEvent {
  eventType: 'DEPARTURE' | 'ARRIVAL' | 'PICKUP';
  flightId: number;
  airportId: number;
  airportCode?: string; // Código IATA (para PICKUP)
  productIds: number[];
  totalVolume: number;
  timestamp: Date;
}

/**
 * Estado de almacén de un aeropuerto
 */
export interface WarehouseState {
  actual: number;  // Productos actualmente en almacén
  max: number;     // Capacidad máxima
}

/**
 * Información de aeropuerto para inicializar almacenes
 */
export interface AeropuertoInfo {
  id: number;
  codigoIATA: string;
  capacidadActual: number;
  capacidadMaxima: number;
}

/**
 * Recogida pendiente (destino final + 2h)
 */
interface PendingPickup {
  airportCode: string;
  cantidad: number;
  pickupTime: Date;
  flightEventId: string; // ID del evento de vuelo para hacer cada recogida única
}

export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

interface UseTemporalSimulationProps {
  timeline: LineaDeTiempoSimulacionDTO | null | undefined;
  timeUnit?: TimeUnit;
  onFlightCapacityChange?: (event: FlightCapacityEvent) => void;
  aeropuertos?: AeropuertoInfo[];  // Aeropuertos con capacidad inicial
}
function getSecondsPerRealSecond(timeUnit: TimeUnit): number {
  switch (timeUnit) {
    case 'seconds': return 1;      // 1 seg real = 1 seg simulado
    case 'minutes': return 60;     // 1 seg real = 1 min simulado
    case 'hours': return 3600;     // 1 seg real = 1 hora simulada
    case 'days': return 86400;     // 1 seg real = 1 día simulado
  }
}
export function useTemporalSimulation({
                                        timeline,
                                        timeUnit = 'hours',
                                        onFlightCapacityChange,
                                        aeropuertos,
                                      }: UseTemporalSimulationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSimTime, setCurrentSimTime] = useState(0); // segundos desde inicio
  // === Estados de reproducción desde el store global (persisten entre navegaciones) ===
  /*const {
    isPlaying,
    currentSimTime,
    play: storePlay,
    pause: storePause,
    reset: storeReset,
    seek: storeSeek,
  } = useSimulationStore();*/
  
  // === Estados locales del hook (se recalculan cuando el componente se monta) ===
  const [activeFlights, setActiveFlights] = useState<ActiveFlight[]>([]);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [flightStats, setFlightStats] = useState({
    completed: 0,
    inFlight: 0,
    pending: 0,
  });
  
  // Eventos de simulación para el EventFeed
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);

  // Estado de almacenamiento por aeropuerto (código IATA -> estado)
  const [warehouseStorage, setWarehouseStorage] = useState<Map<string, WarehouseState>>(new Map());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rastrear qué eventos de capacidad ya se han disparado para evitar duplicados
  const processedCapacityEventsRef = useRef<Set<string>>(new Set());

  // Cola de recogidas pendientes (destino final + 2h)
  const pendingPickupsRef = useRef<PendingPickup[]>([]);

  // Eventos de warehouse ya procesados para evitar duplicados
  const processedWarehouseEventsRef = useRef<Set<string>>(new Set());
  
  // Eventos de simulación ya generados para evitar duplicados
  const generatedSimEventsRef = useRef<Set<string>>(new Set());

  // Refs para callbacks
  const onFlightCapacityChangeRef = useRef(onFlightCapacityChange);
  const [completedOrderIdsList, setCompletedOrderIdsList] = useState<number[]>([]);
  
  // Contador para generar IDs únicos de eventos
  const eventIdCounterRef = useRef(0);
  
  /**
   * Genera un evento de simulación y lo añade a la lista
   */
  const addSimulationEvent = useCallback((
    type: SimulationEventType,
    message: string,
    simulatedTime: Date,
    details?: {
      flightId?: number;
      flightCode?: string;
      orderId?: number;
      orderIds?: number[];
      airportCode?: string;
      airportName?: string;
      productCount?: number;
    }
  ) => {
    const eventKey = `${type}-${simulatedTime.getTime()}-${details?.flightCode || ''}-${details?.airportCode || ''}-${details?.orderId || ''}`;
    
    // Evitar duplicados
    if (generatedSimEventsRef.current.has(eventKey)) {
      return;
    }
    generatedSimEventsRef.current.add(eventKey);
    
    const newEvent: SimulationEvent = {
      id: `evt-${++eventIdCounterRef.current}`,
      type,
      message,
      simulatedTime: simulatedTime.toISOString(),
      realTime: new Date().toISOString(),
      relatedFlightId: details?.flightId,
      relatedFlightCode: details?.flightCode,
      relatedOrderId: details?.orderId,
      relatedOrderIds: details?.orderIds,
      relatedAirportCode: details?.airportCode,
      relatedAirportName: details?.airportName,
      productCount: details?.productCount,
    };
    
    //setSimulationEvents(prev => [newEvent, ...prev].slice(0, 100)); // Mantener máximo 100 eventos
    setSimulationEvents(prev => {
      const all = [...prev, newEvent];

      all.sort((a, b) => {
        const ta = new Date(a.simulatedTime).getTime();
        const tb = new Date(b.simulatedTime).getTime();
        return tb - ta; // más tarde arriba
      });

      return all.slice(0, 100);
    });
  }, []);
  // Actualizar ref cuando callback cambia
  useEffect(() => {
    onFlightCapacityChangeRef.current = onFlightCapacityChange;
  }, [onFlightCapacityChange]);

  // Inicializar estado de almacenes cuando se cargan aeropuertos
  useEffect(() => {
    if (aeropuertos && aeropuertos.length > 0) {
      const initialStorage = new Map<string, WarehouseState>();
      aeropuertos.forEach(ap => {
        initialStorage.set(ap.codigoIATA, {
          actual: ap.capacidadActual,
          max: ap.capacidadMaxima,
        });
      });
      setWarehouseStorage(initialStorage);
      // console.log(`[useTemporalSimulation] Almacenes inicializados: ${initialStorage.size} aeropuertos`);
    }
  }, [aeropuertos]);
  // Velocidad de reproducción
  const playbackSpeed = useMemo(() => getSecondsPerRealSecond(timeUnit), [timeUnit]);
  // Hora de inicio de simulación
  const simulationStartTime = useMemo(() => {
    if (!timeline) return new Date();
    return new Date(timeline.horaInicioSimulacion);
  }, [timeline]);

  // Duración total en segundos
  const totalDurationSeconds = useMemo(() => {
    //return (timeline?.duracionTotalMinutos || 0) * 60;
    if (!timeline) return 0;

    // 1) Si viene duracionTotalMinutos > 0 desde el back, úsalo
    if (timeline.duracionTotalMinutos && timeline.duracionTotalMinutos > 0) {
      return timeline.duracionTotalMinutos * 60;
    }

    // 2) Si tenemos horaInicioSimulacion y horaFinSimulacion, úsalas
    if (timeline.horaInicioSimulacion && timeline.horaFinSimulacion) {
      const start = new Date(timeline.horaInicioSimulacion);
      const end = new Date(timeline.horaFinSimulacion);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        return diffMs / 1000;
      }
    }

    // 3) Fallback: calcular desde las horas de los eventos
    if (timeline.eventos && timeline.eventos.length > 0) {
      const times = timeline.eventos.map(e => new Date(e.horaEvento).getTime());
      const min = Math.min(...times);
      const max = Math.max(...times);
      if (max > min) {
        return (max - min) / 1000;
      }
    }

    // 4) Último recurso: 1h por defecto
    return 3600;
  }, [timeline]);

  // Hora actual de simulación
  const currentSimDateTime = useMemo(() => {
    return new Date(simulationStartTime.getTime() + currentSimTime * 1000);
  }, [simulationStartTime, currentSimTime]);

  // Calcular total de pedidos únicos (usando idsPedidos si está disponible)
  const totalOrdersCount = useMemo(() => {
    if (!timeline?.eventos || timeline.eventos.length === 0) {
      return 0;
    }

    const uniqueOrderIds = new Set<number>();
    timeline.eventos.forEach(event => {
      // Usar la lista completa de pedidos si está disponible
      if (event.idsPedidos && event.idsPedidos.length > 0) {
        event.idsPedidos.forEach(id => uniqueOrderIds.add(id));
      } else if (event.idPedido) {
        // Fallback al campo individual
        uniqueOrderIds.add(event.idPedido);
      }
    });

    return uniqueOrderIds.size;
  }, [timeline]);

  // Mapa de idPedido → codigoDestinoFinal (para saber cuándo un pedido está realmente entregado)
  const orderFinalDestinations = useMemo(() => {
    const map = new Map<number, string>();

    if (timeline?.rutasProductos) {
      timeline.rutasProductos.forEach(ruta => {
        if (!ruta.idPedido) return;
        
        // Si ya tenemos el destino para este pedido, no sobrescribir
        if (map.has(ruta.idPedido)) return;
        
        // Prioridad 1: usar codigoDestino de la ruta (destino final del pedido)
        if (ruta.codigoDestino) {
          map.set(ruta.idPedido, ruta.codigoDestino);
          return;
        }

        // Prioridad 2: usar el destino del último vuelo de la ruta
        if (ruta.vuelos && ruta.vuelos.length > 0) {
          const ultimoVuelo = ruta.vuelos[ruta.vuelos.length - 1];
          const destino = ultimoVuelo.codigoDestino;
          if (destino) {
            map.set(ruta.idPedido, destino);
            return;
          }
        }
      });
    }
    
    // También extraer destinos de los eventos con esDestinoFinal=true
    if (timeline?.eventos) {
      timeline.eventos.forEach(evento => {
        if (evento.tipoEvento === 'ARRIVAL' && evento.esDestinoFinal && evento.codigoIATADestino) {
          // Para cada pedido en este evento que llega a destino final
          const pedidos = evento.idsPedidos || (evento.idPedido ? [evento.idPedido] : []);
          pedidos.forEach(idPedido => {
            if (!map.has(idPedido)) {
              map.set(idPedido, evento.codigoIATADestino!);
            }
          });
        }
      });
    }

    return map;
  }, [timeline]);
  useEffect(() => {
    // Debug: ver qué pedidos están marcados con OMDB como destino final
    const debug: number[] = [];
    orderFinalDestinations.forEach((dest, idPedido) => {
      if (dest === 'LOWW') debug.push(idPedido);
    });
    if (debug.length > 0) {
      console.log('[DEBUG destinos finales OMDB] pedidos:', debug);
    }
  }, [orderFinalDestinations]);

  const isFinalDestinationForOrders = useCallback(
      (airportCode: string | undefined | null, orderIds: number[]): boolean => {
        if (!airportCode || orderIds.length === 0) return false;

        return orderIds.some(id => orderFinalDestinations.get(id) === airportCode);
      },
      [orderFinalDestinations]
  );

  // NUEVO: Mapa de idVuelo → tiempos reales calculados por ALNS
  // Estructura: Map<idVuelo, { horaSalidaReal, horaLlegadaReal }>
  const flightRealTimes = useMemo(() => {
    const map = new Map<number, { horaSalidaReal: Date | null; horaLlegadaReal: Date | null }>();

    if (timeline?.rutasProductos) {
      timeline.rutasProductos.forEach(ruta => {
        if (ruta.vuelos) {
          ruta.vuelos.forEach(vuelo => {
            if (vuelo.id && !map.has(vuelo.id)) {
              map.set(vuelo.id, {
                horaSalidaReal: vuelo.horaSalidaReal ? new Date(vuelo.horaSalidaReal) : null,
                horaLlegadaReal: vuelo.horaLlegadaReal ? new Date(vuelo.horaLlegadaReal) : null,
              });
            }
          });
        }
      });
    }
    console.log("[flightRealTimes]", Array.from(map.entries()));
    return map;
  }, [timeline]);

  // Procesar eventos y crear pares DEPARTURE-ARRIVAL
  // IMPORTANTE: Emparejar por número de evento (DEP-X ↔ ARR-X), no por idVuelo
  // NUEVO: Usar tiempos reales del ALNS cuando estén disponibles
  const flightPairs = useMemo(() => {
    if (!timeline?.eventos || timeline.eventos.length === 0) {
      return [];
    }

    // Extraer número del idEvento (ej: "ARR-5" → "5", "DEP-123-45-0" → "123-45-0")
    const extractEventNumber = (idEvento: string): string => {
      return idEvento.replace(/^(DEP|ARR)-/, '');
    };

    // Indexar LLEGADAs (ARRIVAL) por número de evento
    const arrivalMap = new Map<string, EventoLineaDeTiempoVueloDTO>();
    timeline.eventos.forEach(event => {
      if (event.tipoEvento === 'ARRIVAL' && event.idEvento) {
        const eventNumber = extractEventNumber(event.idEvento);
        arrivalMap.set(eventNumber, event);
      }
    });

    // Crear pares para cada SALIDA (DEPARTURE)
    return timeline.eventos
        .filter(event => event.tipoEvento === 'DEPARTURE')
        .map(departure => {
          // Buscar ARRIVAL correspondiente por número de evento
          const eventNumber = extractEventNumber(departure.idEvento);
          const arrival = arrivalMap.get(eventNumber) || null;

          // NUEVO: Intentar usar tiempos reales del ALNS si están disponibles
          const flightId = departure.idVuelo || 0;
          const realTimes = flightRealTimes.get(flightId);

          // Priorizar tiempos reales del ALNS, luego eventos, luego null
          let departureTime: Date;
          let arrivalTime: Date | null;

          if (realTimes?.horaSalidaReal) {
            // Usar tiempo real calculado por ALNS
            departureTime = realTimes.horaSalidaReal;
          } else {
            // Fallback: usar hora del evento
            departureTime = new Date(departure.horaEvento);
          }

          if (realTimes?.horaLlegadaReal) {
            // Usar tiempo real calculado por ALNS
            arrivalTime = realTimes.horaLlegadaReal;
          } else if (arrival) {
            // Fallback: usar hora del evento de llegada
            arrivalTime = new Date(arrival.horaEvento);
          } else {
            arrivalTime = null;
          }
          console.log("[flightPairs] vuelo", flightId, {
            departureTime,
            arrivalTime,
            fromRealTimes: !!realTimes?.horaSalidaReal,
          });
          return {
            departureEvent: departure,
            arrivalEvent: arrival,
            departureTime,
            arrivalTime,
          };
        });
  }, [timeline, flightRealTimes]);

  // Actualizar vuelos activos según tiempo actual
  useEffect(() => {
    if (flightPairs.length === 0) {
      setActiveFlights([]);
      setCompletedOrdersCount(0);
      setFlightStats({ completed: 0, inFlight: 0, pending: 0 });
      return;
    }

    const currentDateTime = new Date(simulationStartTime.getTime() + currentSimTime * 1000);
    const flightsMap = new Map<string, ActiveFlight>();
    const completedOrderIds = new Set<number>();

    let completedCount = 0;
    let pendingCount = 0;
    
    flightPairs.forEach(pair => {
      const { departureEvent, departureTime, arrivalTime } = pair;
      const hasDeparted = departureTime <= currentDateTime;
      const windowIndex = (departureEvent as unknown as { ventanaIndex?: number }).ventanaIndex;
      // Calcular arrival time efectivo (real o estimado)
      let effectiveArrivalTime = arrivalTime;
      if (!effectiveArrivalTime && hasDeparted) {
        // Fallback: usar tiempoTransporteDias o 0.5 días (12 horas) por defecto
        const transportDays = departureEvent.tiempoTransporteDias || 0.5;
        effectiveArrivalTime = new Date(
            departureTime.getTime() + transportDays * 24 * 60 * 60 * 1000
        );
      }

      const hasArrived = effectiveArrivalTime
          ? effectiveArrivalTime <= currentDateTime
          : false;

      const flightId = departureEvent.idVuelo || 0;
      const eventId = departureEvent.idEvento; // Usar eventId único para claves
      const departureKey = `${eventId}-departed`;
      const arrivalKey = `${eventId}-arrived`;

      // CORREGIDO: Disparar DEPARTURE cuando el vuelo ha despegado (sin importar si llegó)
      // Esto debe ejecutarse ANTES de verificar si llegó
      if (hasDeparted && departureEvent.idAeropuertoOrigen) {
        if (
            onFlightCapacityChangeRef.current &&
            !processedCapacityEventsRef.current.has(`${departureKey}-capacity`)
        ) {
          processedCapacityEventsRef.current.add(`${departureKey}-capacity`);

          const totalVolume = departureEvent.cantidadProductos || 1;

          onFlightCapacityChangeRef.current({
            eventType: 'DEPARTURE',
            flightId: flightId,
            airportId: departureEvent.idAeropuertoOrigen,
            productIds: [departureEvent.idProducto || 0],
            totalVolume: totalVolume,
            timestamp: departureTime, // Usar tiempo de despegue real
          });
          
          // Generar evento de simulación: Pedido(s) despegaron
          // IMPORTANTE: Hacer copia del array para evitar problemas de referencia
          const orderIds = departureEvent.idsPedidos && departureEvent.idsPedidos.length > 0
              ? [...departureEvent.idsPedidos]  // Copia del array
              : (departureEvent.idPedido ? [departureEvent.idPedido] : []);

          if (orderIds.length > 0) {
            const origenCode = departureEvent.codigoIATAOrigen || departureEvent.ciudadOrigen || 'N/A';
            const destinoCode = departureEvent.codigoIATADestino || departureEvent.ciudadDestino || 'N/A';
            const flightCode = departureEvent.codigoVuelo || `V${flightId}`;
            
            const orderText = orderIds.length === 1 
              ? `Pedido #${orderIds[0]}` 
              : `${orderIds.length} pedidos`;
            
            addSimulationEvent(
              'ORDER_DEPARTED',
              `${orderText} despegó en vuelo ${flightCode} (${origenCode} → ${destinoCode})`,
              departureTime,
              {
                flightId,
                flightCode,
                orderIds,  // Ahora es una copia, no se modificará
                airportCode: origenCode,
                productCount: totalVolume,
              }
            );
          }
        }
      }

      if (hasArrived && effectiveArrivalTime) {
        // ✅ Vuelo completado - pero solo marcar pedido como entregado si llegó al DESTINO FINAL
        // Preferir campos del evento de llegada (arrivalEvent) para determinar el aeropuerto donde realmente llegó
        //const destinoVuelo = departureEvent.ciudadDestino;
        const destinoVuelo =
            departureEvent.codigoIATADestino || departureEvent.ciudadDestino;

        if (departureEvent.idsPedidos && departureEvent.idsPedidos.length > 0) {
          departureEvent.idsPedidos.forEach(id => {
            const destinoFinal = orderFinalDestinations.get(id);
            // Solo marcar como completado si llegó al destino final del pedido
            if (!destinoFinal || destinoVuelo === destinoFinal) {
              completedOrderIds.add(id);
            }
          });
        } else if (departureEvent.idPedido) {
          const destinoFinal = orderFinalDestinations.get(departureEvent.idPedido);
          if (!destinoFinal || destinoVuelo === destinoFinal) {
            completedOrderIds.add(departureEvent.idPedido);
          }
        }
        completedCount++;

        // Disparar evento de capacidad ARRIVAL (solo una vez)
        if (
            onFlightCapacityChangeRef.current &&
            !processedCapacityEventsRef.current.has(`${arrivalKey}-capacity`) &&
            departureEvent.idAeropuertoDestino
        ) {
          processedCapacityEventsRef.current.add(`${arrivalKey}-capacity`);

          // Usar cantidadProductos del DTO
          const totalVolume = departureEvent.cantidadProductos || 1;

          onFlightCapacityChangeRef.current({
            eventType: 'ARRIVAL',
            flightId: flightId,
            airportId: departureEvent.idAeropuertoDestino,
            productIds: [departureEvent.idProducto || 0],
            totalVolume: totalVolume,
            timestamp: effectiveArrivalTime, // Usar tiempo de llegada real
          });
          
          // Generar evento de simulación: Pedido(s) llegaron
          // IMPORTANTE: Hacer copia del array para evitar problemas de referencia
          const orderIds = departureEvent.idsPedidos && departureEvent.idsPedidos.length > 0
              ? [...departureEvent.idsPedidos]  // Copia del array
              : (departureEvent.idPedido ? [departureEvent.idPedido] : []);
          if (orderIds.length > 0 && effectiveArrivalTime) {
            // Preferir código IATA del evento de llegada
            /*const destinoCode = departureEvent.codigoIATADestino || departureEvent.ciudadDestino || 'N/A';
            const flightCode = departureEvent.codigoVuelo || `V${flightId}`;
            const esDestinoFinal = pair.arrivalEvent?.esDestinoFinal === true;*/
            
            /*const orderText = orderIds.length === 1
              ? `Pedido #${orderIds[0]}` 
              : `${orderIds.length} pedidos`;
            
            if (esDestinoFinal) {
              // Llegó al destino final
              addSimulationEvent(
                'ORDER_AT_DESTINATION',
                `${orderText} llegó a destino final ${destinoCode}`,
                effectiveArrivalTime,
                {
                  flightId,
                  flightCode,
                  orderIds,  // Ahora es una copia
                  airportCode: destinoCode,
                  productCount: totalVolume,
                }
              );
            } else {
              // Llegó a una escala
              addSimulationEvent(
                'ORDER_ARRIVED_AIRPORT',
                `${orderText} llegó al aeropuerto ${destinoCode} (escala)`,
                effectiveArrivalTime,
                {
                  flightId,
                  flightCode,
                  orderIds,  // Ahora es una copia
                  airportCode: destinoCode,
                  productCount: totalVolume,
                }
              );
            }*/
            const destinoCode = departureEvent.codigoIATADestino || departureEvent.ciudadDestino || 'N/A';
            const flightCode = departureEvent.codigoVuelo || `V${flightId}`;

            // Lista de pedidos de este vuelo
            const orderIds = departureEvent.idsPedidos && departureEvent.idsPedidos.length > 0
                ? [...departureEvent.idsPedidos]
                : (departureEvent.idPedido ? [departureEvent.idPedido] : []);

            // 1) lo que dice el back
            const esDestinoFinalBack = pair.arrivalEvent?.esDestinoFinal === true;
            // 2) lo que dice nuestro mapa de destinos finales
            const esDestinoFinalMapa = isFinalDestinationForOrders(destinoCode, orderIds);

            // Regla combinada: solo tratamos como final si al menos una de estas condiciones se cumple
            const esDestinoFinal = esDestinoFinalBack || esDestinoFinalMapa;

            const orderText = orderIds.length === 1
                ? `Pedido #${orderIds[0]}`
                : `${orderIds.length} pedidos`;

            if (esDestinoFinal) {
              addSimulationEvent(
                  'ORDER_AT_DESTINATION',
                  `${orderText} llegó a destino final ${destinoCode}`,
                  effectiveArrivalTime,
                  {
                    flightId,
                    flightCode,
                    orderIds,
                    airportCode: destinoCode,
                    productCount: totalVolume,
                  }
              );
            } else {
              addSimulationEvent(
                  'ORDER_ARRIVED_AIRPORT',
                  `${orderText} llegó al aeropuerto ${destinoCode} (escala)`,
                  effectiveArrivalTime,
                  {
                    flightId,
                    flightCode,
                    orderIds,
                    airportCode: destinoCode,
                    productCount: totalVolume,
                  }
              );
            }

          }
        }
      } else if (hasDeparted && effectiveArrivalTime) {
        // ✈️ Vuelo en progreso

        // Validar que tenga aeropuertos válidos
        const hasValidAirports =
            departureEvent.idAeropuertoOrigen &&
            departureEvent.idAeropuertoDestino;

        if (!hasValidAirports) {
          return; // Skip vuelos sin aeropuertos válidos
        }

        const totalDuration = effectiveArrivalTime.getTime() - departureTime.getTime();
        const elapsed = currentDateTime.getTime() - departureTime.getTime();
        const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
        
        const flightPhysicalKey = `${departureEvent.idVuelo}-${departureTime.getTime()}-${departureEvent.idAeropuertoOrigen}-${departureEvent.idAeropuertoDestino}`;
        
        // Extraer pedidos y productos de este evento
        const eventProductIds = departureEvent.idProducto ? [departureEvent.idProducto] : [];
        const eventOrderIds = departureEvent.idsPedidos && departureEvent.idsPedidos.length > 0
          ? departureEvent.idsPedidos
          : (departureEvent.idPedido ? [departureEvent.idPedido] : []);
        
        // Verificar si ya existe un vuelo con esta clave física
        const existingFlight = flightsMap.get(flightPhysicalKey);
        
        if (existingFlight) {
          // Agregar pedidos y productos a vuelo existente (sin duplicados)
          eventProductIds.forEach(pid => {
            if (!existingFlight.productIds.includes(pid)) {
              existingFlight.productIds.push(pid);
            }
          });
          eventOrderIds.forEach(oid => {
            if (!existingFlight.orderIds.includes(oid)) {
              existingFlight.orderIds.push(oid);
            }
          });
          // Sumar cantidad de productos
          existingFlight.cantidadProductos = (existingFlight.cantidadProductos || 0) + (departureEvent.cantidadProductos || 1);
          // 🔹 Acumular ventanas
          if (typeof windowIndex === 'number') {
            const prev = existingFlight.windowIndexes ?? [];
            if (!prev.includes(windowIndex)) {
              existingFlight.windowIndexes = [...prev, windowIndex];
            }
            // opcional: mantenemos windowIndex como “última ventana”
            existingFlight.windowIndex = windowIndex;
          }
        } else {
          // Crear nuevo vuelo
          let windowIndexes: number[] | undefined = undefined;
          if (typeof windowIndex === 'number') {
            windowIndexes = [windowIndex];
          }
          flightsMap.set(flightPhysicalKey, {
            eventId: flightPhysicalKey, // Usar clave física como eventId
            flightId: departureEvent.idVuelo || 0,
            flightCode: departureEvent.codigoVuelo || 'N/A',
            productId: departureEvent.idProducto || 0,
            orderId: departureEvent.idPedido || 0,
            productIds: eventProductIds,
            orderIds: eventOrderIds,
            originAirportId: departureEvent.idAeropuertoOrigen || 0,
            destinationAirportId: departureEvent.idAeropuertoDestino || 0,
            departureTime,
            arrivalTime: effectiveArrivalTime,
            progress,
            capacityMax: departureEvent.capacidadMaxima, // Capacidad del vuelo desde backend
            cantidadProductos: departureEvent.cantidadProductos || 1, // Cantidad de productos
            windowIndex: typeof windowIndex === 'number' ? windowIndex : undefined,
            windowIndexes,
          });
        }
      } else {
        // ⏳ Vuelo pendiente
        pendingCount++;
      }
    });
    
    // Logging comentado - vuelos con aeropuertos inválidos
    // if (flightsWithInvalidAirports > 0 && currentSimTime === 0) {
    //   console.warn(`[useTemporalSimulation] ${flightsWithInvalidAirports} vuelos inválidos`);
    // }
    
    const activeFlightsList = Array.from(flightsMap.values());
    
    // Logs de simulación comentados para análisis de pickups
    // const shouldLog = Math.floor(currentSimTime) % 30 === 0 && currentSimTime > 0;
    // if (shouldLog) { console.log(...) }
    
    setActiveFlights(activeFlightsList);
    setCompletedOrdersCount(completedOrderIds.size);
    setFlightStats({
      completed: completedCount,
      inFlight: activeFlightsList.length,
      pending: pendingCount,
    });
    setCompletedOrderIdsList(Array.from(completedOrderIds));
  }, [currentSimTime, flightPairs, simulationStartTime, orderFinalDestinations, addSimulationEvent]);

  // Actualizar almacenamiento de aeropuertos según eventos
  useEffect(() => {
    if (flightPairs.length === 0 || warehouseStorage.size === 0) return;

    const currentDateTime = new Date(simulationStartTime.getTime() + currentSimTime * 1000);
    let storageChanged = false;
    const newStorage = new Map(warehouseStorage);
    const vueloVentanas = new Map<number, Set<number>>();
    flightPairs.forEach(pair => {

      const { departureEvent, arrivalEvent, departureTime, arrivalTime } = pair;
      const idVuelo = departureEvent.idVuelo;
      const ventana = (departureEvent as any).ventanaIndex;

      if (typeof idVuelo === 'number' && typeof ventana === 'number') {
        if (!vueloVentanas.has(idVuelo)) {
          vueloVentanas.set(idVuelo, new Set());
        }
        vueloVentanas.get(idVuelo)!.add(ventana);
      }
      const cantidadProductos = departureEvent.cantidadProductos || 1;
      // Usar códigos IATA (nuevos campos) con fallback a los campos legacy
      const origenCode = departureEvent.codigoIATAOrigen || departureEvent.ciudadOrigen;
      const destinoCode = departureEvent.codigoIATADestino || departureEvent.ciudadDestino;
      const eventId = departureEvent.idEvento;

      // DEPARTURE: Restar productos del aeropuerto origen
      const departureKey = `${eventId}-warehouse-departure`;
      if (
          departureTime <= currentDateTime &&
          origenCode &&
          !processedWarehouseEventsRef.current.has(departureKey)
      ) {
        processedWarehouseEventsRef.current.add(departureKey);
        const origenState = newStorage.get(origenCode);
        if (origenState) {
          newStorage.set(origenCode, {
            ...origenState,
            actual: Math.max(0, origenState.actual - cantidadProductos),
          });
          storageChanged = true;
        }
      }

      // ARRIVAL: Sumar productos al aeropuerto destino
      const effectiveArrivalTime = arrivalTime || (departureTime ? new Date(departureTime.getTime() + 12 * 60 * 60 * 1000) : null);
      const arrivalKey = `${eventId}-warehouse-arrival`;
      if (
          effectiveArrivalTime &&
          effectiveArrivalTime <= currentDateTime &&
          destinoCode &&
          !processedWarehouseEventsRef.current.has(arrivalKey)
      ) {
        processedWarehouseEventsRef.current.add(arrivalKey);
        const destinoState = newStorage.get(destinoCode);
        if (destinoState) {
          newStorage.set(destinoCode, {
            ...destinoState,
            actual: Math.min(destinoState.max, destinoState.actual + cantidadProductos),
          });
          storageChanged = true;
        }
        // Construir lista de pedidos de ese vuelo
        const pedidosVuelo =
            departureEvent.idsPedidos && departureEvent.idsPedidos.length > 0
                ? [...departureEvent.idsPedidos]
                : (departureEvent.idPedido ? [departureEvent.idPedido] : []);

        // 1) flag que viene del back
        const esDestinoFinalBack = arrivalEvent?.esDestinoFinal === true;
        // 2) verificación con nuestro mapa
        const esDestinoFinalMapa = isFinalDestinationForOrders(destinoCode, pedidosVuelo);

        // Solo programar pickup si realmente es destino final
        const esDestinoFinal = esDestinoFinalBack || esDestinoFinalMapa;
        // Solo programar pickup si es DESTINO FINAL (no escalas)
        // Verificar usando el campo esDestinoFinal del arrivalEvent
        //const esDestinoFinal = arrivalEvent?.esDestinoFinal === true;
        
        if (esDestinoFinal) {
          const pickupTime = new Date(effectiveArrivalTime.getTime() + 2 * 60 * 60 * 1000); // +2 horas
          const flightPickupKey = `scheduled-pickup-flight-${eventId}`;
          
          // Solo programar si no se ha programado antes para este vuelo
          if (!processedWarehouseEventsRef.current.has(flightPickupKey)) {
            processedWarehouseEventsRef.current.add(flightPickupKey);
            pendingPickupsRef.current.push({
              airportCode: destinoCode,
              cantidad: cantidadProductos, // Toda la cantidad del vuelo
              pickupTime,
              flightEventId: eventId, // Usar eventId para hacer la recogida única
            });
            console.log(`[PICKUP] Programado vuelo ${eventId} (${cantidadProductos} productos) para recoger en ${destinoCode} a las ${pickupTime.toISOString()}`);
          }
        }
      }
    });
    
    // Procesar recogidas pendientes (cliente recoge +2h después de llegar a destino final)
    const remainingPickups: PendingPickup[] = [];
    
    // Solo loggear cuando hay pickups pendientes
    if (pendingPickupsRef.current.length > 0) {
      console.log(`[PICKUP-CHECK] ${pendingPickupsRef.current.length} pickups pendientes. Hora: ${currentDateTime.toISOString()}`);
    }
    
    pendingPickupsRef.current.forEach(pickup => {
      // Key única por vuelo para evitar procesar el mismo vuelo dos veces
      const pickupKey = `processed-pickup-flight-${pickup.flightEventId}`;
      const yaLlegoHora = pickup.pickupTime <= currentDateTime;
      const yaProcesado = processedWarehouseEventsRef.current.has(pickupKey);
      
      if (yaLlegoHora && !yaProcesado) {
        processedWarehouseEventsRef.current.add(pickupKey);
        console.log(`[PICKUP] ✅ Vuelo ${pickup.flightEventId} (${pickup.cantidad} productos) recogido en ${pickup.airportCode}`);
        
        const airportState = newStorage.get(pickup.airportCode);
        if (airportState) {
          newStorage.set(pickup.airportCode, {
            ...airportState,
            actual: Math.max(0, airportState.actual - pickup.cantidad),
          });
          storageChanged = true;
          
          // Disparar evento PICKUP para actualizar visualización
          if (onFlightCapacityChangeRef.current) {
            onFlightCapacityChangeRef.current({
              eventType: 'PICKUP',
              flightId: 0, // No aplica para pickup
              airportId: 0, // Se usa airportCode en su lugar
              airportCode: pickup.airportCode,
              productIds: [],
              totalVolume: pickup.cantidad,
              timestamp: pickup.pickupTime,
            });
          }
          
          // Generar evento de simulación: Cliente recogió pedido(s)
          addSimulationEvent(
            'ORDER_PICKED_UP',
            `Cliente recogió ${pickup.cantidad} producto${pickup.cantidad > 1 ? 's' : ''} en ${pickup.airportCode}`,
            pickup.pickupTime,
            {
              airportCode: pickup.airportCode,
              productCount: pickup.cantidad,
            }
          );
        }
      } else if (pickup.pickupTime > currentDateTime) {
        remainingPickups.push(pickup);
      }
      // Si yaLlegoHora=true pero yaProcesado=true, simplemente se descarta (ya fue recogido)
    });
    
    // Debug: mostrar si hubo cambios en la cola
    if (pendingPickupsRef.current.length !== remainingPickups.length) {
      console.log(`[PICKUP] Cola: ${pendingPickupsRef.current.length} → ${remainingPickups.length} pendientes`);
    }
    pendingPickupsRef.current = remainingPickups;

    if (storageChanged) {
      setWarehouseStorage(newStorage);
    }
    /*for (const [id, ventanas] of vueloVentanas) {
      if (ventanas.size > 1) {
        console.log('⛔ Vuelo con múltiples ventanas', id, Array.from(ventanas));
      }
    }*/
  }, [currentSimTime, flightPairs, simulationStartTime, warehouseStorage, addSimulationEvent]);
  // Control de reproducción con interval
  useEffect(() => {
    if (isPlaying && timeline) {
      intervalRef.current = setInterval(() => {
        setCurrentSimTime(prev => {
          const newTime = prev + playbackSpeed / 5; // Actualizar 5 veces por segundo

          if (newTime >= totalDurationSeconds) {
            setIsPlaying(false);
            return totalDurationSeconds;
          }
          return newTime;
        });
      }, 200); // 200ms intervals - reduce carga para permitir interacción
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDurationSeconds, timeline]);
  // === El control de reproducción (interval) ahora está en el store global ===
  // El store maneja el interval, así que el playback continúa aunque el componente se desmonte

  // Controles - ahora usan las funciones del store
  const play = useCallback(() => {
    setCurrentSimTime(prev => {
      // Si llegamos al final, reiniciar
      if (prev >= totalDurationSeconds) return 0;
      return prev;
    });
    setIsPlaying(true);
  }, [totalDurationSeconds]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentSimTime(0);

    // Limpiar eventos de capacidad procesados
    processedCapacityEventsRef.current.clear();

    // Limpiar eventos de warehouse procesados y pickups pendientes
    processedWarehouseEventsRef.current.clear();
    pendingPickupsRef.current = [];
    
    // Limpiar eventos de simulación generados
    generatedSimEventsRef.current.clear();
    setSimulationEvents([]);
    eventIdCounterRef.current = 0;

    // Reinicializar almacenes a estado inicial
    if (aeropuertos && aeropuertos.length > 0) {
      const initialStorage = new Map<string, WarehouseState>();
      aeropuertos.forEach(ap => {
        initialStorage.set(ap.codigoIATA, {
          actual: ap.capacidadActual,
          max: ap.capacidadMaxima,
        });
      });
      setWarehouseStorage(initialStorage);
    }
  }, [aeropuertos]);

  const seek = useCallback((seconds: number) => {
    setCurrentSimTime(Math.max(0, Math.min(totalDurationSeconds, seconds)));
  }, [totalDurationSeconds]);

  // Formatear tiempo como "1d 12:30:45" o "12:30:45"
  const formatSimulationTime = useCallback((seconds: number): string => {
    const totalSeconds = Math.floor(seconds);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  // Porcentaje de progreso
  const progressPercent = totalDurationSeconds > 0 
    ? (currentSimTime / totalDurationSeconds) * 100 
    : 0;
  
  // Logging inicial comentado
  // useEffect(() => {
  //   if (timeline && flightPairs.length > 0) {
  //     console.log('[useTemporalSimulation] Inicializado:', {...});
  //   }
  // }, [timeline, flightPairs.length, totalDurationSeconds, timeUnit]);
  
  return {
    // Estado
    isPlaying,
    currentSimTime,
    currentSimDateTime,
    totalDurationSeconds,
    activeFlights,
    completedOrdersCount,
    totalOrdersCount,
    flightStats,
    progressPercent,
    warehouseStorage,  // Estado de almacenes por aeropuerto
    completedOrderIds: completedOrderIdsList,
    simulationEvents,  // Eventos de simulación para EventFeed

    // Controles
    play,
    pause,
    reset,
    seek,

    // Utilidades
    formatSimulationTime,
    addSimulationEvent,  // Para agregar eventos personalizados
  };
}
