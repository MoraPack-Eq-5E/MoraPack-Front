/**
 * Hook para filtrar aeropuertos
 */

import { useMemo } from 'react';
import type { Airport, AirportFilters } from '@/types';

export function useAirportFilters(airports: Airport[], filters: AirportFilters) {
  return useMemo(() => {
    let filtered = [...airports];

    // Filtro por búsqueda (código IATA o ciudad)
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (airport) =>
          airport.codigoIATA.toLowerCase().includes(searchLower) ||
          airport.ciudad.nombre.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por estado
    if (filters.estado !== 'all') {
      filtered = filtered.filter((airport) => airport.estado === filters.estado);
    }

    // Filtro por continente
    if (filters.continente !== 'all') {
      filtered = filtered.filter((airport) => airport.ciudad.continente === filters.continente);
    }

    return filtered;
  }, [airports, filters]);
}

