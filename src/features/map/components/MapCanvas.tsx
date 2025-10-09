/**
 * MapCanvas Component
 * 
 * Wrapper para el contenedor de Leaflet que configura el mapa base.
 * Proporciona el canvas interactivo donde se renderizan los marcadores y overlays.
 */

import { MapContainer, TileLayer,ZoomControl } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { ReactNode } from 'react';

interface MapCanvasProps {
  children?: ReactNode;
  className?: string;
}

// Vista inicial centrada en el Océano Atlántico
const INITIAL_CENTER: LatLngExpression = [10, -30];
const INITIAL_ZOOM = 4;
const MIN_ZOOM = 2;

export function MapCanvas({ children, className }: MapCanvasProps) {
  return (
    <div className={className}>
      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}  // Remueve el control de atribución
        zoomControl={false}           // Mantiene los controles de zoom
      >
        <ZoomControl position="bottomleft" />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          // No attribution necesaria aquí ya que el control está deshabilitado
        />
        {children}
      </MapContainer>
    </div>
  );
}
