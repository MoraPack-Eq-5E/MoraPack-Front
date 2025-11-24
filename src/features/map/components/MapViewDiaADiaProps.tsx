/**
 * MapViewDiaADia.tsx
 * 
 * Vista del mapa para operación "día a día"
 * Inspirado en MapViewTemporal y MapView,
 * pero SIN SimulationPlayer y SIN controles.
 */

import React, { useMemo } from "react";
import L from "leaflet";

import { MapCanvas } from "./MapCanvas";
import { AirportMarker } from "./AirportMarker";
import { AnimatedFlightMarker } from "./AnimatedFlightMarker";
import { RoutesLayer } from "./RoutesLayer";

import { useAirportsForMap } from "@/features/map/hooks";
import type { ResultadoAlgoritmoDTO } from "@/services/algoritmo.service";
import type { ActiveFlightState } from '@/services/simulation-player.service';

// ====== TIPOS ======
interface DiaADiaFlight {
  eventId: string;
  flightCode: string;

  originLat: number;
  originLon: number;

  destLat: number;
  destLon: number;

  currentProgress: number;

  capacityUsed: number;
  capacityMax: number;

  originCode: string;
  destinationCode: string;

  productIds: number[];
}

interface MapViewDiaADiaProps {
  resultado: ResultadoAlgoritmoDTO;
}

// ====== CONFIG ======
const MAX_FLIGHTS_RENDERED = 120;
const CURVATURE = 0.25;

function isValidCoordinate(n: number | undefined | null): n is number {
  return typeof n === "number" && !isNaN(n) && isFinite(n);
}

export function MapViewDiaADia({ resultado }: MapViewDiaADiaProps) {
  const { airports, isLoading: airportsLoading } = useAirportsForMap();

  if (!resultado?.lineaDeTiempo) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-500">
        Procesa una ventana para visualizar vuelos.
      </div>
    );
  }

  const eventosTimeline = resultado.lineaDeTiempo.eventos || [];

  // ============================
  // Convertir backend → AnimatedFlightMarker format
  // ============================
  const flightsForRender: DiaADiaFlight[] = useMemo(() => {
    // Agrupar eventos por idVuelo para emparejar DEPARTURE y ARRIVAL
    type Evento = {
      idEvento?: string;
      tipoEvento?: string;
      horaEvento?: string;
      idVuelo?: number;
      codigoVuelo?: string;
      ciudadOrigen?: string;
      ciudadDestino?: string;
      capacidadMaxima?: number;
      cantidadProductos?: number;
      idProducto?: number;
      idPedido?: number;
    };

    const departures: Record<number, Evento> = {};
    const arrivals: Record<number, Evento> = {};

    (eventosTimeline as Evento[]).forEach((ev) => {
      if (!ev || !ev.idVuelo) return;
      if (ev.tipoEvento === 'DEPARTURE') departures[ev.idVuelo] = ev;
      if (ev.tipoEvento === 'ARRIVAL') arrivals[ev.idVuelo] = ev;
    });

    // Tiempo 'ahora' será el punto medio de la ventana (producción estática)
    const startMs = new Date(resultado.lineaDeTiempo!.horaInicioSimulacion).getTime();
    const endMs = new Date(resultado.lineaDeTiempo!.horaFinSimulacion).getTime();
    const nowMs = startMs + Math.floor((endMs - startMs) / 2);

    const flights: (DiaADiaFlight | null)[] = Object.keys(departures).map((k) => {
      const id = Number(k);
      const d = departures[id];
      const a = arrivals[id];

      if (!d || !a) return null;

      const originCode = d.ciudadOrigen || '';
      const destCode = d.ciudadDestino || '';

      const origin = airports.find(a => a.codigoIATA === originCode);
      const dest = airports.find(a => a.codigoIATA === destCode);

      if (!origin || !dest) return null;

      const depMs = new Date(d.horaEvento || '').getTime();
      const arrMs = new Date(a.horaEvento || '').getTime();

      let progress = 0;
      if (!isNaN(depMs) && !isNaN(arrMs) && arrMs > depMs) {
        progress = (nowMs - depMs) / (arrMs - depMs);
        progress = Math.max(0, Math.min(1, progress));
      }

      return {
        eventId: `flight-${id}`,
        flightCode: d.codigoVuelo || `FLT-${id}`,

        originLat: origin.latitud,
        originLon: origin.longitud,

        destLat: dest.latitud,
        destLon: dest.longitud,

        currentProgress: progress,

        capacityUsed: d.cantidadProductos ?? (d.idProducto ? 1 : 0),
        capacityMax: d.capacidadMaxima ?? 300,

        originCode,
        destinationCode: destCode,

        productIds: d.idProducto ? [d.idProducto] as number[] : [],
      };
    });

    return flights.filter((f): f is DiaADiaFlight => f !== null);
  }, [eventosTimeline, airports, resultado.lineaDeTiempo]);

  // ============================
  // Culling de vuelos (performance)
  // ============================
  const culledFlights = useMemo(() => {
    if (flightsForRender.length <= MAX_FLIGHTS_RENDERED) return flightsForRender;

    return [...flightsForRender]
      .sort((a, b) => b.currentProgress - a.currentProgress)
      .slice(0, MAX_FLIGHTS_RENDERED);
  }, [flightsForRender]);

  if (airportsLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        Cargando aeropuertos...
      </div>
    );
  }

  return (
    <div className="h-full w-full relative bg-gray-50">

      {/* MAPA (solo mapa, sin controles ni paneles) */}
      <MapCanvas className="h-full w-full">

        {/* AEROPUERTOS */}
        {airports
          .filter(a => isValidCoordinate(a.latitud) && isValidCoordinate(a.longitud))
          .map(a => (
            <AirportMarker key={a.id} airport={a} />
          ))
        }

        {/* RUTAS */}
        <RoutesLayer
          flights={culledFlights as unknown as ActiveFlightState[]}
          airports={airports}
          canvasRenderer={L.canvas()}
          curvature={CURVATURE}
        />

        {/* AVIONES ANIMADOS (se muestran según progreso recibido; sin controles de reproducción) */}
        {culledFlights.map(f => (
          <AnimatedFlightMarker
            key={f.eventId}
            flight={f as unknown as ActiveFlightState}
            curvature={CURVATURE}
          />
        ))}
      </MapCanvas>

    </div>
  );
}

