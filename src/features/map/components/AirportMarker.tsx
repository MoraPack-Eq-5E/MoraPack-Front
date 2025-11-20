import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Aeropuerto } from '@/types/map.types';

/**
 * Genera el icono del aeropuerto con el color correspondiente
 * - Seleccionado: Azul brillante #3b82f6
 * - Principal (sede MoraPack): Dorado #f59e0b con borde más grueso y tamaño mayor
 * - Activo (DISPONIBLE): Negro oscuro #111827
 * - Inactivo (NO_DISPONIBLE): Gris claro #9CA3AF
 */
function airportIcon(isActive: boolean, isSelected: boolean, isPrincipal: boolean) {
    let color: string;
    let size: number;
    let strokeWidth: string;
    let strokeColor: string;
    
    if (isSelected) {
        color = '#3b82f6';
        size = isPrincipal ? 32 : 26;
        strokeWidth = '2';
        strokeColor = '#1e40af';
    } else if (isPrincipal) {
        // Aeropuerto principal: dorado con borde destacado
        color = isActive ? '#f59e0b' : '#d97706'; // Dorado (amber-500 o amber-600 si inactivo)
        size = 28;
        strokeWidth = '2.5';
        strokeColor = '#92400e'; // Borde más oscuro (amber-800)
    } else {
        color = isActive ? '#111827' : '#9CA3AF';
        size = 20;
        strokeWidth = '0';
        strokeColor = 'none';
    }
    
    // Para aeropuertos principales, usar un diseño especial con círculo de fondo
    const svg = isPrincipal 
        ? `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${isActive ? '1' : '0.6'}"/>
      <circle cx="12" cy="12" r="7" fill="white" opacity="0.95"/>
      <path d="M12 7L14 10L17 11L14 12L12 15L10 12L7 11L10 10Z" fill="${color}" stroke="${strokeColor}" stroke-width="1"/>
    </svg>`
        : `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M2 21h20v-2H2v2zm9-3h2l1-7 5-3V6l-6 2-2-6h-1l-2 6-6-2v2l5 3 1 7z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
    </svg>`;
    
    return new DivIcon({ 
        html: svg, 
        className: isPrincipal ? 'mora-pack-headquarters' : '', 
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
    const isPrincipal = airport.isPrincipal ?? false;
    
    const handleClick = () => {
        if (onClick) {
            onClick(airport);
        }
    };
    
    // Aeropuertos principales tienen mayor z-index para estar siempre visibles
    const zIndexOffset = isPrincipal ? 1500 : (isSelected ? 2000 : 0);
    
    // Calcular estado del almacén
    const capacidadUsada = airport.cantActual || 0;
    const capacidadMaxima = airport.capMaxAlmacen || 1000;
    const porcentajeDisponible = capacidadMaxima > 0 
        ? ((capacidadMaxima - capacidadUsada) / capacidadMaxima) * 100
        : 100;
    
    let status = 'DISPONIBLE';
    
    if (porcentajeDisponible < 1) {
        status = 'LLENO';
    } else if (porcentajeDisponible < 20) {
        status = 'RESTRINGIDO';
    }
    
    return (
        <Marker 
            position={[airport.latitud, airport.longitud]} 
            icon={airportIcon(isActive, isSelected, isPrincipal)}
            eventHandlers={{
                click: handleClick,
            }}
            zIndexOffset={zIndexOffset}
        >
            <Popup offset={[0, -10]}>
                <div style={{minWidth: '220px', fontFamily: 'system-ui, sans-serif'}}>
                    {/* Header con ciudad - país en negrita */}
                    <div style={{fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '10px', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px'}}>
                        {airport.ciudadInfo?.nombre || airport.ciudad || 'Desconocido'} - {airport.ciudadInfo?.pais || airport.pais || 'Desconocido'}
                    </div>
                    <div style={{fontSize: '12px', color: '#4b5563', lineHeight: 1.8}}>
                        <div>Código: {airport.codigoIATA}</div>
                        <div>Almacén: {capacidadUsada.toLocaleString()} / {capacidadMaxima.toLocaleString()} unidades</div>
                        <div>Estado: <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            background: status === 'LLENO' ? '#fee2e2' : status === 'RESTRINGIDO' ? '#fef3c7' : '#d1fae5',
                            color: status === 'LLENO' ? '#991b1b' : status === 'RESTRINGIDO' ? '#92400e' : '#065f46'
                        }}>
                            {status}
                        </span></div>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}
