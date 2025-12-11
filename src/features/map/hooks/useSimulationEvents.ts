/**
 * useSimulationEvents Hook
 * 
 * Hook personalizado para gestionar eventos de simulación en tiempo real
 * con características avanzadas de filtrado, búsqueda y categorización.
 * 
 * @author Senior Developer
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { SimulationEvent, EventFilter, EventCategory } from '@/types/simulation.types';

interface UseSimulationEventsOptions {
  maxEvents?: number;
  autoScroll?: boolean;
  enableFilters?: boolean;
}

interface UseSimulationEventsReturn {
  events: SimulationEvent[];
  filteredEvents: SimulationEvent[];
  filter: EventFilter;
  setFilter: (filter: EventFilter) => void;
  clearEvents: () => void;
  eventCount: number;
  hasNewEvent: boolean;
  resetNewEventFlag: () => void;
}

const DEFAULT_MAX_EVENTS = 50;

/**
 * Categoriza un evento según su tipo
 */
function categorizeEvent(event: SimulationEvent): EventCategory {
  const { type } = event;
  
  // Eventos de vuelo
  if (type === 'FLIGHT_DEPARTURE' || type === 'FLIGHT_ARRIVAL') {
    return 'FLIGHT';
  }
  
  // Eventos de almacén
  if (type === 'WAREHOUSE_WARNING' || type === 'WAREHOUSE_CRITICAL' || type === 'WAREHOUSE_FULL') {
    return 'WAREHOUSE';
  }
  
  // Eventos de pedido
  if (
    type === 'ORDER_DELIVERED' || 
    type === 'ORDER_DEPARTED' || 
    type === 'ORDER_ARRIVED_AIRPORT' || 
    type === 'ORDER_AT_DESTINATION' || 
    type === 'ORDER_PICKED_UP'
  ) {
    return 'ORDER';
  }
  
  // Alertas
  if (type === 'SLA_RISK') {
    return 'ALERT';
  }
  
  return 'FLIGHT'; // Default
}

/**
 * Hook para gestionar eventos de simulación
 */
export function useSimulationEvents(
  rawEvents: SimulationEvent[] | undefined,
  options: UseSimulationEventsOptions = {}
): UseSimulationEventsReturn {
  const {
    maxEvents = DEFAULT_MAX_EVENTS,
    enableFilters = true,
  } = options;

  // Estado local de eventos (limitado por maxEvents)
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  
  // Estado de filtros
  const [filter, setFilter] = useState<EventFilter>({
    categories: ['ALL'],
    searchTerm: '',
  });
  
  // Flag para indicar que hay un nuevo evento
  const [hasNewEvent, setHasNewEvent] = useState(false);

  // Sincronizar eventos del backend con el estado local
  useEffect(() => {
    if (!rawEvents || rawEvents.length === 0) return;

    setEvents((prevEvents) => {
      // Obtener IDs existentes para evitar duplicados
      const existingIds = new Set(prevEvents.map(e => e.id));
      
      // Filtrar solo eventos nuevos
      const newEvents = rawEvents.filter(e => !existingIds.has(e.id));
      
      if (newEvents.length > 0) {
        setHasNewEvent(true);
      }
      
      // Combinar eventos (nuevos al principio)
      const combined = [...newEvents, ...prevEvents];
      
      // Limitar al máximo configurado
      return combined.slice(0, maxEvents);
    });
  }, [rawEvents, maxEvents]);

  // Resetear flag de nuevo evento
  const resetNewEventFlag = useCallback(() => {
    setHasNewEvent(false);
  }, []);

  // Limpiar todos los eventos
  const clearEvents = useCallback(() => {
    setEvents([]);
    setHasNewEvent(false);
  }, []);

  // Filtrar eventos según los filtros activos
  const filteredEvents = useMemo(() => {
    if (!enableFilters) return events;

    let filtered = events;

    // Filtrar por categorías
    if (!filter.categories.includes('ALL')) {
      filtered = filtered.filter((event) => {
        const category = categorizeEvent(event);
        return filter.categories.includes(category);
      });
    }

    // Filtrar por búsqueda de texto general
    if (filter.searchTerm && filter.searchTerm.trim() !== '') {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter((event) =>
        event.message.toLowerCase().includes(searchLower) ||
        event.relatedAirportCode?.toLowerCase().includes(searchLower) ||
        event.relatedFlightId?.toString().includes(searchLower) ||
        event.relatedFlightCode?.toLowerCase().includes(searchLower) ||
        event.relatedOrderId?.toString().includes(searchLower) ||
        event.relatedOrderIds?.some(id => id.toString().includes(searchLower))
      );
    }

    // Filtrar por ID de pedido específico
    if (filter.orderId && filter.orderId.trim() !== '') {
      const orderIdNum = parseInt(filter.orderId, 10);
      filtered = filtered.filter((event) => {
        // Verificar si el evento está relacionado con este pedido
        if (event.relatedOrderId === orderIdNum) return true;
        if (event.relatedOrderIds?.includes(orderIdNum)) return true;
        // También buscar en el mensaje por si el ID aparece ahí
        if (event.message.includes(filter.orderId!)) return true;
        return false;
      });
    }

    // Filtrar por código de vuelo
    if (filter.flightCode && filter.flightCode.trim() !== '') {
      const flightCodeLower = filter.flightCode.toLowerCase();
      filtered = filtered.filter((event) => {
        if (event.relatedFlightCode?.toLowerCase().includes(flightCodeLower)) return true;
        if (event.message.toLowerCase().includes(flightCodeLower)) return true;
        return false;
      });
    }

    // Filtrar por código de aeropuerto
    if (filter.airportCode && filter.airportCode.trim() !== '') {
      const airportCodeLower = filter.airportCode.toLowerCase();
      filtered = filtered.filter((event) => {
        if (event.relatedAirportCode?.toLowerCase() === airportCodeLower) return true;
        // También buscar en el mensaje
        if (event.message.toLowerCase().includes(airportCodeLower)) return true;
        return false;
      });
    }

    // Filtrar por rango de fechas (tiempo simulado)
    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      filtered = filtered.filter((event) => {
        const eventTime = new Date(event.simulatedTime);
        if (start && eventTime < start) return false;
        if (end && eventTime > end) return false;
        return true;
      });
    }

    return filtered;
  }, [events, filter, enableFilters]);

  return {
    events,
    filteredEvents,
    filter,
    setFilter,
    clearEvents,
    eventCount: events.length,
    hasNewEvent,
    resetNewEventFlag,
  };
}

