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
    label: 'Operativo',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  CERRADO: {
    label: 'Cerrado',
    className: 'bg-red-100 text-red-700 border-red-200',
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

