// src/features/map/components/MapCanvas.tsx

import 'leaflet/dist/leaflet.css'; // Importa los estilos de Leaflet
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
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
        <div className={className} style={{ width: '100%', height: '100%' }}>
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
                />
                {children}
            </MapContainer>
        </div>
    );
}
