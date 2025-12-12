/**
 * OrderDetailDrawer Component
 * 
 * Panel deslizable que muestra información detallada de un pedido para operadores.
 * Incluye datos del pedido, cliente, productos, y métricas de urgencia.
 */

import { useState, useEffect, useCallback } from 'react';
import { getOrderDetailComplete, type OrderDetailResponse } from '@/services/consultas.service';

interface OrderDetailDrawerProps {
  /** ID del pedido a mostrar (null para cerrar) */
  orderId: number | null;
  /** Callback para cerrar el drawer */
  onClose: () => void;
  /** Callback para filtrar eventos por este pedido */
  onFilterByOrder?: (orderId: number) => void;
  /** Callback para centrar el mapa en el pedido (si está en vuelo) */
  onFocusOnMap?: (orderId: number) => void;
  /** Información de vuelo actual si el pedido está en vuelo (de la simulación) */
  currentFlightInfo?: {
    flightCode: string;
    originCode: string;
    destinationCode: string;
  } | null;
}

/**
 * Obtiene el color y estilo según el estado del pedido
 */
function getEstadoPedidoStyle(estado: string): { bg: string; text: string; label: string } {
  switch (estado?.toUpperCase()) {
    case 'PENDIENTE':
      return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendiente' };
    case 'EN_TRANSITO':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Tránsito' };
    case 'ENTREGADO':
      return { bg: 'bg-green-100', text: 'text-green-700', label: 'Entregado' };
    case 'CANCELADO':
      return { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' };
    case 'RETRASADO':
      return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Retrasado' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', label: estado || 'Desconocido' };
  }
}

/**
 * Obtiene el color y estilo según el estado del producto
 */
function getEstadoProductoStyle(estado: string): { bg: string; text: string; icon: string } {
  switch (estado?.toUpperCase()) {
    case 'EN_ALMACEN':
      return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🏭' };
    case 'EN_VUELO':
      return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '✈️' };
    case 'ENTREGADO':
      return { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' };
    case 'PERDIDO':
      return { bg: 'bg-red-100', text: 'text-red-700', icon: '⚠️' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', icon: '❓' };
  }
}


/**
 * Formatea fecha ISO a formato legible
 */
function formatFecha(fechaISO: string | null): string {
  if (!fechaISO) return '-';
  try {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fechaISO;
  }
}


/**
 * Componente principal del Drawer
 */
export function OrderDetailDrawer({
  orderId,
  onClose,
  onFilterByOrder,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentFlightInfo,
}: OrderDetailDrawerProps) {
  const [data, setData] = useState<OrderDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Métricas de productos
  // Si currentFlightInfo existe, el pedido está en vuelo según la simulación
  const isCurrentlyInFlight = !!currentFlightInfo;
  
  const metricasCalculadas = data ? {
    porcentajeEntrega: data.metricas.porcentajeEntrega,
    productosEntregados: data.metricas.productosEntregados,
    // Si está en vuelo según simulación, todos los no-entregados están en vuelo
    productosEnVuelo: isCurrentlyInFlight 
      ? data.productos.length - data.metricas.productosEntregados 
      : data.metricas.productosEnVuelo,
    productosEnAlmacen: isCurrentlyInFlight 
      ? 0 
      : data.metricas.productosEnAlmacen,
  } : null;

  // Cargar datos del pedido cuando cambia el ID
  useEffect(() => {
    if (orderId === null) {
      setIsVisible(false);
      setTimeout(() => {
        setData(null);
        setError(null);
      }, 300); // Esperar a que termine la animación
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsVisible(true);

    getOrderDetailComplete(orderId)
      .then((response) => {
        if (response.exito) {
          setData(response);
        } else {
          setError(response.mensaje || 'Error al cargar pedido');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error de conexión');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId]);

  // Handler para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && orderId !== null) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderId, onClose]);

  // Copiar ID al portapapeles
  const handleCopyId = useCallback(() => {
    if (orderId) {
      navigator.clipboard.writeText(orderId.toString());
    }
  }, [orderId]);

  // Si no hay orderId, no renderizar nada
  if (orderId === null && !isVisible) {
    return null;
  }

  return (
    <>
      {/* Overlay oscuro */}
      <div
        className={`fixed inset-0 bg-black/30 z-[1100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-white shadow-2xl z-[1101] flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                📦 Pedido #{orderId}
              </h2>
              {data?.pedido?.externalId && (
                <p className="text-indigo-200 text-xs mt-0.5">
                  External ID: {data.pedido.externalId}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
                <p className="text-gray-500 text-sm">Cargando pedido...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <p className="text-gray-700 font-medium">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : data ? (
            <div className="p-4 space-y-4">
              {/* Estado y Urgencia */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Badge de estado */}
                {(() => {
                  const estilo = getEstadoPedidoStyle(data.pedido.estado);
                  return (
                    <span className={`${estilo.bg} ${estilo.text} px-3 py-1 rounded-full text-sm font-semibold`}>
                      {estilo.label}
                    </span>
                  );
                })()}
                
                {/* Prioridad */}
                {data.pedido.prioridad > 0 && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-semibold">
                    Prioridad: {data.pedido.prioridad.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Ruta y Fechas */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {/* Ruta */}
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛫</span>
                  <span className="font-mono text-sm font-semibold text-gray-700">
                    {data.pedido.origenIATA || '???'}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-sm font-semibold text-gray-700">
                    {data.pedido.destinoIATA || '???'}
                  </span>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Fecha pedido</p>
                    <p className="font-medium text-gray-800">{formatFecha(data.pedido.fechaPedido)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fecha límite</p>
                    <p className="font-medium text-gray-800">{formatFecha(data.pedido.fechaLimiteEntrega)}</p>
                  </div>
                </div>

              </div>

              {/* Cliente */}
              {data.cliente && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    👤 Cliente
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-gray-900">{data.cliente.nombreCompleto || 'Sin nombre'}</p>
                    {data.cliente.tipoDocumento && data.cliente.numeroDocumento && (
                      <p className="text-gray-600">
                        {data.cliente.tipoDocumento}: {data.cliente.numeroDocumento}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {data.cliente.correo && (
                        <a
                          href={`mailto:${data.cliente.correo}`}
                          className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          📧 {data.cliente.correo}
                        </a>
                      )}
                      {data.cliente.telefono && (
                        <a
                          href={`tel:${data.cliente.telefono}`}
                          className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          📞 {data.cliente.telefono}
                        </a>
                      )}
                    </div>
                    {data.cliente.ciudadRecojo && (
                      <p className="text-xs text-gray-500 pt-1">
                        📍 Ciudad recojo: {data.cliente.ciudadRecojo}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Productos */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    📦 Productos ({data.productos.length})
                  </span>
                  <span className="text-xs font-normal text-gray-500">
                    {metricasCalculadas?.porcentajeEntrega.toFixed(0) ?? 0}% entregado
                  </span>
                </h3>

                {/* Barra de progreso */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${metricasCalculadas?.porcentajeEntrega ?? 0}%` }}
                  />
                </div>

                {/* Indicador si está en vuelo actualmente */}
                {isCurrentlyInFlight && currentFlightInfo && (
                  <div className="bg-sky-100 border border-sky-200 rounded-lg p-2 mb-3 flex items-center gap-2">
                    <span className="text-lg">✈️</span>
                    <div className="text-xs">
                      <p className="font-semibold text-sky-800">En vuelo ahora</p>
                      <p className="text-sky-600">
                        {currentFlightInfo.flightCode} ({currentFlightInfo.originCode} → {currentFlightInfo.destinationCode})
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de productos */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.productos.map((producto) => {
                    // Si está en vuelo según simulación y no está entregado, mostrar como EN_VUELO
                    const estadoReal = isCurrentlyInFlight && producto.estado !== 'ENTREGADO' 
                      ? 'EN_VUELO' 
                      : producto.estado;
                    const estilo = getEstadoProductoStyle(estadoReal);
                    return (
                      <div
                        key={producto.id}
                        className={`${estilo.bg} rounded-lg p-2.5 border border-gray-100`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{estilo.icon}</span>
                            <div>
                              <p className={`text-sm font-medium ${estilo.text}`}>
                                {producto.nombre || `Producto #${producto.id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {producto.peso?.toFixed(2) || 0} kg · {producto.volumen?.toFixed(3) || 0} m³
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold ${estilo.text} px-1.5 py-0.5 rounded`}>
                            {estadoReal?.replace('_', ' ')}
                          </span>
                        </div>
                        {/* Mostrar info del vuelo actual si está en vuelo */}
                        {isCurrentlyInFlight && currentFlightInfo && estadoReal === 'EN_VUELO' && (
                          <p className="text-[10px] text-sky-600 mt-1 pl-7">
                            ✈️ {currentFlightInfo.flightCode}
                          </p>
                        )}
                        {producto.fechaLlegada && (
                          <p className="text-[10px] text-gray-500 mt-0.5 pl-7">
                            Llegada: {formatFecha(producto.fechaLlegada)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Resumen de estados */}
                <div className="flex gap-2 mt-3 text-xs">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    🏭 {metricasCalculadas?.productosEnAlmacen ?? 0} almacén
                  </span>
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    ✈️ {metricasCalculadas?.productosEnVuelo ?? 0} vuelo
                  </span>
                  <span className="bg-green-100 text-green-600 px-2 py-1 rounded">
                    ✅ {metricasCalculadas?.productosEntregados ?? 0} entregados
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer con acciones */}
        {data && (
          <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-gray-50">
            <div className="flex gap-2">
              {onFilterByOrder && (
                <button
                  onClick={() => onFilterByOrder(orderId!)}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtrar eventos
                </button>
              )}
              <button
                onClick={handleCopyId}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                title="Copiar ID"
              >
                📋
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

