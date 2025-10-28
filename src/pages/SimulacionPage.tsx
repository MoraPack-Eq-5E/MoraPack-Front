/**
 * SimulacionPage
 * 
 * Página de visualización en tiempo real de simulaciones
 * 
 * TODO: Integrar con flujo completo:
 * 1. Seleccionar/iniciar simulación
 * 2. Esperar a que ALNS complete
 * 3. Cargar visualización
 * 4. Mostrar mapa con polling
 */

import { useState } from 'react';
import { MapView } from '@/features/map/components';

export function SimulacionPage() {
  // TODO: Obtener esto de un state management o URL params
  // Por ahora hardcoded para testing
  const [simulationId] = useState<number | null>(15);

  return (
    <div className="h-full">
      {/* TODO: Agregar UI para seleccionar simulación */}
      <MapView simulationId={simulationId} />
    </div>
  );
}

