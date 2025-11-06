/**
 * SimulationControls - ACTUALIZADO
 * 
 * Controles para el SimulationPlayer local
 * Ya NO controla simulación en el backend
 */

import type { SimulationPlayer } from '@/services/simulation.service';

interface SimulationControlsProps {
  player: SimulationPlayer;
  isPlaying: boolean;
  currentSpeed: number;
  progress: number;
}

export function SimulationControls({
  player,
  isPlaying,
  currentSpeed,
  progress,
}: SimulationControlsProps) {
  const handlePlay = () => player.play();
  const handlePause = () => player.pause();
  const handleStop = () => player.stop();
  const handleSpeedChange = (speed: number) => player.setSpeed(speed);

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 min-w-[400px]">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              title="Reproducir"
            >
              ▶
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm font-medium"
              title="Pausar"
            >
              ⏸
            </button>
          )}
          
          <button
            onClick={handleStop}
            className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            title="Detener"
          >
            ⏹
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Velocidad:</label>
          <select
            value={currentSpeed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
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
      <div className="w-full">
        <div className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
             onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const percentage = (x / rect.width) * 100;
               player.seekToProgress(percentage);
             }}
        >
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{progress.toFixed(1)}%</span>
          <span className="text-xs text-gray-500">{currentSpeed}x</span>
        </div>
      </div>
    </div>
  );
}
