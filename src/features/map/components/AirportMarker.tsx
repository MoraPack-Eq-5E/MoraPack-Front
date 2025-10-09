import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Aeropuerto } from '@/types/map.types';

function airportIcon() {
    const svg = `
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M2 21h20v-2H2v2zm9-3h2l1-7 5-3V6l-6 2-2-6h-1l-2 6-6-2v2l5 3 1 7z" fill="#111827"/>
    </svg>`;
    return new DivIcon({ html: svg, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
}

export function AirportMarker({ airport }: { airport: Aeropuerto }) {
    return (
        <Marker position={[airport.latitud, airport.longitud]} icon={airportIcon()}>
            <Popup>
                <div className="space-y-1">
                    <div className="font-medium">{airport.codigo ?? airport.codigo}</div>
                    <div>Cantidad de paquetes: {airport.cantActual}</div>
                    <div>Cantidad máxima de paquetes: {airport.capMaxAlmacen}</div>
                </div>
            </Popup>
        </Marker>
    );
}
