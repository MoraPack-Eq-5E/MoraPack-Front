/**
 * EnVivoPage
 * 
 * Página de visualización en tiempo real
 * Muestra la última simulación activa
 */

import { useState } from 'react';
import { MapView } from '@/features/map/components';

export function EnVivoPage() {
  // TODO: Obtener última simulación activa del backend
  const [simulationId] = useState<number | null>(null);

  return (
    <div className="h-full">
      <MapView simulationId={simulationId} />
    </div>
  );
}

