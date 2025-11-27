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
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { LineaDeTiempoSimulacionDTO, EventoLineaDeTiempoVueloDTO } from '@/services/algoritmoSemanal.service';

export interface ActiveFlight {
  eventId: string; // ID único del evento (para diferenciar instancias del mismo vuelo)
  flightId: number;
  flightCode: string;
  productId: number;
  orderId: number;
  originAirportId: number;
  destinationAirportId: number;
  departureTime: Date;
  arrivalTime: Date;
  progress: number; // 0-1
  capacityMax?: number; // Capacidad máxima del vuelo
  cantidadProductos?: number; // Cantidad de productos en este vuelo
}

export interface FlightCapacityEvent {
  eventType: 'DEPARTURE' | 'ARRIVAL';
  flightId: number;
  airportId: number;
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
  // Estados principales
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSimTime, setCurrentSimTime] = useState(0); // segundos desde inicio
  const [activeFlights, setActiveFlights] = useState<ActiveFlight[]>([]);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [flightStats, setFlightStats] = useState({
    completed: 0,
    inFlight: 0,
    pending: 0,
  });
  
  // Estado de almacenamiento por aeropuerto (código IATA -> estado)
  const [warehouseStorage, setWarehouseStorage] = useState<Map<string, WarehouseState>>(new Map());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Rastrear qué eventos de capacidad ya se han disparado para evitar duplicados
  const processedCapacityEventsRef = useRef<Set<string>>(new Set());
  
  // Cola de recogidas pendientes (destino final + 2h)
  const pendingPickupsRef = useRef<PendingPickup[]>([]);
  
  // Eventos de warehouse ya procesados para evitar duplicados
  const processedWarehouseEventsRef = useRef<Set<string>>(new Set());
  
  // Refs para callbacks
  const onFlightCapacityChangeRef = useRef(onFlightCapacityChange);
  
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
      console.log(`[useTemporalSimulation] Almacenes inicializados: ${initialStorage.size} aeropuertos`);
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
    return (timeline?.duracionTotalMinutos || 0) * 60;
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
        
        // Prioridad 1: usar codigoDestino de la ruta (destino final del pedido)
        if (ruta.codigoDestino) {
          map.set(ruta.idPedido, ruta.codigoDestino);
          return;
        }
        
        // Prioridad 2: usar el destino del último vuelo de la ruta
        if (ruta.vuelos && ruta.vuelos.length > 0) {
          const ultimoVuelo = ruta.vuelos[ruta.vuelos.length - 1];
          // Intentar codigoDestino, luego horaLlegadaReal info
          const destino = ultimoVuelo.codigoDestino;
          if (destino) {
            map.set(ruta.idPedido, destino);
            return;
          }
        }
        
      });
      
    }
    
    return map;
  }, [timeline]);

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
    let flightsWithInvalidAirports = 0;
    
    flightPairs.forEach(pair => {
      const { departureEvent, departureTime, arrivalTime } = pair;
      const hasDeparted = departureTime <= currentDateTime;
      
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
        }
      }
      
      if (hasArrived && effectiveArrivalTime) {
        // ✅ Vuelo completado - pero solo marcar pedido como entregado si llegó al DESTINO FINAL
        const destinoVuelo = departureEvent.ciudadDestino;
        
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
        }
      } else if (hasDeparted && effectiveArrivalTime) {
        // ✈️ Vuelo en progreso
        
        // Validar que tenga aeropuertos válidos
        const hasValidAirports = 
          departureEvent.idAeropuertoOrigen && 
          departureEvent.idAeropuertoDestino;
        
        if (!hasValidAirports) {
          flightsWithInvalidAirports++;
          return; // Skip
        }
        
        const totalDuration = effectiveArrivalTime.getTime() - departureTime.getTime();
        const elapsed = currentDateTime.getTime() - departureTime.getTime();
        const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
        
        // Usar idEvento como clave única (cada instancia de vuelo es diferente)
        const flightKey = departureEvent.idEvento;
        
        flightsMap.set(flightKey, {
          eventId: departureEvent.idEvento, // ID único del evento
          flightId: departureEvent.idVuelo || 0,
          flightCode: departureEvent.codigoVuelo || 'N/A',
          productId: departureEvent.idProducto || 0,
          orderId: departureEvent.idPedido || 0,
          originAirportId: departureEvent.idAeropuertoOrigen || 0,
          destinationAirportId: departureEvent.idAeropuertoDestino || 0,
          departureTime,
          arrivalTime: effectiveArrivalTime,
          progress,
          capacityMax: departureEvent.capacidadMaxima, // Capacidad del vuelo desde backend
          cantidadProductos: departureEvent.cantidadProductos, // Cantidad de productos
        });
      } else {
        // ⏳ Vuelo pendiente
        pendingCount++;
      }
    });
    
    // Logging para debug - mostrar detalles de vuelos con aeropuertos inválidos
    if (flightsWithInvalidAirports > 0 && currentSimTime === 0) {
      console.warn(
        `[useTemporalSimulation] ${flightsWithInvalidAirports} vuelos tienen aeropuertos inválidos y serán omitidos`
      );
      
      // Mostrar primeros 5 vuelos problemáticos
      const problematicFlights = flightPairs
        .filter(p => !p.departureEvent.idAeropuertoOrigen || !p.departureEvent.idAeropuertoDestino)
        .slice(0, 5);
      
      console.group('🔍 Vuelos problemáticos (primeros 5):');
      problematicFlights.forEach(pair => {
        console.log({
          flightId: pair.departureEvent.idVuelo,
          flightCode: pair.departureEvent.codigoVuelo,
          originAirportId: pair.departureEvent.idAeropuertoOrigen,
          destAirportId: pair.departureEvent.idAeropuertoDestino,
          originCity: pair.departureEvent.ciudadOrigen,
          destCity: pair.departureEvent.ciudadDestino,
        });
      });
      console.groupEnd();
    }
    
    const activeFlightsList = Array.from(flightsMap.values());
    
    // 🔍 DEBUG: Log cada 30 segundos de simulación
    const shouldLog = Math.floor(currentSimTime) % 30 === 0 && currentSimTime > 0;
    if (shouldLog) {
      console.log(
        `[useTemporalSimulation] ${currentSimTime}s: ${activeFlightsList.length} activos, ${completedCount} completados, ${pendingCount} pendientes`
      );
    }
    
    // 🔍 DEBUG: Log al inicio
    if (currentSimTime === 0 && flightPairs.length > 0) {
      console.log(
        `[useTemporalSimulation] INICIO - Total pares de vuelo: ${flightPairs.length}`
      );
      console.log(
        `[useTemporalSimulation] Hora inicio simulación: ${simulationStartTime.toISOString()}`
      );
      console.log(
        `[useTemporalSimulation] Duración total: ${totalDurationSeconds / 60} minutos`
      );
    }
    
    setActiveFlights(activeFlightsList);
    setCompletedOrdersCount(completedOrderIds.size);
    setFlightStats({
      completed: completedCount,
      inFlight: activeFlightsList.length,
      pending: pendingCount,
    });
  }, [currentSimTime, flightPairs, simulationStartTime, orderFinalDestinations]);
  
  // Actualizar almacenamiento de aeropuertos según eventos
  useEffect(() => {
    if (flightPairs.length === 0 || warehouseStorage.size === 0) return;
    
    const currentDateTime = new Date(simulationStartTime.getTime() + currentSimTime * 1000);
    let storageChanged = false;
    const newStorage = new Map(warehouseStorage);
    
    flightPairs.forEach(pair => {
      const { departureEvent, departureTime, arrivalTime } = pair;
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
        
        // Si es destino final (calculado por el backend), programar recogida en +2h
        if (departureEvent.esDestinoFinal) {
          const pickupTime = new Date(effectiveArrivalTime.getTime() + 2 * 60 * 60 * 1000); // +2 horas
          pendingPickupsRef.current.push({
            airportCode: destinoCode,
            cantidad: cantidadProductos,
            pickupTime,
          });
        }
      }
    });
    
    // Procesar recogidas pendientes
    const remainingPickups: PendingPickup[] = [];
    pendingPickupsRef.current.forEach(pickup => {
      if (pickup.pickupTime <= currentDateTime) {
        const airportState = newStorage.get(pickup.airportCode);
        if (airportState) {
          newStorage.set(pickup.airportCode, {
            ...airportState,
            actual: Math.max(0, airportState.actual - pickup.cantidad),
          });
          storageChanged = true;
        }
      } else {
        remainingPickups.push(pickup);
      }
    });
    pendingPickupsRef.current = remainingPickups;
    
    if (storageChanged) {
      setWarehouseStorage(newStorage);
    }
  }, [currentSimTime, flightPairs, simulationStartTime, warehouseStorage]);
  
  // Control de reproducción con interval
  useEffect(() => {
    if (isPlaying && timeline) {
      intervalRef.current = setInterval(() => {
        setCurrentSimTime(prev => {
          const newTime = prev + playbackSpeed / 10; // Actualizar 10 veces por segundo
          
          if (newTime >= totalDurationSeconds) {
            setIsPlaying(false);
            return totalDurationSeconds;
          }
          
          return newTime;
        });
      }, 100); // 100ms intervals
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
  
  // Controles
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
  
  // Logging inicial
  useEffect(() => {
    if (timeline && flightPairs.length > 0) {
      console.log('[useTemporalSimulation] Inicializado:', {
        eventos: timeline.eventos?.length || 0,
        pares: flightPairs.length,
        duracion: `${(totalDurationSeconds / 60).toFixed(0)} minutos`,
        velocidad: `1 seg real = ${timeUnit}`,
      });
    }
  }, [timeline, flightPairs.length, totalDurationSeconds, timeUnit]);
  
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
    
    // Controles
    play,
    pause,
    reset,
    seek,
    
    // Utilidades
    formatSimulationTime,
  };
}

