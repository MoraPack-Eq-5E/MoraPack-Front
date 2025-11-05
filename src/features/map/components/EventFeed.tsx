/**
 * EventFeed Component
 * 
 * Feed de eventos de simulación en tiempo real con diseño moderno,
 * filtrado avanzado, búsqueda y animaciones suaves.
 * 
 * Características:
 * - Auto-scroll opcional
 * - Filtrado por categorías
 * - Búsqueda de texto
 * - Minimizable/Expandible
 * - Badges por tipo de evento
 * - Timestamps formateados
 * 
 
 */

import { useState, useRef, useEffect } from 'react';
import type { SimulationEvent } from '@/types/simulation.types';

interface EventFeedProps {
  events: SimulationEvent[];
  maxHeight?: string;
  enableSearch?: boolean;
  onEventClick?: (event: SimulationEvent) => void;
}

/**
 * Obtiene el icono y color según el tipo de evento
 */
function getEventStyle(type: SimulationEvent['type']): {
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  switch (type) {
    case 'FLIGHT_DEPARTURE':
      return {
        icon: '🛫',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-l-blue-500',
      };
    case 'FLIGHT_ARRIVAL':
      return {
        icon: '🛬',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-l-green-500',
      };
    case 'ORDER_DELIVERED':
      return {
        icon: '📦',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-l-purple-500',
      };
    case 'WAREHOUSE_WARNING':
      return {
        icon: '⚠️',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-l-yellow-500',
      };
    case 'WAREHOUSE_CRITICAL':
    case 'WAREHOUSE_FULL':
      return {
        icon: '🔴',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-l-red-500',
      };
    case 'SLA_RISK':
      return {
        icon: '⏰',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-700',
        borderColor: 'border-l-orange-500',
      };
    default:
      return {
        icon: 'ℹ️',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-l-gray-500',
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
function EventItem({ event, onClick }: { event: SimulationEvent; onClick?: (event: SimulationEvent) => void }) {
  const style = getEventStyle(event.type);

  return (
    <div
      className={`${style.bgColor} ${style.borderColor} border-l-4 p-3 mb-2 rounded-r-lg cursor-pointer hover:shadow-md transition-all duration-200 animate-fade-in`}
      onClick={() => onClick?.(event)}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-xs font-semibold ${style.textColor}`}>
              {formatTimestamp(event.simulatedTime)}
            </span>
            {event.relatedAirportCode && (
              <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                {event.relatedAirportCode}
              </span>
            )}
          </div>
          <p className={`text-sm ${style.textColor} font-medium`}>
            {event.message}
          </p>
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
}: EventFeedProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al agregar nuevos eventos
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = 0; // Scroll to top (nuevos eventos arriba)
    }
  }, [events.length, isExpanded]);

  // Filtrar eventos
  const filteredEvents = events.filter((event) => {
    // Filtro de búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.message.toLowerCase().includes(searchLower) ||
        event.relatedAirportCode?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3">
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
                <EventItem key={event.id} event={event} onClick={onEventClick} />
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
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}
    </div>
  );
}

