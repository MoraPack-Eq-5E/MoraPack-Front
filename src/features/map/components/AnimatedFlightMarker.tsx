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
import { computeControlPoint, bezierPoint, bezierTangent, bearingFromTangent, type LatLngTuple } from '../utils/bezier.utils';

interface AnimatedFlightMarkerProps {
  flight: ActiveFlightState;
  curvature?: number;
}

/**
 * Crea el ícono del avión con rotación
 * Área de clic expandida (48x48) para facilitar interacción durante movimiento
 */
function createPlaneIcon(bearing: number, color: string): DivIcon {
  // El SVG del avión apunta hacia el noreste en su diseño original
  // Necesitamos un offset de -45° para que apunte al norte cuando bearing = 0°
  const rotation = bearing - 45;

  // Contenedor más grande (48x48) con el avión centrado (24x24)
  const planeHTML = `
    <div style="
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 128 128"
        style="
          display: block;
          transform: rotate(${rotation}deg);
          transform-origin: center center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          pointer-events: none;
        "
      >
        <path d="M119.7,18.2c7.8-7.8-3-17.9-10.7-10.3L80.7,36.3L15.8,19.2L5,30l53.5,28.2L36.8,79.8L20,77.7l-8.6,8.6l19.1,10l10,19.1l8.6-8.6l-2-16.7l21.6-21.6l27.6,53.2l10.8-10.8L90.8,47.2L119.7,18.2z" fill="${color}"/>
      </svg>
    </div>
  `;

  return new DivIcon({
    html: planeHTML,
    className: 'plane-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
}

/**
 * Componente mejorado con curvas Bezier y rotación precisa
 */
export function AnimatedFlightMarker({
     flight,
     curvature = 0.25
     }: AnimatedFlightMarkerProps) {
  const map = useMap();
  const markerRef = useRef<LeafletMarker | null>(null);

  // Validar coordenadas
  if (!flight.originLat || !flight.originLon || !flight.destLat || !flight.destLon) {
    return null;
  }

  // Precalcular puntos de la curva Bezier
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const bezierData = useMemo(() => {
    const start: LatLngTuple = [flight.originLat!, flight.originLon!];
    const end: LatLngTuple = [flight.destLat!, flight.destLon!];
    const ctrl = computeControlPoint(start, end, curvature);

    return { start, end, ctrl };
  }, [flight.originLat, flight.originLon, flight.destLat, flight.destLon, curvature]);

  // Color basado en porcentaje de ocupación de la capacidad del avión
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const color = useMemo(() => {
    const capacityMax = flight.capacityMax || 300; // Capacidad estándar por defecto
    const capacityUsed = flight.capacityUsed || flight.productIds.length;
    const occupancyPercent = (capacityUsed / capacityMax) * 100;

    // Colores según imagen:
    // Verde oscuro: < 70% (Moderada)
    // Amarillo: 70-85% (Alta)
    // Naranja: 85-95% (Muy alta)
    // Rojo: > 95% (Casi lleno)
    if (occupancyPercent < 70) {
      return '#059669'; // Verde oscuro (green-600)
    } else if (occupancyPercent < 85) {
      return '#eab308'; // Amarillo (yellow-500)
    } else if (occupancyPercent < 95) {
      return '#f97316'; // Naranja (orange-500)
    } else {
      return '#ef4444'; // Rojo (red-500)
    }
  }, [flight.capacityMax, flight.capacityUsed, flight.productIds.length]);

  // Calcular posición y rotación en la curva Bezier
  const currentState = useMemo(() => {
    const { start, ctrl, end } = bezierData;
    const progress = Math.max(0, Math.min(1, flight.currentProgress));

    const position = bezierPoint(progress, start, ctrl, end);
    const tangent = bezierTangent(progress, start, ctrl, end);
    const bearing = bearingFromTangent(tangent);

    return { position, bearing };
  }, [bezierData, flight.currentProgress]);

  // Crear marker UNA SOLA VEZ cuando el componente se monta
  useEffect(() => {
    if (!map) return;

    const { position, bearing } = currentState;
    const [lat, lng] = position;

    const icon = createPlaneIcon(bearing, color);
    const marker = L.marker([lat, lng], {
      icon,
      interactive: true,
      bubblingMouseEvents: false,
      pane: 'markerPane', // Asegura que esté encima de las rutas
      zIndexOffset: 1000
    });

    // Usar capacityUsed directamente del objeto flight
    const capacityUsed = flight.capacityUsed || flight.productIds.length;
    const capacityMax = flight.capacityMax || 360;
    const progressPercent = Math.round(flight.currentProgress * 100);

    // Contar pedidos agrupados en este vuelo
    const numPedidos = flight.orderIds?.length || 1;

    // Usar el código de vuelo sin modificar (ya viene limpio del backend)
    const cleanFlightCode = flight.flightCode;
    // 🔹 texto extra solo si tenemos windowIndex
    const ventanaInfo = flight.windowIndex
        ? `<div>Ventana: ${flight.windowIndex}</div>`
        : '';
    marker.bindPopup(`
      <div style="min-width: 220px; font-family: system-ui, sans-serif;">
        <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">
          ${cleanFlightCode}
        </div>
        <div style="font-size: 12px; color: #4b5563; line-height: 1.8;">
          <div>${flight.originCode} → ${flight.destinationCode}</div>
          <div>Progreso: ${progressPercent}%</div>
          <div>Capacidad: ${capacityUsed}/${capacityMax} productos</div>
          <div>Num. Pedidos: ${numPedidos}</div>
          ${ventanaInfo}
        </div>
      </div>
    `, { offset: [0, -10] });

    marker.addTo(map);
    markerRef.current = marker;

    // Cleanup SOLO cuando el componente se desmonta
    return () => {
      map.removeLayer(marker);
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // Solo depende de map - se crea una vez

  // Actualizar posición, icono y popup (SIN destruir el marcador)
  useEffect(() => {
    if (!markerRef.current) return;

    const { position, bearing } = currentState;
    const [lat, lng] = position;

    markerRef.current.setLatLng([lat, lng]);
    markerRef.current.setIcon(createPlaneIcon(bearing, color));
    
    // Actualizar contenido del popup con progreso actual
    const capacityUsed = flight.capacityUsed || flight.productIds.length;
    const capacityMax = flight.capacityMax || 360;
    const progressPercent = Math.round(flight.currentProgress * 100);
    const numPedidos = flight.orderIds?.length || 1;
    const cleanFlightCode = flight.flightCode;
    // 🔹 texto extra solo si tenemos windowIndex
    const ventanaInfo = flight.windowIndex
        ? `<div>Ventana: ${flight.windowIndex}</div>`
        : '';
    markerRef.current.setPopupContent(`
      <div style="min-width: 220px; font-family: system-ui, sans-serif;">
        <div style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 8px;">
          ${cleanFlightCode}
        </div>
        <div style="font-size: 12px; color: #4b5563; line-height: 1.8;">
          <div>${flight.originCode} → ${flight.destinationCode}</div>
          <div>Progreso: ${progressPercent}%</div>
          <div>Capacidad: ${capacityUsed}/${capacityMax} productos</div>
          <div>Num. Pedidos: ${numPedidos}</div>
          ${ventanaInfo}
        </div>
      </div>
    `);
  }, [currentState, color, flight]);

  return null; // Este componente no renderiza React, usa Leaflet nativo
}