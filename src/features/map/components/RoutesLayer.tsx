/**
 * RoutesLayer - Capa optimizada de rutas de vuelo
 * 
 * Características:
 * - Viewport culling: solo renderiza rutas visibles
 * - Canvas renderer para mejor performance
 * - Curvas Bezier realistas
 * - Re-render optimizado en moveend
 */

import { useEffect, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { ActiveFlightState } from '@/services/simulation-player.service';
import type { Aeropuerto } from '@/types/map.types';
import { bezierPoint, computeControlPoint, type LatLngTuple } from '../utils/bezier.utils';

interface RoutesLayerProps {
  flights: ActiveFlightState[];
  airports: Aeropuerto[];
  canvasRenderer: L.Renderer;
  curvature?: number;
}

/**
 * Componente optimizado para renderizar rutas de vuelo
 * Solo muestra las rutas que tienen al menos un aeropuerto visible en el viewport
 */
export function RoutesLayer({ 
  flights, 
  airports, 
  canvasRenderer,
  curvature = 0.25 
}: RoutesLayerProps) {
  const map = useMap();
  const [, forceUpdate] = useState(0);

  // Crear mapa de aeropuertos por código para búsqueda rápida
  const airportsByCode = useMemo(() => {
    const dict: Record<string, Aeropuerto> = {};
    airports.forEach((airport) => {
      dict[airport.codigoIATA] = airport;
    });
    return dict;
  }, [airports]);

  // Re-render cuando el mapa se mueve (inmediato para evitar desalineación)
  useEffect(() => {
    if (!map) return;

    const onMove = () => {
      forceUpdate(x => x + 1);
    };

    // Escuchar todos los eventos relevantes para sincronización perfecta
    map.on('moveend', onMove);
    map.on('zoomend', onMove);
    map.on('zoom', onMove); // También durante el zoom para mejor sincronización
    
    return () => {
      map.off('moveend', onMove);
      map.off('zoomend', onMove);
      map.off('zoom', onMove);
    };
  }, [map]);

  // Obtener bounds del viewport
  const viewportBounds = useMemo(() => {
    if (!map) return null;
    return map.getBounds();
  }, [map]); // forceUpdate eliminado de las dependencias

  // Filtrar vuelos que tienen al menos un aeropuerto visible
  const visibleFlights = useMemo(() => {
    if (!viewportBounds) return [];

    return flights.filter((flight) => {
      const originAirport = airportsByCode[flight.originCode];
      const destinationAirport = airportsByCode[flight.destinationCode];

      // Fallback: usar coordenadas embebidas en el flight cuando el aeropuerto no exista
      const origin: LatLngTuple | null = originAirport
        ? [originAirport.latitud, originAirport.longitud]
        : (typeof flight.originLat === 'number' && typeof flight.originLon === 'number')
          ? [flight.originLat, flight.originLon]
          : null;

      const destination: LatLngTuple | null = destinationAirport
        ? [destinationAirport.latitud, destinationAirport.longitud]
        : (typeof flight.destLat === 'number' && typeof flight.destLon === 'number')
          ? [flight.destLat, flight.destLon]
          : null;

      if (!origin || !destination) return false;

      // Mostrar si origen o destino están en viewport
      if (
        viewportBounds.contains(origin) ||
        viewportBounds.contains(destination)
      ) {
        return true;
      }

      // También mostrar si la posición actual del avión en la curva está dentro del viewport
      try {
        const ctrl = computeControlPoint(origin, destination, curvature);
        const progress = Math.max(0, Math.min(1, flight.currentProgress));
        const currentPos = bezierPoint(progress, origin, ctrl, destination);
        if (viewportBounds.contains(currentPos)) return true;

        // Finalmente, comprobar si el bounding box de la ruta intersecta el viewport
        const originLatLng = L.latLng(origin[0], origin[1]);
        const destLatLng = L.latLng(destination[0], destination[1]);
        const routeBounds = L.latLngBounds([originLatLng, destLatLng]);
        if (viewportBounds.intersects(routeBounds)) return true;
      } catch (err) {
        // Si hay un error en cálculos, no filter; mejor no excluir por fallo de cálculo
        console.warn('[RoutesLayer] Error calculando visibilidad de ruta', err);
        return true;
      }

      return false;
    });
  }, [flights, airportsByCode, viewportBounds, curvature]);

  // Generar rutas con curvas Bezier
  const routes = useMemo(() => {
    return visibleFlights.map((flight) => {
      const originAirport = airportsByCode[flight.originCode];
      const destinationAirport = airportsByCode[flight.destinationCode];

      const start: LatLngTuple | null = originAirport
        ? [originAirport.latitud, originAirport.longitud]
        : (typeof flight.originLat === 'number' && typeof flight.originLon === 'number')
          ? [flight.originLat, flight.originLon]
          : null;

      const end: LatLngTuple | null = destinationAirport
        ? [destinationAirport.latitud, destinationAirport.longitud]
        : (typeof flight.destLat === 'number' && typeof flight.destLon === 'number')
          ? [flight.destLat, flight.destLon]
          : null;

      if (!start || !end) return null;

      // Si start y end son exactamente iguales, aplicar un pequeño offset para evitar una ruta degenerada
      let adjustedEnd = end;
      if (Math.abs(start[0] - end[0]) < 1e-9 && Math.abs(start[1] - end[1]) < 1e-9) {
        adjustedEnd = [end[0] + 0.00005, end[1] + 0.00005];
      }

      const ctrl = computeControlPoint(start, adjustedEnd, curvature);

      // Generar 40 puntos para una curva suave (más puntos = línea punteada más suave)
      const samples = 40;
      const arc: LatLngTuple[] = [];

      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        arc.push(bezierPoint(t, start, ctrl, adjustedEnd));
      }

      return {
        key: `route-${flight.eventId}`,
        positions: arc,
        flight,
      };
    }).filter(Boolean);
  }, [visibleFlights, airportsByCode, curvature]);

  // Debug info (solo en desarrollo)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - NODE_ENV está disponible en tiempo de ejecución
    if (import.meta.env.DEV && flights.length > 0) {
      console.log(`[RoutesLayer] Renderizando ${routes.length} de ${flights.length} rutas`);
    }
  }, [routes.length, flights.length]);

  return (
    <>
      {routes.map((route) => {
        if (!route) return null;
        
        // Color basado en progreso (opcional)
        const opacity = 0.25 + (route.flight.currentProgress * 0.15);
        
        return (
          <Polyline
            key={route.key}
            positions={route.positions}
            pathOptions={{
              color: '#3b82f6',
              opacity: opacity,
              weight: 2,
              dashArray: '10, 8',      // Línea punteada: 10px línea, 8px espacio
              lineCap: 'round',        // Puntas redondeadas
              lineJoin: 'round',       // Uniones redondeadas
            }}
            renderer={canvasRenderer}
            interactive={false} // No interactivo para mejor performance
          />
        );
      })}
    </>
  );
}
