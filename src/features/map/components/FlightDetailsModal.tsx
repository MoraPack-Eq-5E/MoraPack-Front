import type { ActiveFlightState } from '@/services/simulation-player.service';
import type { Aeropuerto } from '@/types/map.types';

interface FlightDetailsModalProps {
  flight: ActiveFlightState | null;
  origin: Aeropuerto | null;
  destination: Aeropuerto | null;
  onClose: () => void;
}

export function FlightDetailsModal({
  flight,
  origin,
  destination,
  onClose,
}: FlightDetailsModalProps) {
  if (!flight || !origin || !destination) return null;

  const progressPercent = Math.round(flight.currentProgress * 100);
  const capacityPercent = (flight.capacityMax && flight.capacityMax > 0)
    ? Math.round(((flight.capacityUsed || 0) / flight.capacityMax) * 100)
    : 0;

  // Calcular tiempo estimado restante
  const totalDuration = flight.arrivalTime.getTime() - flight.departureTime.getTime();
  const elapsedTime = totalDuration * flight.currentProgress;
  const remainingTime = totalDuration - elapsedTime;
  const remainingMinutes = Math.round(remainingTime / 1000 / 60);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-[90%] max-w-[500px] shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 pr-8">
            Detalles del Vuelo
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Código del vuelo */}
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Código de Vuelo</div>
            <div className="text-2xl font-bold text-gray-900 font-mono">
              {flight.flightCode}
            </div>
          </div>

          {/* Ruta */}
          <div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Ruta
            </div>
            <div className="space-y-2">
              {/* Origen */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-blue-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{origin.codigoIATA}</div>
                  <div className="text-sm text-gray-600">{origin.pais || 'N/A'}</div>
                </div>
              </div>

              {/* Línea conectora */}
              <div className="flex items-center gap-3 pl-2">
                <div className="w-0.5 h-8 bg-gray-300"></div>
                <div className="text-sm text-gray-500">
                  {Math.round((flight.arrivalTime.getTime() - flight.departureTime.getTime()) / 1000 / 60 / 60 * 10) / 10} horas
                </div>
              </div>

              {/* Destino */}
              <div className="flex items-start gap-3">
                <div className="mt-1 text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{destination.codigoIATA}</div>
                  <div className="text-sm text-gray-600">{destination.pais || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Horarios */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Hora de Salida</div>
              <div className="text-lg font-semibold text-gray-900">
                {flight.departureTime.toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Hora de Llegada</div>
              <div className="text-lg font-semibold text-gray-900">
                {flight.arrivalTime.toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>

          {/* Capacidad */}
          <div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Capacidad
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700">
                {flight.capacityUsed} / {flight.capacityMax} unidades
              </span>
              <span className="font-semibold text-gray-900">{capacityPercent}%</span>
            </div>
            {/* Barra de progreso de capacidad */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  capacityPercent >= 90 ? 'bg-red-500' :
                  capacityPercent >= 70 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>

          {/* Progreso del vuelo */}
          <div>
            <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Progreso del Vuelo
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700">
                {remainingMinutes > 0 
                  ? `${remainingMinutes} min restantes` 
                  : 'Llegando...'}
              </span>
              <span className="font-semibold text-blue-600">{progressPercent}%</span>
            </div>
            {/* Barra de progreso del vuelo */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            {flight.cost !== undefined && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Costo</div>
                <div className="text-base font-semibold text-gray-900">
                  ${flight.cost.toFixed(2)}
                </div>
              </div>
            )}
            {flight.productIds && flight.productIds.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Cantidad de Productos</div>
                <div className="text-base font-semibold text-gray-900">
                  {flight.productIds.length}
                </div>
              </div>
            )}
          </div>

          {/* Estado */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              En Vuelo
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            transform: translateY(20px); 
            opacity: 0;
          }
          to { 
            transform: translateY(0); 
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-in;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

