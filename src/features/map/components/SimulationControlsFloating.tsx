/**
 * SimulationControlsFloating
 * 
 * Controles flotantes para la reproducción de la simulación temporal.
 * - Play/Pause/Reset
 * - Selector de velocidad (seconds/minutes/hours/days)
 * - Barra de progreso
 * - Estadísticas en tiempo real
 * 
 * Basado en morapack-frontend pero adaptado a nuestro diseño.
 */

import type { TimeUnit } from '../hooks/useTemporalSimulation';

interface SimulationControlsFloatingProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  
  // Progress
  progressPercent: number;
  currentSimTime: number;
  formatSimulationTime: (seconds: number) => string;
  
  // Stats
  flightStats: {
    completed: number;
    inFlight: number;
    pending: number;
  };
  completedOrdersCount: number;
  totalOrdersCount: number;
  
  // Velocidad
  timeUnit: TimeUnit;
  onTimeUnitChange: (unit: TimeUnit) => void;
}

export function SimulationControlsFloating({
  isPlaying,
  onPlay,
  onPause,
  onReset,
  progressPercent,
  currentSimTime,
  formatSimulationTime,
  flightStats,
  completedOrdersCount,
  totalOrdersCount,
  timeUnit,
  onTimeUnitChange,
}: SimulationControlsFloatingProps) {
  return (
    <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-3 min-w-[260px]">
      {/* Botones Play/Pause/Reset */}
      <div className="flex gap-2 mb-3">
        {!isPlaying ? (
          <button
            onClick={onPlay}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Reproducir
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
            </svg>
            Pausar
          </button>
        )}
        
        <button
          onClick={onReset}
          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm"
          title="Reiniciar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* Barra de progreso */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-teal-500 to-green-500 transition-all duration-100"
          style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>
      
      {/* Selector de velocidad */}
      <div className="mb-3">
        <div className="text-xs text-gray-600 mb-1.5 font-medium">
          Velocidad: 1 segundo real =
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { unit: 'seconds' as TimeUnit, label: '1 seg' },
            { unit: 'minutes' as TimeUnit, label: '1 min' },
            { unit: 'hours' as TimeUnit, label: '1 hora' },
            { unit: 'days' as TimeUnit, label: '1 día' },
          ].map(({ unit, label }) => (
            <button
              key={unit}
              onClick={() => onTimeUnitChange(unit)}
              className={`px-2 py-1.5 text-xs font-bold rounded transition-all ${
                timeUnit === unit
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Estadísticas */}
      <div className="text-xs space-y-1.5 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Tiempo:</span>
          <span className="font-mono font-bold text-teal-700">
            {formatSimulationTime(currentSimTime)}
          </span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Vuelos activos:</span>
          <span className="font-semibold text-blue-700">
            {flightStats.inFlight}
          </span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Pedidos entregados:</span>
          <span className="font-semibold text-green-700">
            {completedOrdersCount}/{totalOrdersCount}
          </span>
        </div>
      </div>
    </div>
  );
}

