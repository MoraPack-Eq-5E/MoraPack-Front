/**
 * MapView Component - ACTUALIZADO Y SIMPLIFICADO
 * 
 * Visualización usando SimulationPlayer LOCAL
 * Reproduce la línea de tiempo generada por el algoritmo
 */

import { useState, useEffect } from 'react';
import { useAirportsForMap } from '@/features/map/hooks';
import type { SimulationPlayer, ResultadoAlgoritmoDTO } from '@/services/simulation.service';

interface MapViewProps {
  player: SimulationPlayer;
  resultado: ResultadoAlgoritmoDTO;
}

export function MapView({ player, resultado }: MapViewProps) {
  const { airports, isLoading: airportsLoading } = useAirportsForMap();
  const [simulationState, setSimulationState] = useState(player.getState());

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
      <div className="h-full w-full bg-blue-50">
        {/* TODO: Renderizar mapa real con MapCanvas cuando se integre */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="text-gray-500 mb-4">Vista del mapa (Placeholder)</p>
          <p className="text-sm text-gray-400">
            {airports.length} aeropuertos cargados
          </p>
        </div>
      </div>

      {/* Panel de información */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-semibold text-gray-900 mb-2">Estado de la Simulación</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Progreso:</span> {simulationState.progress.toFixed(1)}%</p>
          <p><span className="font-medium">Vuelos activos:</span> {simulationState.activeFlights.length}</p>
          <p><span className="font-medium">Eventos completados:</span> {simulationState.completedEvents.length}</p>
          <p><span className="font-medium">Velocidad:</span> {simulationState.speedMultiplier}x</p>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-2">Resultado del algoritmo:</p>
          <p className="text-sm"><span className="font-medium">Productos:</span> {resultado.totalProductos}</p>
          <p className="text-sm"><span className="font-medium">Costo total:</span> ${resultado.costoTotal?.toFixed(2) || 0}</p>
        </div>
      </div>

      {/* Controles de reproducción */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4">
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
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="5">5x</option>
              <option value="10">10x</option>
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
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
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
