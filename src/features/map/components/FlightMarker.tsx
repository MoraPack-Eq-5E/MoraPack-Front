import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Vuelo, EstadoVuelo } from '@/types/map.types';
import { useMemo } from 'react';

function statusColor(estado: EstadoVuelo): string {
    switch (estado) {
        case 'IN_FLIGHT':
            return '#22c55e'; // green
        case 'LANDED':
            return '#94a3b8'; // gray
        case 'SCHEDULED':
            return '#3b82f6'; // blue
        default:
            return '#6b7280';
    }
}

function planeIcon(color: string, rotateDeg: number) {
    const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" style="transform: rotate(${rotateDeg}deg)">
      <path d="M2 14l8-2 3-8 2 2-2 6 7 3-1 2-7-1-4 5h-2l2-6-6-1z" fill="${color}"/>
    </svg>`;
    return new DivIcon({ html: svg, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
}

interface FlightMarkerProps {
    vuelo: Vuelo;
    onClick?: (vuelo: Vuelo) => void;
}

export function FlightMarker({ vuelo, onClick }: FlightMarkerProps) {
    const color = statusColor(vuelo.estado);
    const heading = 90; // Default heading for now
    const icon = useMemo(() => planeIcon(color, heading), [color, heading]);

    const handleClick = () => {
        if (onClick) {
            onClick(vuelo);
        }
    };

    return (
        <Marker 
            position={[vuelo.latitudActual, vuelo.longitudActual]} 
            icon={icon}
            eventHandlers={{
                click: handleClick,
            }}
        >
            <Popup>
                <div className="space-y-1">
                    <div className="font-medium">{vuelo.codigo}</div>
                    <div className="text-sm">{vuelo.ciudadOrigen} → {vuelo.ciudadDestino}</div>
                    <div className="text-sm">Estado: {vuelo.estado}</div>
                    <div className="text-sm">Progreso: {Math.round(vuelo.progreso)}%</div>
                    <div className="text-sm">Pedidos: {vuelo.paquetesABordo}</div>
                    <div className="text-sm">
                        Capacidad: {vuelo.capacidadUsada}/{vuelo.capacidadMax} productos
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}