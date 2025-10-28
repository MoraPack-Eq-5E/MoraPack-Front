/**
 * AirportCard
 * 
 * Tarjeta individual que muestra información de un aeropuerto
 * con toggle para activar/desactivar (conectado al backend)
 */

import { useState } from 'react';
import type { Airport } from '@/types';
import { AirportStateBadge } from './AirportStateBadge';
import { OccupancyBar } from './OccupancyBar';
import { ConfirmToggleModal } from './ConfirmToggleModal';
import { toggleAirportStatus } from '../services/airports.service';

export interface AirportCardProps {
  airport: Airport;
  onStatusChange?: (updatedAirport: Airport) => void;
}

export function AirportCard({ airport, onStatusChange }: AirportCardProps) {
  // Estado local sincronizado con el backend
  const [currentAirport, setCurrentAirport] = useState(airport);
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Calcular porcentaje de ocupación
  const porcentajeOcupacion = currentAirport.capacidadMaxima > 0
    ? Math.round((currentAirport.capacidadActual / currentAirport.capacidadMaxima) * 100)
    : 0;

  const isActive = currentAirport.estado === 'DISPONIBLE';

  const handleToggleClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmToggle = async () => {
    setShowConfirmModal(false);
    setIsToggling(true);
    
    try {
      const updated = await toggleAirportStatus(currentAirport.id);
      
      // Actualizar estado local
      setCurrentAirport(updated);
      
      // Notificar al padre si existe callback
      onStatusChange?.(updated);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al cambiar el estado del aeropuerto:\n${errorMessage}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col">
      {/* Header: Código + Ciudad + Toggle */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {currentAirport.codigoIATA} - {currentAirport.ciudad.nombre}
          </h3>
        </div>
        
        {/* Toggle Switch */}
        <button
          onClick={handleToggleClick}
          disabled={isToggling}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isActive ? 'bg-blue-600' : 'bg-gray-300'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          role="switch"
          aria-checked={isActive}
          aria-label={`${isActive ? 'Desactivar' : 'Activar'} aeropuerto`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* País */}
      <p className="text-sm text-gray-600 mb-4">{currentAirport.ciudad.pais}</p>

      {/* Ocupación */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Ocupación Actual:</span>
          <span className="font-bold text-gray-900">
            {porcentajeOcupacion}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{currentAirport.capacidadActual}/{currentAirport.capacidadMaxima}</span>
        </div>
        <OccupancyBar porcentaje={porcentajeOcupacion} />
      </div>

      {/* Estado */}
      <div className="pt-4 mt-auto border-t border-gray-100">
        <AirportStateBadge estado={currentAirport.estado} />
      </div>

      {/* Modal de confirmación */}
      <ConfirmToggleModal
        isOpen={showConfirmModal}
        airportCode={currentAirport.codigoIATA}
        currentState={isActive ? 'Activo' : 'Inactivo'}
        newState={isActive ? 'Inactivo' : 'Activo'}
        onConfirm={handleConfirmToggle}
        onCancel={() => setShowConfirmModal(false)}
        hasActiveSimulation={false} // TODO: Implementar detección de simulación activa
      />
    </div>
  );
}

