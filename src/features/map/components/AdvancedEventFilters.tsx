/**
 * AdvancedEventFilters Component
 * 
 * Panel de filtros avanzados para eventos de simulación.
 * Permite filtrar por:
 * - ID de pedido específico
 * - Código de vuelo
 * - Código IATA de aeropuerto
 * - Tipo de evento (categorías)
 * - Rango de fechas/tiempo simulado
 */

import { useState, useCallback, useMemo } from 'react';
import type { EventFilter, EventCategory } from '@/types/simulation.types';

interface AdvancedEventFiltersProps {
  filter: EventFilter;
  onFilterChange: (filter: EventFilter) => void;
  /** Lista de aeropuertos disponibles para el dropdown */
  airports?: Array<{ codigoIATA: string; nombre?: string }>;
  /** Callback cuando se busca un pedido específico */
  onOrderSearch?: (orderId: string) => void;
  /** Indica si hay una búsqueda de pedido en progreso */
  isSearching?: boolean;
  /** Mensaje de error de búsqueda */
  searchError?: string | null;
}

const EVENT_CATEGORIES: { id: EventCategory; label: string; icon: string }[] = [
  { id: 'FLIGHT', label: 'Vuelos', icon: '✈️' },
  { id: 'ORDER', label: 'Pedidos', icon: '📦' },
  { id: 'WAREHOUSE', label: 'Almacén', icon: '🏭' },
  { id: 'ALERT', label: 'Alertas', icon: '⚠️' },
];

export function AdvancedEventFilters({
  filter,
  onFilterChange,
  airports = [],
  onOrderSearch,
  isSearching = false,
  searchError = null,
}: AdvancedEventFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState(filter.orderId || '');

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filter.orderId) count++;
    if (filter.flightCode) count++;
    if (filter.airportCode) count++;
    if (filter.dateRange?.start || filter.dateRange?.end) count++;
    if (!filter.categories.includes('ALL') && filter.categories.length > 0) count++;
    return count;
  }, [filter]);

  // Handler para búsqueda de pedido
  const handleOrderSearch = useCallback(() => {
    const trimmedId = orderIdInput.trim();
    if (trimmedId && onOrderSearch) {
      onOrderSearch(trimmedId);
    }
    // Actualizar filtro con el orderId
    onFilterChange({
      ...filter,
      orderId: trimmedId || undefined,
    });
  }, [orderIdInput, onOrderSearch, filter, onFilterChange]);

  // Handler para tecla Enter en input de pedido
  const handleOrderInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleOrderSearch();
    }
  }, [handleOrderSearch]);

  // Handler para cambio de código de vuelo
  const handleFlightCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filter,
      flightCode: e.target.value || undefined,
    });
  }, [filter, onFilterChange]);

  // Handler para cambio de aeropuerto
  const handleAirportChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({
      ...filter,
      airportCode: e.target.value || undefined,
    });
  }, [filter, onFilterChange]);

  // Handler para toggle de categoría
  const handleCategoryToggle = useCallback((category: EventCategory) => {
    let newCategories: EventCategory[];
    
    if (category === 'ALL') {
      // Si se selecciona ALL, resetear a solo ALL
      newCategories = ['ALL'];
    } else {
      // Remover ALL si existe
      const withoutAll = filter.categories.filter(c => c !== 'ALL');
      
      if (withoutAll.includes(category)) {
        // Si ya está seleccionada, removerla
        newCategories = withoutAll.filter(c => c !== category);
        // Si no queda ninguna, volver a ALL
        if (newCategories.length === 0) {
          newCategories = ['ALL'];
        }
      } else {
        // Agregar la categoría
        newCategories = [...withoutAll, category];
      }
    }
    
    onFilterChange({
      ...filter,
      categories: newCategories,
    });
  }, [filter, onFilterChange]);

  // Handler para limpiar todos los filtros
  const handleClearAllFilters = useCallback(() => {
    setOrderIdInput('');
    onFilterChange({
      categories: ['ALL'],
      searchTerm: '',
      orderId: undefined,
      flightCode: undefined,
      airportCode: undefined,
      dateRange: undefined,
    });
  }, [onFilterChange]);

  // Ordenar aeropuertos alfabéticamente
  const sortedAirports = useMemo(() => {
    return [...airports].sort((a, b) => a.codigoIATA.localeCompare(b.codigoIATA));
  }, [airports]);

  return (
    <div className="border-b border-gray-100">
      {/* Header colapsable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg 
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs font-semibold text-gray-700">Filtros Avanzados</span>
          {activeFiltersCount > 0 && (
            <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearAllFilters();
            }}
            className="text-[10px] text-red-600 hover:text-red-800 font-medium"
          >
            Limpiar
          </button>
        )}
      </button>

      {/* Panel expandible */}
      {isExpanded && (
        <div className="p-3 space-y-3 bg-white">
          {/* Búsqueda por ID de pedido */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">
              ID de Pedido
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                onKeyDown={handleOrderInputKeyDown}
                placeholder="Ej: 12345"
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                disabled={isSearching}
              />
              <button
                onClick={handleOrderSearch}
                disabled={isSearching || !orderIdInput.trim()}
                className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? (
                  <span className="inline-block animate-spin">⏳</span>
                ) : (
                  '🔍'
                )}
              </button>
            </div>
            {searchError && (
              <p className="text-[10px] text-red-600 mt-1">{searchError}</p>
            )}
            {filter.orderId && !searchError && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                  Filtrando: #{filter.orderId}
                </span>
                <button
                  onClick={() => {
                    setOrderIdInput('');
                    onFilterChange({ ...filter, orderId: undefined });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Código de vuelo */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">
              Código de Vuelo
            </label>
            <input
              type="text"
              value={filter.flightCode || ''}
              onChange={handleFlightCodeChange}
              placeholder="Ej: LIMA-BRUS-03:00"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
            />
            {filter.flightCode && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                  Vuelo: {filter.flightCode}
                </span>
                <button
                  onClick={() => onFilterChange({ ...filter, flightCode: undefined })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Aeropuerto */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1">
              Aeropuerto
            </label>
            <select
              value={filter.airportCode || ''}
              onChange={handleAirportChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 bg-white"
            >
              <option value="">Todos los aeropuertos</option>
              {sortedAirports.map((airport) => (
                <option key={airport.codigoIATA} value={airport.codigoIATA}>
                  {airport.codigoIATA} {airport.nombre ? `- ${airport.nombre}` : ''}
                </option>
              ))}
            </select>
            {filter.airportCode && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                  📍 {filter.airportCode}
                </span>
                <button
                  onClick={() => onFilterChange({ ...filter, airportCode: undefined })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Categorías de eventos */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-1.5">
              Tipo de Evento
            </label>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleCategoryToggle('ALL')}
                className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-colors ${
                  filter.categories.includes('ALL')
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              {EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryToggle(cat.id)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-colors flex items-center gap-0.5 ${
                    filter.categories.includes(cat.id) && !filter.categories.includes('ALL')
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros activos (badges) */}
          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">
                  {activeFiltersCount} filtro{activeFiltersCount !== 1 ? 's' : ''} activo{activeFiltersCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleClearAllFilters}
                  className="text-[10px] text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpiar todo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

