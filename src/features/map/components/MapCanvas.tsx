import { MapContainer, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { ReactNode } from 'react';

type Props = { children?: ReactNode; className?: string };

const INITIAL_CENTER: LatLngExpression = [10, -30];

export function MapCanvas({ children, className }: Props) {
    return (
        <div className={className}>
            <MapContainer
                center={INITIAL_CENTER}
                zoom={4}
                minZoom={2}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {children}
            </MapContainer>
        </div>
    );
}
