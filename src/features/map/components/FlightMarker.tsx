import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Vuelo } from '@/types/map.types';
import { statusColor } from '@/utils/flightPosition';
import { useMemo } from 'react';

function planeIcon(color: string, rotateDeg: number) {
    const svg = `
    <svg width="24" height="24" viewBox="0 0 24 24" style="transform: rotate(${rotateDeg}deg)">
      <path d="M2 14l8-2 3-8 2 2-2 6 7 3-1 2-7-1-4 5h-2l2-6-6-1z" fill="${color}"/>
    </svg>`;
    return new DivIcon({ html: svg, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
}

export function FlightMarker({ vuelo }: { vuelo: Vuelo }) {
    const color = statusColor(vuelo.estado);
    const heading = vuelo.headingDeg ?? 90;
    const icon = useMemo(() => planeIcon(color, heading), [color, heading]);

    return (
        <Marker position={[vuelo.latitudActual, vuelo.longitudActual]} icon={icon}>
            <Popup>
                <div className="space-y-1">
                    <div className="font-medium">{vuelo.codigo}</div>
                    <div>Estado: {vuelo.estado}</div>
                    {vuelo.speedKts ? <div>Velocidad: {Math.round(vuelo.speedKts)} kts</div> : null}
                    <div>Rumbo: {Math.round(heading)}°</div>
                    <div>{vuelo.ciudadOrigen} → {vuelo.ciudadDestino}</div>
                </div>
            </Popup>
        </Marker>
    );
}