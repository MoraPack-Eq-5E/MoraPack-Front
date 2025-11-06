// src/features/map/components/DiaView.tsx

import { MapCanvas, AirportMarker } from '@/features/map/components';
import { useAirportsForMap } from '@/features/map/hooks';
import type { Aeropuerto } from "@/types";
import { useState } from 'react';
import PedidoPanel from './PedidoPanel'; // Importamos el PedidoPanel

export function DiaView() {
    const { airports, isLoading: airportsLoading } = useAirportsForMap();

    // Estado para el aeropuerto seleccionado (código IATA)
    const [selectedAirportCode, setSelectedAirportCode] = useState<string | null>(null);

    const handleAirportClick = (airport: Aeropuerto) => {
        // Si clickean el mismo aeropuerto, deseleccionar
        if (selectedAirportCode === airport.codigo) {
            setSelectedAirportCode(null);
        } else {
            setSelectedAirportCode(airport.codigo);
        }
    };

    // Cargando aeropuertos
    if (airportsLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Cargando aeropuertos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex">
            {/* MapCanvas */}
            <MapCanvas className="flex-grow h-full">
                {/* Aeropuertos - Solo usar los datos estáticos */}
                {airports.map((airport) => (
                    <AirportMarker
                        key={airport.id}
                        airport={airport}
                        onClick={handleAirportClick}
                        isSelected={selectedAirportCode === airport.codigo}
                    />
                ))}
            </MapCanvas>

            {/* PedidoPanel a la derecha */}
            <div className="h-full w-[300px] bg-gray-100">
                <PedidoPanel />
            </div>
        </div>
    );
}
