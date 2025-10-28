/**
 * LoadingOverlay - Indicador de carga para la visualización del mapa
 */

interface LoadingOverlayProps {
  status: 'initializing' | 'loading-visualization' | 'loading-flights' | 'ready' | 'error';
  message?: string;
}

export function LoadingOverlay({ status, message }: LoadingOverlayProps) {
  const getStatusText = () => {
    switch (status) {
      case 'initializing':
        return 'Inicializando...';
      case 'loading-visualization':
        return 'Cargando visualización en memoria...';
      case 'loading-flights':
        return 'Obteniendo datos de vuelos...';
      case 'ready':
        return 'Listo';
      case 'error':
        return 'Error al cargar';
      default:
        return 'Cargando...';
    }
  };

  const getProgressPercentage = () => {
    switch (status) {
      case 'initializing':
        return 25;
      case 'loading-visualization':
        return 50;
      case 'loading-flights':
        return 75;
      case 'ready':
        return 100;
      case 'error':
        return 0;
      default:
        return 0;
    }
  };

  if (status === 'ready') {
    return null;
  }

  const isError = status === 'error';

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in border border-gray-300 pointer-events-auto">
        {/* Icono de avión animado o error */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {isError ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            ) : (
              <>
                <svg
                  className="w-16 h-16 text-blue-600 animate-bounce"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M2 14l8-2 3-8 2 2-2 6 7 3-1 2-7-1-4 5h-2l2-6-6-1z" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Título */}
        <h3 className="text-xl font-semibold text-center text-gray-800 mb-2">
          {getStatusText()}
        </h3>

        {/* Mensaje personalizado */}
        {message && (
          <p className="text-sm text-center text-gray-600 mb-4">{message}</p>
        )}

        {/* Barra de progreso o mensaje de error */}
        {!isError ? (
          <>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Texto de progreso */}
            <div className="text-center text-sm text-gray-500">
              {getProgressPercentage()}% completado
            </div>
          </>
        ) : (
          <div className="text-center text-sm text-red-600 mb-4">
            Ocurrió un error al cargar la visualización
          </div>
        )}

        {/* Detalles del proceso */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center text-sm">
            <div
              className={`w-2 h-2 rounded-full mr-3 ${
                ['initializing', 'loading-visualization', 'loading-flights', 'ready'].includes(
                  status
                )
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
            <span
              className={
                ['initializing', 'loading-visualization', 'loading-flights', 'ready'].includes(
                  status
                )
                  ? 'text-gray-700'
                  : 'text-gray-400'
              }
            >
              Conectando al servidor
            </span>
          </div>

          <div className="flex items-center text-sm">
            <div
              className={`w-2 h-2 rounded-full mr-3 ${
                ['loading-visualization', 'loading-flights', 'ready'].includes(status)
                  ? 'bg-green-500'
                  : status === 'loading-visualization'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-300'
              }`}
            />
            <span
              className={
                ['loading-visualization', 'loading-flights', 'ready'].includes(status)
                  ? 'text-gray-700'
                  : 'text-gray-400'
              }
            >
              Cargando datos de simulación
            </span>
          </div>

          <div className="flex items-center text-sm">
            <div
              className={`w-2 h-2 rounded-full mr-3 ${
                ['loading-flights', 'ready'].includes(status)
                  ? 'bg-green-500'
                  : status === 'loading-flights'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-300'
              }`}
            />
            <span
              className={
                ['loading-flights', 'ready'].includes(status) ? 'text-gray-700' : 'text-gray-400'
              }
            >
              Preparando visualización
            </span>
          </div>
        </div>

        {/* Nota informativa */}
        <div
          className={`mt-6 p-3 rounded-lg border ${
            isError
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          <p
            className={`text-xs text-center ${
              isError ? 'text-red-800' : 'text-blue-800'
            }`}
          >
            {isError
              ? '❌ Verifica que la simulación ALNS haya completado correctamente. Intenta recargar la página.'
              : '💡 Este proceso puede tomar unos segundos mientras se cargan los datos del servidor'}
          </p>
        </div>
      </div>
    </div>
  );
}

