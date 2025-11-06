/**
 * AnimatedFlightMarker - Marcador de avión animado con curvas Bezier
 * 
 * MEJORADO para usar:
 * - Curvas Bezier cuadráticas (más realistas)
 * - Rotación calculada desde tangente de la curva
 * - Hardware acceleration con will-change
 * - Icono PNG con mejor performance
 */

import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L, { DivIcon, Marker as LeafletMarker } from 'leaflet';
import type { ActiveFlightState } from '@/services/simulation-player.service';
import { 
  computeControlPoint, 
  bezierPoint, 
  bezierTangent, 
  bearingFromTangent,
  type LatLngTuple 
} from '../utils/bezier.utils';

interface AnimatedFlightMarkerProps {
  flight: ActiveFlightState;
  curvature?: number;
  onClick?: () => void;
}

/**
 * Crea el ícono del avión con rotación usando imagen PNG
 * Optimizado para hardware acceleration
 */
function createPlaneIcon(bearing: number, color: string): DivIcon {
  // Intentar usar imagen PNG, fallback a SVG
  const planeHTML = `
    <img 
      src="/airplane.png" 
      alt="✈" 
      class="plane-marker"
      style="
        width: 20px;
        height: 20px;
        display: block;
        transform: rotate(${bearing}deg);
        transform-origin: center center;
        will-change: transform;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)) brightness(0) saturate(100%) invert(48%) sepia(99%) saturate(3048%) hue-rotate(${color === '#ef4444' ? '340deg' : color === '#f97316' ? '15deg' : '200deg'}) brightness(100%) contrast(101%);
        transition: transform 0.2s ease-out;
      "
    />
  `;
  
  return new DivIcon({ 
    html: planeHTML, 
    className: 'plane-icon', 
    iconSize: [20, 20], 
    iconAnchor: [10, 10] 
  });
}

/**
 * Componente mejorado con curvas Bezier y rotación precisa
 */
export function AnimatedFlightMarker({ 
  flight, 
  curvature = 0.25,
  onClick
}: AnimatedFlightMarkerProps) {
  const map = useMap();
  const markerRef = useRef<LeafletMarker | null>(null);
  const lastUpdateRef = useRef<{ progress: number; lat: number; lng: number } | null>(null);

  // Validar coordenadas
  if (!flight.originLat || !flight.originLon || !flight.destLat || !flight.destLon) {
    return null;
  }

  // Precalcular puntos de la curva Bezier
  const bezierData = useMemo(() => {
    const start: LatLngTuple = [flight.originLat!, flight.originLon!];
    const end: LatLngTuple = [flight.destLat!, flight.destLon!];
    const ctrl = computeControlPoint(start, end, curvature);
    
    return { start, end, ctrl };
  }, [flight.originLat, flight.originLon, flight.destLat, flight.destLon, curvature]);

  // Color basado en cantidad de productos
  const color = useMemo(() => {
    const productCount = flight.productIds.length;
    return productCount > 100 ? '#ef4444' : productCount > 50 ? '#f97316' : '#3b82f6';
  }, [flight.productIds.length]);

  // Calcular posición y rotación en la curva Bezier
  const currentState = useMemo(() => {
    const { start, ctrl, end } = bezierData;
    const progress = Math.max(0, Math.min(1, flight.currentProgress));
    
    const position = bezierPoint(progress, start, ctrl, end);
    const tangent = bezierTangent(progress, start, ctrl, end);
    const bearing = bearingFromTangent(tangent);
    
    return { position, bearing };
  }, [bezierData, flight.currentProgress]);

  // Crear/actualizar marker con Leaflet nativo para mejor performance
  useEffect(() => {
    if (!map) return;

    const { position, bearing } = currentState;
    const [lat, lng] = position;

    // Throttle: solo actualizar si cambió significativamente
    if (lastUpdateRef.current) {
      const distLat = Math.abs(lat - lastUpdateRef.current.lat);
      const distLng = Math.abs(lng - lastUpdateRef.current.lng);
      const distProgress = Math.abs(flight.currentProgress - lastUpdateRef.current.progress);
      
      // Si el cambio es muy pequeño, skip
      if (distLat < 0.001 && distLng < 0.001 && distProgress < 0.01) {
        return;
      }
    }

    lastUpdateRef.current = { progress: flight.currentProgress, lat, lng };

    // Crear marker si no existe
    if (!markerRef.current) {
      const icon = createPlaneIcon(bearing, color);
      const marker = L.marker([lat, lng], { 
        icon, 
        interactive: true,
        zIndexOffset: 1000 
      });

      // Agregar popup con info del vuelo
      marker.bindPopup(`
        <div style="min-width: 200px; font-family: sans-serif;">
          <strong style="font-size: 16px;">✈️ ${flight.flightCode}</strong><br/>
          <div style="margin: 8px 0; color: #6b7280;">
            ${flight.originCode} → ${flight.destinationCode}
          </div>
          <div style="font-size: 13px; color: #374151;">
            Progreso: ${(flight.currentProgress * 100).toFixed(1)}%
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            Productos: ${flight.productIds.length}
          </div>
        </div>
      `, { offset: [0, -10] });

      // Agregar handler de click si se proporciona
      if (onClick) {
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onClick();
        });
      }

      marker.addTo(map);
      markerRef.current = marker;
    } else {
      // Actualizar posición e icono
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(createPlaneIcon(bearing, color));
    }

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, currentState, color, flight]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map]);

  return null; // Este componente no renderiza React, usa Leaflet nativo
}

