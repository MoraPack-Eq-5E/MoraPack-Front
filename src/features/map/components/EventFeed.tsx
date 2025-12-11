/**
 * EventFeed Component
 * 
 * Feed de eventos de simulación en tiempo real con diseño moderno,
 * filtrado avanzado, búsqueda y animaciones suaves.
 * 
 * Características:
 * - Auto-scroll opcional
 * - Filtrado avanzado por categorías, pedido, vuelo, aeropuerto
 * - Búsqueda de texto
 * - Minimizable/Expandible
 * - Badges por tipo de evento
 * - Timestamps formateados
 * - Integración con popup de aviones para pedidos en vuelo
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { SimulationEvent, EventFilter } from '@/types/simulation.types';
import { AdvancedEventFilters } from './AdvancedEventFilters';
import { getOrderTracking, type OrderTrackingResponse } from '@/services/consultas.service';

interface EventFeedProps {
  events: SimulationEvent[];
  maxHeight?: string;
  enableSearch?: boolean;
  onEventClick?: (event: SimulationEvent) => void;
  /** Si true, no muestra el header (para usar embebido en otro contenedor) */
  embedded?: boolean;
  /** Filtro actual (controlado externamente) */
  filter?: EventFilter;
  /** Callback cuando cambia el filtro */
  onFilterChange?: (filter: EventFilter) => void;
  /** Lista de aeropuertos para dropdown de filtros */
  airports?: Array<{ codigoIATA: string; nombre?: string }>;
  /** Callback para abrir el popup de un avión */
  onFlightPopupRequest?: (eventId: string) => void;
  /** Lista de vuelos activos para verificar si un pedido está volando */
  activeFlights?: Array<{
    eventId: string;
    orderIds: number[];
    flightCode: string;
  }>;
  /** Callback para abrir el drawer de detalles de pedido */
  onOpenOrderDetail?: (orderId: number) => void;
}

/**
 * Obtiene el icono y color según el tipo de evento
 */
function getEventStyle(type: SimulationEvent['type']): {
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
} {
  switch (type) {
    // Eventos de vuelo
    case 'FLIGHT_DEPARTURE':
      return {
        icon: '🛫',
        bgColor: 'bg-sky-50',
        textColor: 'text-sky-700',
        borderColor: 'border-l-sky-500',
        label: 'Despegue',
      };
    case 'FLIGHT_ARRIVAL':
      return {
        icon: '🛬',
        bgColor: 'bg-teal-50',
        textColor: 'text-teal-700',
        borderColor: 'border-l-teal-500',
        label: 'Aterrizaje',
      };
    case 'FLIGHT_CANCELED':
      return {
        icon: '🚫',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-l-red-500',
        label: 'Vuelo Cancelado',
      };

    // Eventos de pedidos
    case 'ORDER_DEPARTED':
      return {
        icon: '📤',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-l-indigo-500',
        label: 'Pedido en vuelo',
      };
    case 'ORDER_ARRIVED_AIRPORT':
      return {
        icon: '📍',
        bgColor: 'bg-cyan-50',
        textColor: 'text-cyan-700',
        borderColor: 'border-l-cyan-500',
        label: 'Llegada escala',
      };
    case 'ORDER_AT_DESTINATION':
      return {
        icon: '🎯',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-l-emerald-500',
        label: 'En destino',
      };
    case 'ORDER_PICKED_UP':
      return {
        icon: '✅',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-l-green-500',
        label: 'Recogido',
      };
    case 'ORDER_DELIVERED':
      return {
        icon: '📦',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-l-purple-500',
        label: 'Entregado',
      };
    
    // Eventos de almacén
    case 'WAREHOUSE_WARNING':
      return {
        icon: '⚠️',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-l-yellow-500',
        label: 'Alerta almacén',
      };
    case 'WAREHOUSE_CRITICAL':
    case 'WAREHOUSE_FULL':
      return {
        icon: '🔴',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-l-red-500',
        label: 'Almacén lleno',
      };
    case 'SLA_RISK':
      return {
        icon: '⏰',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-l-orange-500',
        label: 'Riesgo SLA',
      };
    default:
      return {
        icon: 'ℹ️',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-l-gray-500',
        label: 'Info',
      };
  }
}

/**
 * Formatea el timestamp de manera legible
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Componente individual de evento
 */
function EventItem({ 
  event, 
  onClick,
  onOrderIdClick,
  onFlightCodeClick,
}: { 
  event: SimulationEvent; 
  onClick?: (event: SimulationEvent) => void;
  /** Callback cuando se hace clic en un ID de pedido */
  onOrderIdClick?: (orderId: number) => void;
  /** Callback cuando se hace clic en un código de vuelo */
  onFlightCodeClick?: (flightCode: string) => void;
}) {
  const style = getEventStyle(event.type);

  // Handler para clic en ID de pedido
  const handleOrderIdClick = (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation(); // Evitar que dispare el onClick del evento
    onOrderIdClick?.(orderId);
  };

  // Handler para clic en código de vuelo
  const handleFlightCodeClick = (e: React.MouseEvent, flightCode: string) => {
    e.stopPropagation();
    onFlightCodeClick?.(flightCode);
  };

  // Mostrar hasta 5 IDs de pedidos, luego "y X más"
  const orderIdsToShow = event.relatedOrderIds?.slice(0, 5) || [];
  const remainingOrderIds = (event.relatedOrderIds?.length || 0) - orderIdsToShow.length;

  return (
    <div
      className={`${style.bgColor} ${style.borderColor} border-l-4 p-3 mb-2 rounded-r-lg cursor-pointer hover:shadow-md transition-all duration-200 animate-fade-in`}
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${style.bgColor} ${style.textColor} border border-current/20`}>
                {style.label}
              </span>
              <span className={`text-xs font-medium ${style.textColor} opacity-75`}>
                {formatTimestamp(event.simulatedTime)}
              </span>
            </div>
            {event.relatedAirportCode && (
              <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">
                {event.relatedAirportCode}
              </span>
            )}
          </div>
          <p className={`text-sm ${style.textColor} font-medium leading-snug`}>
            {event.message}
          </p>
          {/* Información adicional */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
            {/* Código de vuelo clickeable */}
            {event.relatedFlightCode && (
              <button
                onClick={(e) => handleFlightCodeClick(e, event.relatedFlightCode!)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-colors"
                title={`Filtrar por vuelo ${event.relatedFlightCode}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">{event.relatedFlightCode}</span>
              </button>
            )}
            {event.productCount && event.productCount > 0 && (
              <span className="flex items-center gap-1 text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {event.productCount} productos
              </span>
            )}
          </div>
          
          {/* IDs de pedidos clickeables */}
          {orderIdsToShow.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              <span className="text-[10px] text-gray-500 font-medium">Pedidos:</span>
              {orderIdsToShow.map((orderId) => (
                <button
                  key={orderId}
                  onClick={(e) => handleOrderIdClick(e, orderId)}
                  className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                  title={`Filtrar por pedido #${orderId}`}
                >
                  #{orderId}
                </button>
              ))}
              {remainingOrderIds > 0 && (
                <span className="text-[10px] text-gray-400">
                  +{remainingOrderIds} más
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Componente principal EventFeed
 */
export function EventFeed({
  events,
  maxHeight = '400px',
  enableSearch = false,
  onEventClick,
  embedded = false,
  filter: externalFilter,
  onFilterChange,
  airports = [],
  onFlightPopupRequest,
  activeFlights = [],
  onOpenOrderDetail,
}: EventFeedProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtro interno si no se provee uno externo
  const [internalFilter, setInternalFilter] = useState<EventFilter>({
    categories: ['ALL'],
    searchTerm: '',
  });

  // Usar filtro externo si está disponible
  const filter = externalFilter ?? internalFilter;
  const handleFilterChange = onFilterChange ?? setInternalFilter;

  // Auto-scroll al agregar nuevos eventos
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = 0; // Scroll to top (nuevos eventos arriba)
    }
  }, [events.length, isExpanded]);

  // Handler para búsqueda de pedido específico
  const handleOrderSearch = useCallback(async (orderId: string) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      // Primero verificar si el pedido está en los vuelos activos actuales
      const orderIdNum = parseInt(orderId, 10);
      const flightWithOrder = activeFlights.find(f => f.orderIds.includes(orderIdNum));

      if (flightWithOrder) {
        // El pedido está volando - abrir popup del avión
        console.log(`[EventFeed] Pedido #${orderId} encontrado en vuelo ${flightWithOrder.flightCode}`);
        if (onFlightPopupRequest) {
          onFlightPopupRequest(flightWithOrder.eventId);
        }
      } else {
        // Consultar al backend para más información
        const tracking: OrderTrackingResponse = await getOrderTracking(orderIdNum);
        
        if (!tracking.exito) {
          setSearchError(tracking.mensaje || 'Pedido no encontrado');
          return;
        }

        // Si está en vuelo según el backend y tenemos la info
        if (tracking.isInFlight && tracking.currentFlightInfo?.eventId) {
          if (onFlightPopupRequest) {
            onFlightPopupRequest(tracking.currentFlightInfo.eventId);
          }
        }

        console.log(`[EventFeed] Tracking pedido #${orderId}:`, tracking);
      }
    } catch (error) {
      console.error('[EventFeed] Error al buscar pedido:', error);
      setSearchError('Error al buscar pedido. Intenta de nuevo.');
    } finally {
      setIsSearching(false);
    }
  }, [activeFlights, onFlightPopupRequest]);

  // Filtrar eventos (básico para búsqueda de texto - el filtrado avanzado se hace en el hook)
  const filteredEvents = events.filter((event) => {
    // Filtro de búsqueda local (el searchTerm del input simple)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.message.toLowerCase().includes(searchLower) ||
        event.relatedAirportCode?.toLowerCase().includes(searchLower) ||
        event.relatedFlightCode?.toLowerCase().includes(searchLower) ||
        event.relatedOrderId?.toString().includes(searchTerm) ||
        event.relatedOrderIds?.some(id => id.toString().includes(searchTerm));
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Handler para clic en ID de pedido desde EventItem
  const handleOrderIdClick = useCallback((orderId: number) => {
    // Si hay callback para abrir drawer, usarlo
    if (onOpenOrderDetail) {
      onOpenOrderDetail(orderId);
    } else {
      // Fallback: filtrar por el pedido
      const orderIdStr = orderId.toString();
      handleFilterChange({
        ...filter,
        orderId: orderIdStr,
      });
      // Buscar y abrir popup si está en vuelo
      handleOrderSearch(orderIdStr);
    }
  }, [filter, handleFilterChange, handleOrderSearch, onOpenOrderDetail]);

  // Handler para clic en código de vuelo desde EventItem
  const handleFlightCodeClick = useCallback((flightCode: string) => {
    handleFilterChange({
      ...filter,
      flightCode: flightCode,
    });
  }, [filter, handleFilterChange]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  // Modo embebido: solo contenido sin wrapper
  if (embedded) {
    return (
      <div className="h-full flex flex-col">
        {/* Filtros Avanzados */}
        <AdvancedEventFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          airports={airports}
          onOrderSearch={handleOrderSearch}
          isSearching={isSearching}
          searchError={searchError}
        />

        {/* Búsqueda rápida */}
        {enableSearch && (
          <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
            <input
              type="text"
              placeholder="Buscar en eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-gray-50 text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
            />
          </div>
        )}
        
        {/* Lista de eventos */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          <div className="p-3">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <svg
                  className="w-10 h-10 mx-auto mb-2 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-xs font-medium">
                  {filter.orderId || filter.flightCode || filter.airportCode 
                    ? 'No hay eventos con estos filtros' 
                    : 'No hay eventos aún'}
                </p>
                <p className="text-[10px] mt-0.5">
                  {filter.orderId || filter.flightCode || filter.airportCode 
                    ? 'Intenta ajustar los filtros' 
                    : 'Reproduce la simulación para ver eventos'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <EventItem 
                  key={event.id} 
                  event={event} 
                  onClick={onEventClick}
                  onOrderIdClick={handleOrderIdClick}
                  onFlightCodeClick={handleFlightCodeClick}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Footer */}
        {events.length > 0 && (
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 flex-shrink-0">
            <span>Mostrando {filteredEvents.length} de {events.length}</span>
            {(searchTerm || filter.orderId || filter.flightCode || filter.airportCode) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  handleFilterChange({
                    categories: ['ALL'],
                    searchTerm: '',
                    orderId: undefined,
                    flightCode: undefined,
                    airportCode: undefined,
                    dateRange: undefined,
                  });
                }}
                className="text-teal-600 hover:text-teal-800 font-medium"
              >
                Limpiar todo
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Modo normal: con header completo
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <h3 className="text-sm font-semibold text-white">Eventos en Tiempo Real</h3>
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {events.length}
            </span>
          </div>
          <button
            onClick={toggleExpand}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            title={isExpanded ? 'Minimizar' : 'Expandir'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Búsqueda (si está habilitada) */}
        {enableSearch && isExpanded && (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white/20 text-white placeholder-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        )}
      </div>

      {/* Contenido */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="overflow-y-auto custom-scrollbar"
          style={{ maxHeight }}
        >
          <div className="p-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-sm font-medium">No hay eventos aún</p>
                <p className="text-xs mt-1">Los eventos aparecerán aquí en tiempo real</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <EventItem 
                  key={event.id} 
                  event={event} 
                  onClick={onEventClick}
                  onOrderIdClick={handleOrderIdClick}
                  onFlightCodeClick={handleFlightCodeClick}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer con información adicional */}
      {isExpanded && events.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <span>Mostrando {filteredEvents.length} de {events.length} eventos</span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-teal-600 hover:text-teal-800 font-medium"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}
    </div>
  );
}

