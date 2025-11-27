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
  }, [map, forceUpdate]); // forceUpdate causa re-cálculo

  // Filtrar vuelos que tienen al menos un aeropuerto visible
  const visibleFlights = useMemo(() => {
    if (!viewportBounds) return [];
    
    return flights.filter((flight) => {
      const origin = airportsByCode[flight.originCode];
      const destination = airportsByCode[flight.destinationCode];
      
      if (!origin || !destination) return false;
      
      // Mostrar si origen o destino están en viewport
      return (
        viewportBounds.contains([origin.latitud, origin.longitud]) ||
        viewportBounds.contains([destination.latitud, destination.longitud])
      );
    });
  }, [flights, airportsByCode, viewportBounds]);

  // Generar rutas con curvas Bezier
  const routes = useMemo(() => {
    return visibleFlights.map((flight) => {
      const origin = airportsByCode[flight.originCode];
      const destination = airportsByCode[flight.destinationCode];
      
      if (!origin || !destination) return null;
      
      const start: LatLngTuple = [origin.latitud, origin.longitud];
      const end: LatLngTuple = [destination.latitud, destination.longitud];
      const ctrl = computeControlPoint(start, end, curvature);
      
      // Generar 40 puntos para una curva suave (más puntos = línea punteada más suave)
      const samples = 40;
      const arc: LatLngTuple[] = [];
      
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        arc.push(bezierPoint(t, start, ctrl, end));
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

