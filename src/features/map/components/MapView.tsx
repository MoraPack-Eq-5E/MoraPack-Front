/**
 * MapView Component
 * 
 * MEJORAS:
 * - Canvas Renderer para mejor performance
 * - RoutesLayer con viewport culling
 * - Limitación de vuelos renderizados (MAX_FLIGHTS_RENDERED)
 * - Curvas Bezier realistas
 * - Throttling de actualizaciones
 */

import React, { useState, useEffect, useMemo } from 'react';
import L from 'leaflet';
import { useAirportsForMap } from '@/features/map/hooks';
import type { SimulationPlayer } from '@/services/simulation-player.service';
import type { ResultadoAlgoritmoDTO } from '@/services/algoritmo.service';
import type { AlgoritmoResponse } from '@/services/algoritmoSemanal.service';
import { MapCanvas } from './MapCanvas';
import { AirportMarker } from './AirportMarker';
import { AnimatedFlightMarker } from './AnimatedFlightMarker';
import { RoutesLayer } from './RoutesLayer';

interface MapViewProps {
  player: SimulationPlayer;
  resultado: ResultadoAlgoritmoDTO | AlgoritmoResponse;
}

// Constantes de optimización
const MAX_FLIGHTS_RENDERED = 120; // Límite de vuelos simultáneos
const CURVATURE = 0.25; // Factor de curvatura para las rutas

/**
 * Valida que una coordenada sea un número válido
 */
function isValidCoordinate(coord: number | undefined | null): coord is number {
  return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

export function MapView({ player, resultado }: MapViewProps) {
  const { airports, isLoading: airportsLoading } = useAirportsForMap();
  const [simulationState, setSimulationState] = useState(player.getState());

  // Canvas Renderer para mejor performance con muchas polylines
  const canvasRenderer = useMemo(() => L.canvas(), []);

  // Validar aeropuertos y reportar los que tengan problemas
  React.useEffect(() => {
    const invalidAirports = airports.filter(
      airport => !isValidCoordinate(airport.latitud) || !isValidCoordinate(airport.longitud)
    );
    
    if (invalidAirports.length > 0) {
      console.warn(`⚠️ Se encontraron ${invalidAirports.length} aeropuertos con coordenadas inválidas:`, 
        invalidAirports.map(a => ({
          codigoIATA: a.codigoIATA,
          latitud: a.latitud,
          longitud: a.longitud,
        }))
      );
    }
  }, [airports]);

  // Suscribirse a cambios del player
  useEffect(() => {
    console.log('📡 Suscribiendo al player...');
    const unsubscribe = player.subscribe((newState) => {
      console.log('📊 Estado actualizado:', {
        isPlaying: newState.isPlaying,
        progress: newState.progress.toFixed(1),
        eventos: newState.completedEvents.length,
        vuelos: newState.activeFlights.length
      });
      setSimulationState(newState);
    });
    
    return () => {
      console.log('📴 Desuscribiendo del player');
      unsubscribe();
    };
  }, [player]);

  // Limitar número de vuelos renderizados para mejor performance
  // Priorizar vuelos con más progreso (más visibles)
  const culledFlights = useMemo(() => {
    const flights = simulationState.activeFlights;
    
    if (flights.length <= MAX_FLIGHTS_RENDERED) {
      return flights;
    }
    
    // Ordenar por progreso descendente y tomar los primeros MAX_FLIGHTS_RENDERED
    return [...flights]
      .sort((a, b) => b.currentProgress - a.currentProgress)
      .slice(0, MAX_FLIGHTS_RENDERED);
  }, [simulationState.activeFlights]);

  // Controles del player
  const handlePlay = () => {
    console.log('🎮 Botón PLAY presionado');
    player.play();
  };

  const handlePause = () => {
    console.log('🎮 Botón PAUSE presionado');
    player.pause();
  };

  const handleStop = () => {
    console.log('🎮 Botón STOP presionado');
    player.stop();
  };

  const handleSpeedChange = (speed: number) => {
    player.setSpeed(speed);
  };

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
    <div className="h-full w-full relative bg-gray-50">
      {/* Mapa */}
      <MapCanvas className="h-full w-full">
        {/* Renderizar todos los aeropuertos (solo los que tengan coordenadas válidas) */}
        {airports
          .filter(airport => 
            isValidCoordinate(airport.latitud) && 
            isValidCoordinate(airport.longitud)
          )
          .map((airport) => (
            <AirportMarker 
              key={airport.id} 
              airport={airport}
            />
          ))}
        
        {/* Rutas de vuelo optimizadas con viewport culling */}
        {culledFlights.length > 0 && (
          <RoutesLayer 
            flights={culledFlights}
            airports={airports}
            canvasRenderer={canvasRenderer}
            curvature={CURVATURE}
          />
        )}
        
        {/* Marcadores de aviones animados */}
        {culledFlights.map((flight) => {
          // Validar coordenadas antes de renderizar
          if (!isValidCoordinate(flight.originLat) || 
              !isValidCoordinate(flight.originLon) || 
              !isValidCoordinate(flight.destLat) || 
              !isValidCoordinate(flight.destLon)) {
            return null;
          }
          
          return (
            <AnimatedFlightMarker 
              key={flight.eventId} 
              flight={flight}
              curvature={CURVATURE}
            />
          );
        })}
      </MapCanvas>

      {/* Panel de información */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-[1000]">
        <h3 className="font-semibold text-gray-900 mb-2">Estado de la Simulación</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Progreso:</span> {simulationState.progress.toFixed(1)}%</p>
          <p><span className="font-medium">Vuelos activos:</span> {simulationState.activeFlights.length}</p>
          <p><span className="font-medium">Vuelos renderizados:</span> {culledFlights.length}</p>
          <p><span className="font-medium">Eventos completados:</span> {simulationState.completedEvents.length}</p>
          <p><span className="font-medium">Velocidad:</span> {simulationState.speedMultiplier}x</p>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-2">Resultado del algoritmo:</p>
          <p className="text-sm"><span className="font-medium">Productos:</span> {resultado.totalProductos}</p>
          <p className="text-sm"><span className="font-medium">Costo total:</span> ${resultado.costoTotal?.toFixed(2) || 0}</p>
        </div>
        
        {simulationState.activeFlights.length > MAX_FLIGHTS_RENDERED && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ Mostrando {MAX_FLIGHTS_RENDERED} de {simulationState.activeFlights.length} vuelos para mejor performance
          </div>
        )}
      </div>

      {/* Controles de reproducción */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <div className="flex items-center gap-4">
          {!simulationState.isPlaying ? (
            <button
              onClick={handlePlay}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              ▶ Play
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
            >
              ⏸ Pause
            </button>
          )}
          
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            ⏹ Stop
          </button>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Velocidad:</label>
            <select
              value={simulationState.speedMultiplier}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="10">10x</option>
              <option value="50">50x</option>
              <option value="100">100x</option>
              <option value="200">200x</option>
              <option value="500">500x ⚡</option>
              <option value="1000">1000x 🚀</option>
              <option value="5000">5000x 💨</option>
              <option value="10000">10000x ⚡⚡⚡</option>
            </select>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${simulationState.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de eventos recientes */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto z-[1000]">
        <h3 className="font-semibold text-gray-900 mb-2">Eventos Recientes</h3>
        <div className="space-y-2">
          {simulationState.completedEvents.slice(-10).reverse().map((evento, idx) => (
            <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
              <p className="font-medium">{evento.codigoVuelo}</p>
              <p className="text-gray-600">{evento.ciudadOrigen} → {evento.ciudadDestino}</p>
              <p className="text-gray-500">{evento.tipoEvento}</p>
            </div>
          ))}
          {simulationState.completedEvents.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay eventos aún. Presiona Play para iniciar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
