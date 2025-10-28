/**
 * AirportStateBadge
 * 
 * Badge que muestra el estado operativo del aeropuerto
 */

import type { EstadoAeropuerto } from '@/types';

export interface AirportStateBadgeProps {
  estado: EstadoAeropuerto;
}

const estadoConfig: Record<EstadoAeropuerto, { label: string; className: string }> = {
  DISPONIBLE: {
    label: 'Activo',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  NO_DISPONIBLE: {
    label: 'Inactivo',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

export function AirportStateBadge({ estado }: AirportStateBadgeProps) {
  const config = estadoConfig[estado];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      Estado: {config.label}
    </span>
  );
}

