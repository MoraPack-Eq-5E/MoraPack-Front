/**
 * ConfirmToggleModal
 * 
 * Modal de confirmación para activar/desactivar aeropuertos
 */

interface ConfirmToggleModalProps {
  isOpen: boolean;
  airportCode: string;
  currentState: string;
  newState: string;
  onConfirm: () => void;
  onCancel: () => void;
  hasActiveSimulation?: boolean;
}

export function ConfirmToggleModal({
  isOpen,
  airportCode,
  currentState,
  newState,
  onConfirm,
  onCancel,
  hasActiveSimulation = false
}: ConfirmToggleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 border border-gray-300 pointer-events-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Confirmar cambio de estado
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 mb-4">
            ¿Estás seguro de que deseas cambiar el estado del aeropuerto{' '}
            <span className="font-bold">{airportCode}</span>?
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Estado actual:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  currentState === 'Activo' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {currentState}
                </span>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Nuevo estado:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  newState === 'Activo' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {newState}
                </span>
              </div>
            </div>
          </div>

          {hasActiveSimulation && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Hay una simulación activa
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Este cambio solo afectará a futuras simulaciones.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  );
}

