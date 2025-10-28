import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Aeropuerto } from '@/types/map.types';

/**
 * Genera el icono del aeropuerto con el color correspondiente
 * - Seleccionado: Azul brillante #3b82f6
 * - Activo (DISPONIBLE): Negro oscuro #111827
 * - Inactivo (NO_DISPONIBLE): Gris claro #9CA3AF
 */
function airportIcon(isActive: boolean, isSelected: boolean) {
    const color = isSelected ? '#3b82f6' : (isActive ? '#111827' : '#9CA3AF');
    const size = isSelected ? 26 : 20;
    const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M2 21h20v-2H2v2zm9-3h2l1-7 5-3V6l-6 2-2-6h-1l-2 6-6-2v2l5 3 1 7z" fill="${color}" stroke="${isSelected ? '#1e40af' : 'none'}" stroke-width="${isSelected ? '1' : '0'}"/>
    </svg>`;
    return new DivIcon({ 
        html: svg, 
        className: '', 
        iconSize: [size, size], 
        iconAnchor: [size / 2, size / 2] 
    });
}

interface AirportMarkerProps {
    airport: Aeropuerto;
    onClick?: (airport: Aeropuerto) => void;
    isSelected?: boolean;
}

export function AirportMarker({ airport, onClick, isSelected = false }: AirportMarkerProps) {
    const isActive = airport.estado === 'DISPONIBLE';
    
    const handleClick = () => {
        if (onClick) {
            onClick(airport);
        }
    };
    
    return (
        <Marker 
            position={[airport.latitud, airport.longitud]} 
            icon={airportIcon(isActive, isSelected)}
            eventHandlers={{
                click: handleClick,
            }}
            zIndexOffset={isSelected ? 2000 : 0}
        />
    );
}
