/**
 * MapPage
 * Página "En vivo" del mapa
 * - Respeta el mismo esqueleto que DashboardPage
 * - Usa los components/hooks del feature `map`
 */

import { TopBar, Sidebar } from '@/components/layout';

// UI del feature
import { MapCanvas, FlightMarker, AirportMarker, StatsCard } from '@/features/map/components';

// Estado/animación y métricas
import { useLiveFlights, useMapStats } from '@/features/map/hooks';

// Fuente de aeropuertos (por ahora seed; luego podrá ser useQuery)
import { useAirports } from '@/features/map/services/airports.service';

export function MapPage() {
    // 1) Datos
    const { airports } = useAirports();           // aeropuertos estáticos (seed)
    const { flights } = useLiveFlights(3000);     // vuelos que se mueven cada 3s
    const stats = useMapStats(flights);           // KPIs de la tarjeta

    // 2) Layout idéntico a DashboardPage
    return (
        <div className="min-h-screen bg-gray-50">
            <TopBar />
            <Sidebar />

            {/* Contenido principal con padding-top para TopBar fijo y padding-left para Sidebar */}
            <main className="pt-16" style={{ paddingLeft: '165px' }}>
                {/* El mapa llena el alto visible debajo del TopBar */}
                <div className="relative h-[calc(100vh-64px)] w-full">
                    <MapCanvas className="h-full w-full">
                        {airports.map(a => (
                            <AirportMarker key={a.id} airport={a} />
                        ))}
                        {flights.map(f => (
                            <FlightMarker key={f.id} vuelo={f} />
                        ))}
                    </MapCanvas>

                    {/* Tarjeta de métricas sobre el mapa (como en el mockup) */}
                    <StatsCard
                        flightsInAir={stats.total}
                        slaPct={stats.slaPct}
                        warehousePct={stats.whPct}
                        now={stats.now}
                    />
                </div>
            </main>
        </div>
    );
}