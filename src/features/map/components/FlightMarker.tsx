/**
 * FlightMarker - Marcador de avión en el mapa
 * 
 * Usa la posición y heading calculados por el backend con curvas Bézier.
 * Esto garantiza que todos los clientes vean exactamente la misma posición y dirección.
 */

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
    
    // Usar la posición calculada por el backend (ya incluye curva Bézier)
    const position: [number, number] = [vuelo.latitudActual, vuelo.longitudActual];
    
    // Usar el heading calculado por el backend
    const icon = useMemo(() => planeIcon(color, vuelo.heading), [color, vuelo.heading]);

    const handleClick = () => {
        if (onClick) {
            onClick(vuelo);
        }
    };

    return (
        <Marker 
            position={position} 
            icon={icon}
            eventHandlers={{
                click: handleClick,
            }}
            // Asegurar que el avión esté siempre visible sobre la línea
            zIndexOffset={1000}
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