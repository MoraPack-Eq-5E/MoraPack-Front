import { useEffect, useState } from 'react';
import type { Vuelo } from '@/types/map.types';
import { nextPosition } from '@/utils/flightPosition';
import { getFlightsSeed } from '../services/flights.service';

export function useLiveFlights(tickMs = 3000) {
    const [flights, setFlights] = useState<Vuelo[]>(() => getFlightsSeed());

    useEffect(() => {
        const id = setInterval(() => {
            setFlights(prev => prev.map(f => ({ ...f, ...nextPosition(f, 0.3) })));
        }, tickMs);
        return () => clearInterval(id);
    }, [tickMs]);

    return { flights, setFlights };
}
