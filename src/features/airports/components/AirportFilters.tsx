/**
 * AirportFilters
 * 
 * Componente de filtros y búsqueda para aeropuertos
 */

import { Search } from 'lucide-react';
import { Select, type SelectOption } from '@/components/ui';
import type { AirportFilters as Filters } from '@/types';

export interface AirportFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const estadoOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'DISPONIBLE', label: 'Activo' },
  { value: 'NO_DISPONIBLE', label: 'Inactivo' },
];

const continenteOptions: SelectOption[] = [
  { value: 'all', label: 'Todos los continentes' },
  { value: 'AMERICA', label: 'América' },
  { value: 'EUROPA', label: 'Europa' },
  { value: 'ASIA', label: 'Asia' },
  { value: 'AFRICA', label: 'África' },
  { value: 'OCEANIA', label: 'Oceanía' },
];

export function AirportFilters({ filters, onFiltersChange }: AirportFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Listado de Aeropuertos</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar aeropuerto por código o nombre..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filtro por estado */}
        <div>
          <Select
            value={filters.estado}
            onChange={(e) => onFiltersChange({ ...filters, estado: e.target.value })}
            options={estadoOptions}
          />
        </div>

        {/* Filtro por continente */}
        <div>
          <Select
            value={filters.continente}
            onChange={(e) => onFiltersChange({ ...filters, continente: e.target.value })}
            options={continenteOptions}
          />
        </div>
      </div>
    </div>
  );
}

