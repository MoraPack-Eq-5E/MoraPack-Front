/**
 * AnimatedFlightPath - Línea de ruta animada con efecto "hormiga marchante"
 * 
 * MEJORADO para usar:
 * - Curvas Bezier cuadráticas precisas (desde bezier.utils)
 * - leaflet-ant-path con hardware acceleration
 * - Mejor curvatura y suavidad
 */

import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-ant-path';
import { generateBezierRoute, type LatLngTuple } from '../utils/bezier.utils';

interface AnimatedFlightPathProps {
  start: [number, number];
  end: [number, number];
  color?: string;
  weight?: number;
  opacity?: number;
  delay?: number;
  curvature?: number;
}

/**
 * Componente mejorado con curvas Bezier precisas
 */
export function AnimatedFlightPath({
  start,
  end,
  color = '#3b82f6',
  weight = 2,
  opacity = 0.6,
  delay = 400,
  curvature = 0.25,
}: AnimatedFlightPathProps) {
  const map = useMap();

  // Generar ruta curva usando las utilidades de Bezier
  // Memoizar para evitar recalcular en cada render
  const path = useMemo(() => {
    const startTuple: LatLngTuple = [start[0], start[1]];
    const endTuple: LatLngTuple = [end[0], end[1]];
    
    // Generar 60 puntos para una curva muy suave
    return generateBezierRoute(startTuple, endTuple, 60, curvature);
  }, [start, end, curvature]);

  useEffect(() => {
    if (!map) return;

    // Crear línea animada con ant-path
    // ant-path usa canvas para mejor performance
    const antPath = (L as any).polyline.antPath(path, {
      color: color,
      weight: weight,
      opacity: opacity,
      delay: delay,
      dashArray: [10, 20], // Patrón de puntos
      pulseColor: '#FFFFFF',
      paused: false,
      reverse: false,
      hardwareAccelerated: true,
      interactive: false, // No interactivo para mejor performance
    });

    // Agregar al mapa
    antPath.addTo(map);

    // Limpiar cuando se desmonte
    return () => {
      if (map.hasLayer(antPath)) {
        map.removeLayer(antPath);
      }
    };
  }, [map, path, color, weight, opacity, delay]);

  return null; // Este componente no renderiza nada directamente en React
}

