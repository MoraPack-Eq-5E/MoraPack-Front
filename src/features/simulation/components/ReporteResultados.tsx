/**
 * ReporteResultados - Componente para mostrar métricas de simulación
 * 
 * Muestra un resumen visual de los resultados del algoritmo ALNS
 * tanto para simulación semanal como para modo colapso.
 */
import type { AlgoritmoResponse, PuntoColapso } from '@/services/algoritmoSemanal.service';

interface ReporteResultadosProps {
  resultado: AlgoritmoResponse;
  modoSimulacion: 'SEMANAL' | 'COLAPSO';
  puntoColapso?: PuntoColapso | null;
  onClose?: () => void;
  onNuevaSimulacion?: () => void;
}

export function ReporteResultados({ 
  resultado, 
  modoSimulacion, 
  puntoColapso,
  onClose,
  onNuevaSimulacion 
}: ReporteResultadosProps) {
  
  // Calcular métricas
  const totalPedidos = resultado.totalPedidos || 0;
  const pedidosAsignados = resultado.pedidosAsignados || 0;
  const pedidosNoAsignados = resultado.pedidosNoAsignados || 0;
  const porcentajePedidos = totalPedidos > 0 
    ? Math.round((pedidosAsignados / totalPedidos) * 100) 
    : 0;
  
  const totalProductos = resultado.totalProductos || 0;
  const productosAsignados = resultado.productosAsignados || totalProductos;
  const porcentajeProductos = totalProductos > 0 
    ? Math.round((productosAsignados / totalProductos) * 100) 
    : 0;
  
  const vuelosUtilizados = resultado.vuelosUtilizados || 0;
  const tiempoEjecucion = resultado.tiempoEjecucionSegundos || resultado.segundosEjecucion || 0;
  const costoTotal = resultado.costoTotal || 0;
  
  // Determinar si hubo colapso
  const huboColapso = modoSimulacion === 'COLAPSO' && puntoColapso !== null;
  const sistemaExitoso = modoSimulacion === 'COLAPSO' && puntoColapso === null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 ${
        huboColapso 
          ? 'bg-gradient-to-r from-red-600 to-red-700' 
          : sistemaExitoso 
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-700'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {huboColapso && <span>🚨</span>}
              {sistemaExitoso && <span>✅</span>}
              {modoSimulacion === 'SEMANAL' && <span>📊</span>}
              Reporte de Simulación {modoSimulacion === 'SEMANAL' ? 'Semanal' : 'de Colapso'}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {huboColapso 
                ? 'Se detectó un punto de colapso en el sistema'
                : sistemaExitoso
                  ? 'El sistema soportó toda la carga sin colapsar'
                  : `Simulación de ${resultado.totalPedidos} pedidos completada`
              }
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Métricas principales */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Pedidos */}
          <MetricCard
            titulo="Pedidos"
            valor={`${pedidosAsignados}/${totalPedidos}`}
            porcentaje={porcentajePedidos}
            colorBarra={porcentajePedidos >= 90 ? 'bg-green-500' : porcentajePedidos >= 70 ? 'bg-yellow-500' : 'bg-red-500'}
            detalle={`${pedidosNoAsignados} no asignados`}
          />
          
          {/* Productos */}
          <MetricCard
            titulo="Productos"
            valor={`${productosAsignados.toLocaleString()}`}
            porcentaje={porcentajeProductos}
            colorBarra={porcentajeProductos >= 90 ? 'bg-green-500' : porcentajeProductos >= 70 ? 'bg-yellow-500' : 'bg-red-500'}
            detalle={`${totalProductos.toLocaleString()} total`}
          />
          
          {/* Vuelos */}
          <MetricCard
            titulo="Vuelos"
            valor={vuelosUtilizados.toString()}
            detalle="utilizados"
            sinBarra
          />
        </div>

        {/* Métricas secundarias */}
        <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-t border-b border-gray-100">
          <div className="text-center">
            <p className="text-sm text-gray-500">Tiempo de ejecución</p>
            <p className="text-lg font-semibold text-gray-900">
              {tiempoEjecucion < 60 
                ? `${tiempoEjecucion}s`
                : `${Math.floor(tiempoEjecucion / 60)}m ${tiempoEjecucion % 60}s`
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Costo total</p>
            <p className="text-lg font-semibold text-gray-900">
              ${costoTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">% Asignación</p>
            <p className={`text-lg font-semibold ${
              porcentajePedidos >= 90 ? 'text-green-600' : 
              porcentajePedidos >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {resultado.porcentajeAsignacion?.toFixed(1) || porcentajePedidos}%
            </p>
          </div>
        </div>

        {/* Información de colapso (solo en modo COLAPSO) */}
        {modoSimulacion === 'COLAPSO' && (
          <div className={`rounded-lg p-4 mb-6 ${
            huboColapso 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            {huboColapso && puntoColapso ? (
              <>
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  Punto de Colapso Detectado
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-red-700">Fecha del colapso</p>
                    <p className="font-medium text-red-900">
                      {new Date(puntoColapso.fechaColapso).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-red-700">Pedido que causó el colapso</p>
                    <p className="font-medium text-red-900">#{puntoColapso.pedidoId}</p>
                  </div>
                  <div>
                    <p className="text-red-700">Ruta</p>
                    <p className="font-medium text-red-900">
                      {puntoColapso.codigoOrigen} → {puntoColapso.codigoDestino}
                    </p>
                  </div>
                  <div>
                    <p className="text-red-700">Motivo</p>
                    <p className="font-medium text-red-900">{puntoColapso.motivo}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">
                      Pedidos procesados antes del colapso: <strong>{puntoColapso.pedidosAntesColapso}</strong>
                    </span>
                    <span className="text-red-700">
                      Pedidos no procesados: <strong>{puntoColapso.pedidosDespuesColapso}</strong>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  Sistema Estable
                </h3>
                <p className="text-sm text-green-800">
                  El sistema soportó toda la carga de pedidos sin detectar condiciones de colapso.
                  Todos los pedidos fueron procesados exitosamente dentro de sus deadlines.
                </p>
              </>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          {onNuevaSimulacion && (
            <button
              onClick={onNuevaSimulacion}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Nueva simulación
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Cerrar reporte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para las tarjetas de métricas
interface MetricCardProps {
  titulo: string;
  valor: string;
  porcentaje?: number;
  colorBarra?: string;
  detalle?: string;
  sinBarra?: boolean;
}

function MetricCard({ titulo, valor, porcentaje, colorBarra, detalle, sinBarra }: MetricCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-600 mb-1">{titulo}</p>
      <p className="text-2xl font-bold text-gray-900 mb-2">{valor}</p>
      
      {!sinBarra && porcentaje !== undefined && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${colorBarra}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{porcentaje}%</p>
        </div>
      )}
      
      {detalle && (
        <p className="text-xs text-gray-500">{detalle}</p>
      )}
    </div>
  );
}

export default ReporteResultados;

