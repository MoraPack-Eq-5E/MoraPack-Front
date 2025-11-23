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

export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

interface UseTemporalSimulationProps {
  timeline: LineaDeTiempoSimulacionDTO | null | undefined;
  timeUnit?: TimeUnit;
  onFlightCapacityChange?: (event: FlightCapacityEvent) => void;
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

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Rastrear qué eventos de capacidad ya se han disparado para evitar duplicados
  const processedCapacityEventsRef = useRef<Set<string>>(new Set());
  
  // Refs para callbacks
  const onFlightCapacityChangeRef = useRef(onFlightCapacityChange);
  
  // Actualizar ref cuando callback cambia
  useEffect(() => {
    onFlightCapacityChangeRef.current = onFlightCapacityChange;
  }, [onFlightCapacityChange]);
  
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
  
  // Calcular total de pedidos únicos
  const totalOrdersCount = useMemo(() => {
    if (!timeline?.eventos || timeline.eventos.length === 0) {
      return 0;
    }
    
    const uniqueOrderIds = new Set<number>();
    timeline.eventos.forEach(event => {
      if (event.idPedido) {
        uniqueOrderIds.add(event.idPedido);
      }
    });
    
    return uniqueOrderIds.size;
  }, [timeline]);
  
  // Procesar eventos y crear pares DEPARTURE-ARRIVAL
  const flightPairs = useMemo(() => {
    if (!timeline?.eventos || timeline.eventos.length === 0) {
      return [];
    }
    
    const arrivalMap = new Map<number, EventoLineaDeTiempoVueloDTO>();
    
    // Indexar LLEGADAs (ARRIVAL) por flightId
    timeline.eventos.forEach(event => {
      if (event.tipoEvento === 'ARRIVAL' && event.idVuelo) {
        arrivalMap.set(event.idVuelo, event);
      }
    });
    
    // Crear pares para cada SALIDA (DEPARTURE)
    return timeline.eventos
      .filter(event => event.tipoEvento === 'DEPARTURE')
      .map(departure => {
        const arrival = departure.idVuelo ? arrivalMap.get(departure.idVuelo) : null;
        
        return {
          departureEvent: departure,
          arrivalEvent: arrival || null,
          departureTime: new Date(departure.horaEvento),
          arrivalTime: arrival ? new Date(arrival.horaEvento) : null,
        };
      });
  }, [timeline]);
  
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
        const transportDays = departureEvent.tiempoTransporteDias || 7;
        effectiveArrivalTime = new Date(
          departureTime.getTime() + transportDays * 24 * 60 * 60 * 1000
        );
      }
      
      const hasArrived = effectiveArrivalTime 
        ? effectiveArrivalTime <= currentDateTime 
        : false;
      
      const flightId = departureEvent.idVuelo || 0;
      const departureKey = `${flightId}-departed`;
      const arrivalKey = `${flightId}-arrived`;
      
      if (hasArrived && effectiveArrivalTime) {
        // ✅ Vuelo completado
        if (departureEvent.idPedido) {
          completedOrderIds.add(departureEvent.idPedido);
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
            timestamp: currentDateTime,
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
        
        // Disparar evento de capacidad DEPARTURE (solo una vez)
        if (
          onFlightCapacityChangeRef.current && 
          !processedCapacityEventsRef.current.has(`${departureKey}-capacity`) &&
          departureEvent.idAeropuertoOrigen
        ) {
          processedCapacityEventsRef.current.add(`${departureKey}-capacity`);
          
          // Usar cantidadProductos del DTO
          const totalVolume = departureEvent.cantidadProductos || 1;
          
          onFlightCapacityChangeRef.current({
            eventType: 'DEPARTURE',
            flightId: flightId,
            airportId: departureEvent.idAeropuertoOrigen,
            productIds: [departureEvent.idProducto || 0],
            totalVolume: totalVolume,
            timestamp: currentDateTime,
          });
        }
        
        const totalDuration = effectiveArrivalTime.getTime() - departureTime.getTime();
        const elapsed = currentDateTime.getTime() - departureTime.getTime();
        const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
        
        const flightKey = `${departureEvent.idVuelo}-${departureEvent.idProducto}`;
        
        flightsMap.set(flightKey, {
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
  }, [currentSimTime, flightPairs, simulationStartTime]);
  
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
  }, []);
  
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
    
    // Controles
    play,
    pause,
    reset,
    seek,
    
    // Utilidades
    formatSimulationTime,
  };
}

