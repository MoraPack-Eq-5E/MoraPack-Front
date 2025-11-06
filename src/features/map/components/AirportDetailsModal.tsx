import type { Aeropuerto } from '@/types/map.types';

interface AirportDetailsModalProps {
  airport: Aeropuerto | null;
  onClose: () => void;
}

export function AirportDetailsModal({ airport, onClose }: AirportDetailsModalProps) {
  if (!airport) return null;

  const capacidadUsada = airport.cantActual || 0;
  const capacidadMaxima = airport.capMaxAlmacen || 1000;
  const capacidadDisponible = capacidadMaxima - capacidadUsada;
  const porcentajeDisponible = capacidadMaxima > 0 
    ? ((capacidadDisponible / capacidadMaxima) * 100).toFixed(1)
    : '100.0';

  // Determinar prioridad basada en capacidad disponible
  const prioridad = parseFloat(porcentajeDisponible) < 20 
    ? 'Alta' 
    : parseFloat(porcentajeDisponible) < 50 
    ? 'Media' 
    : 'Baja';

  // Determinar estado basado en capacidad
  const estado = parseFloat(porcentajeDisponible) < 1
    ? 'CERRADO'
    : parseFloat(porcentajeDisponible) < 10
    ? 'RESTRINGIDO'
    : 'DISPONIBLE';

  const estadoColor = estado === 'CERRADO' 
    ? 'bg-red-100 text-red-800 border-red-200'
    : estado === 'RESTRINGIDO'
    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
    : 'bg-green-100 text-green-800 border-green-200';

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-[90%] max-w-[550px] max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 pr-8">
            Detalles del Aeropuerto
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
        <div className="px-6 py-5 space-y-5">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                ID
              </label>
              <input
                type="text"
                value={`AE${airport.id}`}
                readOnly
                className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Capacidad Ocupada
              </label>
              <input
                type="text"
                value={`${capacidadUsada} / ${capacidadMaxima}`}
                readOnly
                className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
              />
            </div>
          </div>

          {/* Propietario y Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Propietario
              </label>
              <input
                type="text"
                value="MoraPack International"
                readOnly
                className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Prioridad
              </label>
              <input
                type="text"
                value={prioridad}
                readOnly
                className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
              />
            </div>
          </div>

          {/* Ciudad y Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                País
              </label>
              <input
                type="text"
                value={airport.pais || 'N/A'}
                readOnly
                className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Estado
              </label>
              <input
                type="text"
                value={estado}
                readOnly
                className="w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
              />
            </div>
          </div>

          {/* Código IATA */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Código IATA
            </label>
            <input
              type="text"
              value={airport.codigoIATA}
              readOnly
              className="w-full px-3 py-2.5 text-sm font-mono font-semibold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
            />
          </div>

          {/* Estado Badge */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Estado de Capacidad
            </label>
            <div 
              className={`inline-flex items-center px-4 py-2 rounded-lg border font-semibold text-sm ${estadoColor}`}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${
                estado === 'DISPONIBLE' ? 'bg-green-600' :
                estado === 'RESTRINGIDO' ? 'bg-yellow-600' :
                'bg-red-600'
              }`}></div>
              {estado}
            </div>
          </div>

          {/* Coordenadas */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Coordenadas
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Latitud</label>
                <input
                  type="text"
                  value={airport.latitud}
                  readOnly
                  className="w-full px-3 py-2 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Longitud</label>
                <input
                  type="text"
                  value={airport.longitud}
                  readOnly
                  className="w-full px-3 py-2 text-sm font-mono text-gray-700 bg-gray-50 border border-gray-300 rounded-lg cursor-default"
                />
              </div>
            </div>
          </div>


          {/* Visualización de capacidad */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Capacidad Disponible
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {porcentajeDisponible}%
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  parseFloat(porcentajeDisponible) < 20 ? 'bg-red-500' :
                  parseFloat(porcentajeDisponible) < 50 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${porcentajeDisponible}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              {capacidadDisponible.toLocaleString()} unidades disponibles de {capacidadMaxima.toLocaleString()}
            </div>
          </div>

          {/* Descripción (opcional) */}
          {airport.pais && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Descripción
              </label>
              <textarea
                value={`Aeropuerto en ${airport.pais}. Código IATA: ${airport.codigoIATA}. Capacidad máxima de almacenamiento: ${capacidadMaxima} unidades. Actualmente con ${capacidadUsada} unidades en almacén.`}
                readOnly
                className="w-full min-h-[80px] px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg resize-vertical cursor-default"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
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

