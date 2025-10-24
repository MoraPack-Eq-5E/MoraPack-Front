/**
 * AirportsPage
 * 
 * Página de gestión de aeropuertos con:
 * - Top 5 aeropuertos más ocupados
 * - Filtros y búsqueda
 * - Grid de aeropuertos con paginación
 * - Toggle activo/inactivo (solo visual)
 */

import { useState } from 'react';
import {
  AirportsHeader,
  TopOccupiedChart,
  AirportFilters,
  AirportGrid,
  AirportPagination,
} from '@/features/airports/components';
import {
  useAirports,
  useAirportFilters,
  usePagination,
} from '@/features/airports/hooks';
import type { AirportFilters as Filters } from '@/types';

const ITEMS_PER_PAGE = 8;

export function AirportsPage() {
  // Estado de filtros
  const [filters, setFilters] = useState<Filters>({
    search: '',
    estado: 'all',
    continente: 'all',
  });

  // Estado de paginación
  const [currentPage, setCurrentPage] = useState(1);

  // Obtener aeropuertos
  const { airports, isLoading, error } = useAirports();

  // Aplicar filtros
  const filteredAirports = useAirportFilters(airports, filters);

  // Aplicar paginación
  const { paginatedData, totalPages } = usePagination({
    items: filteredAirports,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  // Resetear a página 1 cuando cambian los filtros
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="py-4">
        <div className="px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando aeropuertos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-4">
        <div className="px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-gray-900 font-semibold mb-2">Error al cargar aeropuertos</p>
              <p className="text-gray-600 text-sm">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="px-8">
        {/* Header */}
        <AirportsHeader />

        {/* Top 5 aeropuertos más ocupados */}
        <TopOccupiedChart airports={airports} />

        {/* Filtros y búsqueda */}
        <AirportFilters filters={filters} onFiltersChange={handleFiltersChange} />

        {/* Grid de aeropuertos */}
        <AirportGrid airports={paginatedData} />

        {/* Paginación */}
        <AirportPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

