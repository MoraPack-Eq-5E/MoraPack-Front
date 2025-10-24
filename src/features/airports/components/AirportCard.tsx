/**
 * AirportCard
 * 
 * Tarjeta individual que muestra información de un aeropuerto
 * con toggle para activar/desactivar (solo visual)
 */

import { useState } from 'react';
import type { Airport } from '@/types';
import { AirportStateBadge } from './AirportStateBadge';
import { OccupancyBar } from './OccupancyBar';

export interface AirportCardProps {
  airport: Airport;
}

export function AirportCard({ airport }: AirportCardProps) {
  // Toggle solo visual (no persiste en BD)
  const [isActive, setIsActive] = useState(true);

  // Calcular porcentaje de ocupación
  const porcentajeOcupacion = airport.capacidadMaxima > 0
    ? Math.round((airport.capacidadActual / airport.capacidadMaxima) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col">
      {/* Header: Código + Ciudad + Toggle */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {airport.codigoIATA} - {airport.ciudad.nombre}
          </h3>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isActive ? 'bg-blue-600' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={isActive}
          aria-label={`${isActive ? 'Desactivar' : 'Activar'} aeropuerto`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* País */}
      <p className="text-sm text-gray-600 mb-4">{airport.ciudad.pais}</p>

      {/* Ocupación */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Ocupación Actual:</span>
          <span className="font-bold text-gray-900">
            {porcentajeOcupacion}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{airport.capacidadActual}/{airport.capacidadMaxima}</span>
        </div>
        <OccupancyBar porcentaje={porcentajeOcupacion} />
      </div>

      {/* Estado */}
      <div className="pt-4 mt-auto border-t border-gray-100">
        <AirportStateBadge estado={airport.estado} />
      </div>
    </div>
  );
}

