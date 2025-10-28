/**
 * FlightRoute - Dibuja línea punteada de la ruta del vuelo
 * 
 * NOTA: Usa interpolación lineal en el espacio lat/lng para coincidir
 * exactamente con la posición calculada del avión en el backend
 */

import { Polyline } from 'react-leaflet';
import type { Vuelo } from '@/types/map.types';

interface FlightRouteProps {
  vuelo: Vuelo;
}

export function FlightRoute({ vuelo }: FlightRouteProps) {
  // Generar puntos interpolados para que la línea coincida exactamente
  // con la trayectoria del avión (interpolación lineal en lat/lng)
  const generateIntermediatePoints = () => {
    const points: [number, number][] = [];
    const segments = 50; // Más segmentos = línea más suave y precisa
    
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const lat = vuelo.latitudOrigen + (vuelo.latitudDestino - vuelo.latitudOrigen) * progress;
      const lng = vuelo.longitudOrigen + (vuelo.longitudDestino - vuelo.longitudOrigen) * progress;
      points.push([lat, lng]);
    }
    
    return points;
  };

  return (
    <Polyline
      positions={generateIntermediatePoints()}
      pathOptions={{
        color: '#3b82f6',      // Azul
        weight: 4,             // Más grosor para cubrir pequeñas imprecisiones
        opacity: 0.6,          // Ligeramente más transparente
        dashArray: '10, 8',    // Patrón de puntos
        lineCap: 'round',      // Puntas redondeadas
        lineJoin: 'round',     // Uniones redondeadas
      }}
      // Asegurar que la línea esté detrás del avión
      pane="overlayPane"
    />
  );
}

