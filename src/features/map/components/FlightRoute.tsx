/**
 * FlightRoute - Dibuja línea punteada de la ruta del vuelo
 */

import { Polyline } from 'react-leaflet';
import type { Vuelo } from '@/types/map.types';

interface FlightRouteProps {
  vuelo: Vuelo;
}

export function FlightRoute({ vuelo }: FlightRouteProps) {
  const positions: [number, number][] = [
    [vuelo.latitudOrigen, vuelo.longitudOrigen],
    [vuelo.latitudDestino, vuelo.longitudDestino],
  ];

  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: '#3b82f6',      // Azul
        weight: 2,             // Grosor de la línea
        opacity: 0.7,          // Opacidad
        dashArray: '10, 10',   // Patrón de puntos (10px línea, 10px espacio)
      }}
    />
  );
}

