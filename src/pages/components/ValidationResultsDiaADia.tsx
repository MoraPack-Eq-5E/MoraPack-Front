/**
 * ValidationResultsDiaADia
 *
 * Componente para mostrar los resultados de la carga de archivos de pedidos
 * en modo día a día.
 */

import type { ImportResult } from '@/services/dataImport.service';

interface ValidationResultsDiaADiaProps {
  pedidosResult: ImportResult | null;
  pedidosError: string | null;
}

export function ValidationResultsDiaADia({
  pedidosResult,
  pedidosError,
}: ValidationResultsDiaADiaProps) {
  const hasResults = pedidosResult || pedidosError;

  if (!hasResults) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Resultados de pedidos */}
      {pedidosResult && (
        <div
          className={`border rounded-lg p-4 ${
            pedidosResult.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {pedidosResult.success ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <h3
                className={`font-semibold mb-1 ${
                  pedidosResult.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                📦 Pedidos
              </h3>

              <p
                className={`text-sm ${
                  pedidosResult.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {pedidosResult.message}
              </p>

              {pedidosResult.success && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  {pedidosResult.orders !== undefined && (
                    <div>
                      <p className="text-xs text-green-600">Total cargados</p>
                      <p className="text-2xl font-bold text-green-900">
                        {pedidosResult.orders}
                      </p>
                    </div>
                  )}
                  {pedidosResult.count !== undefined && (
                    <div>
                      <p className="text-xs text-green-600">Archivos procesados</p>
                      <p className="text-2xl font-bold text-green-900">
                        {pedidosResult.count}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!pedidosResult.success && pedidosResult.error && (
                <div className="mt-2 text-xs text-red-600 bg-red-100 rounded p-2">
                  {pedidosResult.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error de pedidos */}
      {pedidosError && !pedidosResult && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">
                📦 Error en pedidos
              </h3>
              <p className="text-sm text-red-700">{pedidosError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

