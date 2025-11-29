/**
 * Hook para gestionar capacidades dinámicas de aeropuertos durante la simulación
 * Actualiza capacidades basándose en datos reales del backend + eventos de vuelo
 * 
 * Combina:
 * 1. Datos reales de almacenes desde backend (polling cada 1s)
 * 2. Cambios locales por eventos de vuelo (UI inmediata)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAirportsForMap } from './useAirportsForMap';
import { useAlmacenes } from './useAlmacenByAeropuerto';
import type { Aeropuerto } from '@/types/map.types';

export interface FlightCapacityEvent {
  eventType: 'DEPARTURE' | 'ARRIVAL';
  flightId: number;
  airportId: number;
  productIds: number[];
  totalVolume: number; // Volumen de productos en el vuelo (1 producto = 1 unidad)
  timestamp: Date;
}

/**
 * Hook para gestionar capacidades dinámicas de almacenes en aeropuertos
 */
export function useAirportCapacityManager(enableRealTimeUpdates = true) {
  const { airports: airportsFromDB, isLoading, error } = useAirportsForMap();

  // Obtener almacenes reales con polling cada segundo
  const { data: almacenesReales } = useAlmacenes({ 
    enabled: enableRealTimeUpdates,
  });

  // Cambios locales por eventos de vuelo (para UI inmediata)
  const [capacityChanges, setCapacityChanges] = useState<Record<number, number>>({});

  // Mapa de almacén por aeropuerto
  const almacenesPorAeropuerto = useMemo(() => {
    if (!almacenesReales || !airportsFromDB) return new Map();

    const map = new Map();
    almacenesReales.forEach((almacen) => {
      const airport = airportsFromDB.find((a) => a.almacen?.id === almacen.id);
      if (airport) {
        map.set(airport.id, almacen);
      }
    });
    return map;
  }, [almacenesReales, airportsFromDB]);

  // Reset cambios locales cuando llegan nuevos datos del backend
  useEffect(() => {
    if (almacenesReales && almacenesReales.length > 0) {
      setCapacityChanges({});
    }
  }, [almacenesReales]);

  /**
   * Convertir aeropuertos con capacidades reales + cambios locales
   */
  const airports: Aeropuerto[] = useMemo(() => {
    if (!airportsFromDB || airportsFromDB.length === 0) {
      return [];
    }

    return airportsFromDB.map((airport) => {
      const almacenReal = almacenesPorAeropuerto.get(airport.id);

      // Usar datos del almacén real si están disponibles
      const maxCapacity = almacenReal?.capacidadMaxima ?? airport.capMaxAlmacen ?? 1000;
      const baseUsedCapacity = almacenReal?.capacidadUsada ?? airport.cantActual ?? 0;

      // Aplicar cambios locales de eventos de vuelo
      const capacityChange = capacityChanges[airport.id] || 0;
      const currentUsedCapacity = Math.max(
        0,
        Math.min(maxCapacity, baseUsedCapacity + capacityChange)
      );

      // Calcular porcentaje
      const capacityPercent = maxCapacity > 0 
        ? Math.round((currentUsedCapacity / maxCapacity) * 100) 
        : 0;

      return {
        ...airport,
        cantActual: currentUsedCapacity,
        capMaxAlmacen: maxCapacity,
        capacityPercent,
      } as Aeropuerto & { capacityPercent?: number };
    });
  }, [airportsFromDB, almacenesPorAeropuerto, capacityChanges]);

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
   * Manejar evento de capacidad de vuelo (despegue o aterrizaje)
   */
  const handleFlightCapacityEvent = useCallback(
    (event: FlightCapacityEvent) => {
      if (event.eventType === 'DEPARTURE') {
        handleDeparture(event);
      } else if (event.eventType === 'ARRIVAL') {
        handleArrival(event);
      }
    },
    [handleDeparture, handleArrival]
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

