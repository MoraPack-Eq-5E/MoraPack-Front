import { useEffect, useState, useRef } from 'react';
import type { Vuelo } from '@/types/map.types';
import type { SimulationStatusResponse, ActiveFlight } from '@/types/simulation.types';
import { getSimulationStatus, startVisualization } from '@/services/simulation.service';

export type LoadingStatus = 'initializing' | 'loading-visualization' | 'loading-flights' | 'ready' | 'error';

/**
 * Hook para obtener vuelos en tiempo real desde el backend
 * Hace polling cada tickMs y convierte ActiveFlight -> Vuelo
 * Automáticamente inicia la visualización si no está activa
 */
export function useLiveFlights(simulationId: number | null, tickMs = 2000) {
    const [flights, setFlights] = useState<Vuelo[]>([]);
    const [status, setStatus] = useState<SimulationStatusResponse | null>(null);
    const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('initializing');
    const [error, setError] = useState<Error | null>(null);
    const visualizationStartedRef = useRef(false);
    const isInitialLoadRef = useRef(true); // Track if it's the first load

    useEffect(() => {
        if (!simulationId) {
            setFlights([]);
            setLoadingStatus('initializing');
            visualizationStartedRef.current = false;
            isInitialLoadRef.current = true;
            return;
        }

        let isMounted = true;
        let intervalId: number | null = null;
        
        const fetchStatus = async () => {
            try {
                // Solo cambiar a loading-flights durante la carga inicial
                if (isInitialLoadRef.current) {
                    setLoadingStatus('loading-flights');
                }
                
                const data = await getSimulationStatus(simulationId);
                
                if (isMounted) {
                    setStatus(data);
                    // Convertir ActiveFlight[] -> Vuelo[]
                    const vuelosActualizados = data.activeFlights.map(mapActiveFlightToVuelo);
                    setFlights(vuelosActualizados);
                    setError(null);
                    
                    // Solo cambiar a ready si estamos en carga inicial
                    if (isInitialLoadRef.current) {
                        setLoadingStatus('ready');
                        isInitialLoadRef.current = false; // Marcar que ya completó carga inicial
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    // Si es 503 (simulación no cargada), intentar iniciar visualización automáticamente
                    if (err.status === 503 && !visualizationStartedRef.current) {
                        console.log('⚠️ Simulación no cargada en memoria, iniciando visualización...');
                        setLoadingStatus('loading-visualization');
                        visualizationStartedRef.current = true; // Marcar inmediatamente para evitar reintentos
                        
                        try {
                            setError(null); // Limpiar error mientras cargamos
                            await startVisualization(simulationId, { timeScale: 112, autoStart: true });
                            console.log('✅ Visualización iniciada correctamente');
                            
                            // Esperar 2 segundos para que el backend cargue todo en memoria
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // Reintentar fetch
                            if (isMounted) {
                                await fetchStatus();
                            }
                        } catch (startErr) {
                            console.error('❌ Error al iniciar visualización:', startErr);
                            setError(new Error('No se pudo iniciar la visualización. Verifica que la simulación ALNS haya completado.'));
                            setLoadingStatus('error');
                        }
                    } else {
                        setError(err as Error);
                        // Solo cambiar a error si estamos en carga inicial
                        if (isInitialLoadRef.current) {
                            setLoadingStatus('error');
                        }
                        console.error('Error fetching simulation status:', err);
                    }
                }
            }
        };

        // Función de inicialización
        const initialize = async () => {
            setLoadingStatus('initializing');
            
            // Intentar obtener status directamente
            await fetchStatus();
            
            // Iniciar polling solo si todo salió bien
            if (isMounted && !error) {
                intervalId = setInterval(fetchStatus, tickMs);
            }
        };

        initialize();
        
        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [simulationId, tickMs]);

    return { flights, status, loadingStatus, error };
}

/**
 * Convierte ActiveFlight del backend a Vuelo del frontend
 */
function mapActiveFlightToVuelo(af: ActiveFlight): Vuelo {
    return {
        id: af.flightId,
        codigo: af.flightCode,
        ciudadOrigen: af.originCity,
        ciudadDestino: af.destinationCity,
        codigoOrigen: af.originCode,
        codigoDestino: af.destinationCode,
        latitudActual: af.currentLat,
        longitudActual: af.currentLng,
        latitudOrigen: af.originLat,
        longitudOrigen: af.originLng,
        latitudDestino: af.destinationLat,
        longitudDestino: af.destinationLng,
        estado: af.status as 'SCHEDULED' | 'IN_FLIGHT' | 'LANDED',
        progreso: af.progressPercentage,
        heading: af.heading, // Dirección calculada con curva Bézier en el backend
        paquetesABordo: af.packagesOnBoard.length,
        capacidadUsada: af.capacityUsed,
        capacidadMax: af.capacityMax,
    };
}
