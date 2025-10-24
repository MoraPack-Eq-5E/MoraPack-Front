/**
 * AirportGrid
 * 
 * Grid responsivo que muestra las tarjetas de aeropuertos
 */

import type { Airport } from '@/types';
import { AirportCard } from './AirportCard';

export interface AirportGridProps {
  airports: Airport[];
}

export function AirportGrid({ airports }: AirportGridProps) {
  if (airports.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No se encontraron aeropuertos con los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {airports.map((airport) => (
        <AirportCard key={airport.id} airport={airport} />
      ))}
    </div>
  );
}

