import { useMemo } from 'react';
import type { Vuelo } from '@/types/map.types';

export function useMapStats(flights: Vuelo[]) {
    return useMemo(() => {
        const total = flights.length;
        const slaPct = 30; // mock
        const whPct  = 80; // mock
        const now = new Date().toLocaleString();
        return { total, slaPct, whPct, now };
    }, [flights]);
}
