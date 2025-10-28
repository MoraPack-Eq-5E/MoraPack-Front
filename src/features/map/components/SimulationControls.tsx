/**
 * SimulationControls
 * 
 * Controles para pausar, reanudar, detener y ajustar velocidad de simulación
 * 
 * Características:
 * - Botones con estados visuales claros
 * - Validación de acciones según estado actual
 * - Feedback visual al usuario
 * - Manejo robusto de errores
 */

import { useState } from 'react';
import { controlSimulation } from '@/services/simulation.service';
import type { SimulationControlAction } from '@/types/simulation.types';

interface SimulationControlsProps {
  simulationId: number;
  currentStatus: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED';
  currentSpeed: number;
  onStatusChange?: () => void;
}

const SPEED_PRESETS = [
  { value: 1, label: '1x' },
  { value: 56, label: '56x' },
  { value: 112, label: '112x' },
  { value: 224, label: '224x' },
];

export function SimulationControls({
  simulationId,
  currentStatus,
  currentSpeed,
  onStatusChange,
}: SimulationControlsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [customSpeed, setCustomSpeed] = useState<string>('');

  // Determinar qué botones están habilitados
  const canPause = currentStatus === 'RUNNING' && !isProcessing;
  const canResume = currentStatus === 'PAUSED' && !isProcessing;
  const canStop = (currentStatus === 'RUNNING' || currentStatus === 'PAUSED') && !isProcessing;
  const canChangeSpeed = (currentStatus === 'RUNNING' || currentStatus === 'PAUSED') && !isProcessing;
  const isCompleted = currentStatus === 'COMPLETED';

  const handleControl = async (action: SimulationControlAction, newSpeed?: number) => {
    setError(null);
    setIsProcessing(true);

    try {
      await controlSimulation(simulationId, {
        action,
        newSpeed,
      });

      // Notificar cambio de estado
      onStatusChange?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al controlar simulación';
      setError(errorMessage);
      console.error('Error al controlar simulación:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomSpeedSubmit = () => {
    const speed = parseInt(customSpeed, 10);
    
    if (isNaN(speed) || speed < 1) {
      setError('Ingresa una velocidad válida (mínimo 1)');
      return;
    }
    
    if (speed > 1000) {
      setError('La velocidad máxima es 1000x');
      return;
    }

    handleControl('setSpeed', speed);
    setCustomSpeed(''); // Limpiar input después de aplicar
  };

  // Si la simulación está completada, no mostrar controles
  if (isCompleted) {
    return null;
  }

  // Vista minimizada
  if (!isExpanded) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl w-full"
          title="Expandir controles"
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              currentStatus === 'RUNNING' ? 'bg-green-500 animate-pulse' :
              currentStatus === 'PAUSED' ? 'bg-yellow-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm font-semibold text-gray-700">Controles</span>
          </div>
          <svg className="w-4 h-4 text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  // Vista expandida
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <h3 className="text-sm font-semibold text-white">Controles de Simulación</h3>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            title="Minimizar controles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
        <div className="mt-2">
          <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
            currentStatus === 'RUNNING' 
              ? 'bg-green-500 text-white'
              : currentStatus === 'PAUSED'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-500 text-white'
          }`}>
            {currentStatus === 'RUNNING' ? '▶ En vivo' : currentStatus === 'PAUSED' ? '⏸ Pausada' : '⏹ Detenida'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Control Buttons - Mismo tamaño */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Play/Pause Button */}
          {currentStatus === 'PAUSED' ? (
            <button
              onClick={() => handleControl('resume')}
              disabled={!canResume}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
              title="Reanudar simulación"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Reanudar
            </button>
          ) : (
            <button
              onClick={() => handleControl('pause')}
              disabled={!canPause}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-400 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
              title="Pausar simulación"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Pausar
            </button>
          )}

          {/* Stop Button */}
          <button
            onClick={() => {
              if (confirm('¿Estás seguro de que deseas detener la simulación? Esta acción no se puede deshacer.')) {
                handleControl('stop');
              }
            }}
            disabled={!canStop}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-lg hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
            title="Detener simulación"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Detener
          </button>
        </div>

        {/* Speed Control */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Velocidad
            </label>
            <span className="text-sm font-bold text-blue-600">
              {currentSpeed}x
            </span>
          </div>
          
          {/* Input manual de velocidad */}
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min="1"
              max="1000"
              value={customSpeed}
              onChange={(e) => setCustomSpeed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomSpeedSubmit();
                }
              }}
              placeholder="Velocidad personalizada"
              disabled={!canChangeSpeed}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleCustomSpeedSubmit}
              disabled={!canChangeSpeed || !customSpeed}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              title="Aplicar velocidad personalizada"
            >
              Aplicar
            </button>
          </div>

          {/* Presets de velocidad (sin 1x) */}
          <div className="grid grid-cols-3 gap-2">
            {SPEED_PRESETS.slice(1).map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleControl('setSpeed', preset.value)}
                disabled={!canChangeSpeed}
                className={`px-3 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  currentSpeed === preset.value
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={`Establecer velocidad a ${preset.label}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 py-2 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="font-medium">Procesando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
  
