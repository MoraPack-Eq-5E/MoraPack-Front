/**
 * Hook DEPRECADO - Ya no se usa con el nuevo sistema de SimulationPlayer
 * Se mantiene por compatibilidad pero retorna datos vacíos
 */

import { useState } from 'react';
import type { Vuelo } from '@/types/map.types';

export type LoadingStatus = 'initializing' | 'loading-visualization' | 'loading-flights' | 'ready' | 'error';

/**
 * @deprecated Este hook ya no se usa. Usa SimulationPlayer en su lugar.
 */
export function useLiveFlights(_simulationId: number | null, _tickMs = 2000) {
    const [flights] = useState<Vuelo[]>([]);
    const [status] = useState<any>(null);
    const [loadingStatus] = useState<LoadingStatus>('ready');
    const [error] = useState<Error | null>(null);

    return { flights, status, loadingStatus, error };
}
