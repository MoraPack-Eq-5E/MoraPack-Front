/**
 * FlightRoute - Dibuja línea curva punteada de la ruta del vuelo
 * 
 * Usa curvas Bézier cuadráticas para simular la curvatura natural
 * de las rutas aéreas (Great Circle Routes)
 */

import { Polyline } from 'react-leaflet';
import type { Vuelo } from '@/types/map.types';
import { generateBezierPath } from '@/features/map/utils/bezier.utils';
import { useMemo } from 'react';

interface FlightRouteProps {
  vuelo: Vuelo;
}

export function FlightRoute({ vuelo }: FlightRouteProps) {
  // Memoizar la ruta curva para mejor rendimiento
  const curvedPath = useMemo(() => {
    return generateBezierPath(
      vuelo.latitudOrigen,
      vuelo.longitudOrigen,
      vuelo.latitudDestino,
      vuelo.longitudDestino,
      60 // 60 segmentos para una curva suave
    );
  }, [
    vuelo.latitudOrigen,
    vuelo.longitudOrigen,
    vuelo.latitudDestino,
    vuelo.longitudDestino,
  ]);

  return (
    <Polyline
      positions={curvedPath}
      pathOptions={{
        color: '#3b82f6',      // Azul
        weight: 4,             // Grosor de la línea
        opacity: 0.6,          // Ligeramente transparente
        dashArray: '10, 8',    // Patrón de puntos
        lineCap: 'round',      // Puntas redondeadas
        lineJoin: 'round',     // Uniones redondeadas
      }}
      // Asegurar que la línea esté detrás del avión
      pane="overlayPane"
    />
  );
}

