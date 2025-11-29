/**
 * Hook para gestionar capacidades dinámicas de aeropuertos durante la simulación
 * Actualiza capacidades basándose en eventos de despegue y aterrizaje de vuelos
 * 
 * Patrón seguido: morapack-frontend/src/hooks/useAirportCapacityManager.ts
 */

import { useState, useCallback, useMemo } from 'react';
import { useAirportsForMap } from './useAirportsForMap';
import type { Aeropuerto } from '@/types/map.types';

export interface FlightCapacityEvent {
  eventType: 'DEPARTURE' | 'ARRIVAL' | 'PICKUP'; // PICKUP = cliente recoge en destino final
  flightId: number;
  airportId: number;
  airportCode?: string; // Código IATA (para PICKUP)
  productIds: number[];
  totalVolume: number; // Volumen de productos en el vuelo (1 producto = 1 unidad)
  timestamp: Date;
}

/**
 * Hook para gestionar capacidades dinámicas de almacenes en aeropuertos
 */
export function useAirportCapacityManager() {
  // Obtener aeropuertos desde el backend
  const { airports: airportsFromDB, isLoading, error } = useAirportsForMap();

  // Rastrear cambios dinámicos de capacidad durante la simulación
  const [capacityChanges, setCapacityChanges] = useState<Record<number, number>>({});

  /**
   * Convertir aeropuertos de BD a formato con capacidad dinámica
   */
  const airports: Aeropuerto[] = useMemo(() => {
    if (!airportsFromDB || airportsFromDB.length === 0) {
      return [];
    }

    return airportsFromDB.map((airport) => {
      const maxCapacity = airport.capMaxAlmacen || 1000;
      const baseUsedCapacity = airport.cantActual || 0;

      // Aplicar cambios dinámicos de simulación
      const capacityChange = capacityChanges[airport.id] || 0;
      const currentUsedCapacity = Math.max(
        0,
        Math.min(maxCapacity, baseUsedCapacity + capacityChange)
      );

      // Calcular porcentaje de capacidad
      const capacityPercent = maxCapacity > 0 
        ? Math.round((currentUsedCapacity / maxCapacity) * 100) 
        : 0;

      return {
        ...airport,
        cantActual: currentUsedCapacity,
        // Agregar campo de porcentaje si no existe
        capacityPercent,
      } as Aeropuerto & { capacityPercent?: number };
    });
  }, [airportsFromDB, capacityChanges]);

  /**
   * Manejar despegue de vuelo - disminuye capacidad en aeropuerto origen
   */
  const handleDeparture = useCallback((event: FlightCapacityEvent) => {
    setCapacityChanges((prev) => ({
      ...prev,
      [event.airportId]: (prev[event.airportId] || 0) - event.totalVolume,
    }));

    console.log(
        `[CAPACITY] ✈️ Despegue desde aeropuerto ${event.airportId}: -${event.totalVolume} volumen (${event.productIds.length} productos)`
    );
  }, []);

  /**
   * Manejar aterrizaje de vuelo - aumenta capacidad en aeropuerto destino
   */
  const handleArrival = useCallback((event: FlightCapacityEvent) => {
    setCapacityChanges((prev) => ({
      ...prev,
      [event.airportId]: (prev[event.airportId] || 0) + event.totalVolume,
    }));

    console.log(
        `[CAPACITY] 🛬 Aterrizaje en aeropuerto ${event.airportId}: +${event.totalVolume} volumen (${event.productIds.length} productos)`
    );
  }, []);

  /**
   * Manejar recogida de cliente - disminuye capacidad en aeropuerto destino final (+2h después de llegada)
   */
  const handlePickup = useCallback((event: FlightCapacityEvent) => {
    // Buscar aeropuerto por código IATA si no tenemos airportId
    let airportId = event.airportId;
    if (!airportId && event.airportCode && airportsFromDB) {
      const airport = airportsFromDB.find(a => a.codigoIATA === event.airportCode);
      if (airport) {
        airportId = airport.id;
      }
    }

    if (airportId) {
      setCapacityChanges((prev) => ({
        ...prev,
        [airportId]: (prev[airportId] || 0) - event.totalVolume,
      }));

      console.log(
        `[CAPACITY] 📦 Recogida en aeropuerto ${event.airportCode || airportId}: -${event.totalVolume} volumen (cliente recogió)`
      );
    }
  }, [airportsFromDB]);

  /**
   * Manejar evento de capacidad de vuelo (despegue, aterrizaje o recogida)
   */
  const handleFlightCapacityEvent = useCallback(
    (event: FlightCapacityEvent) => {
      if (event.eventType === 'DEPARTURE') {
        handleDeparture(event);
      } else if (event.eventType === 'ARRIVAL') {
        handleArrival(event);
      } else if (event.eventType === 'PICKUP') {
        handlePickup(event);
      }
    },
    [handleDeparture, handleArrival, handlePickup]
  );

  /**
   * Reiniciar cambios de capacidad (útil al reiniciar simulación)
   */
  const resetCapacities = useCallback(() => {
    setCapacityChanges({});
    console.log('[CAPACITY] 🔄 Reset de todos los cambios de capacidad');
  }, []);

  /**
   * Obtener capacidad actual de un aeropuerto específico
   */
  const getAirportCapacity = useCallback(
    (airportId: number) => {
      const airport = airports.find((a) => a.id === airportId);
      return {
        capacityPercent: (airport as any)?.capacityPercent || 0,
        maxCapacity: airport?.capMaxAlmacen || 0,
        currentUsedCapacity: airport?.cantActual || 0,
      };
    },
    [airports]
  );

  return {
    airports,
    isLoading,
    error,
    handleFlightCapacityEvent,
    resetCapacities,
    getAirportCapacity,
  };
}

