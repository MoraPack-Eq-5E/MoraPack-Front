/**
 * SimulationCompleteModal - Modal que aparece cuando la simulación termina
 * 
 * Muestra un resumen de la simulación completada con métricas finales
 */

import type { SimulationStatusResponse } from '@/types/simulation.types';

interface SimulationCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationData: SimulationStatusResponse;
}

export function SimulationCompleteModal({ 
  isOpen, 
  onClose, 
  simulationData 
}: SimulationCompleteModalProps) {
  if (!isOpen) return null;

  const { metrics, currentSimulatedTime, progressPercentage } = simulationData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">¡Simulación Completada!</h2>
                <p className="text-green-100 text-sm">
                  La simulación ha terminado exitosamente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-green-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Tiempo simulado final */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Tiempo simulado final</p>
              <p className="text-2xl font-bold text-gray-800">
                {new Date(currentSimulatedTime).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Progreso: {Math.round(progressPercentage)}%
              </p>
            </div>
          </div>

          {/* Métricas principales */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.totalFlights}
              </div>
              <div className="text-sm text-blue-800">Vuelos totales</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {metrics.flightsCompleted}
              </div>
              <div className="text-sm text-green-800">Vuelos completados</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.totalOrders}
              </div>
              <div className="text-sm text-purple-800">Pedidos totales</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {metrics.ordersDelivered}
              </div>
              <div className="text-sm text-orange-800">Pedidos entregados</div>
            </div>
          </div>

          {/* Métricas de rendimiento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Rendimiento de la Simulación
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-700">Cumplimiento SLA</span>
                <span className="font-semibold text-gray-800">
                  {Math.round(metrics.slaCompliancePercentage)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-700">Ocupación promedio almacenes</span>
                <span className="font-semibold text-gray-800">
                  {Math.round(metrics.averageWarehouseOccupancy)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-700">Pedidos en tránsito</span>
                <span className="font-semibold text-gray-800">
                  {metrics.ordersInTransit}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-700">Pedidos en espera</span>
                <span className="font-semibold text-gray-800">
                  {metrics.ordersWaiting}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={() => {
              // TODO: Implementar descarga de reporte
              console.log('Descargar reporte de simulación');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Descargar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
