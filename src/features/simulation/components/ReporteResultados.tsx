/**
 * ReporteResultados - Componente para mostrar métricas de simulación
 * 
 * Muestra un resumen visual de los resultados del algoritmo ALNS
 * tanto para simulación semanal como para modo colapso.
 */
import { useMemo } from 'react';
import type { AlgoritmoResponse, PuntoColapso, RutaProductoDTO } from '@/services/algoritmoSemanal.service';

interface ReporteResultadosProps {
  resultado: AlgoritmoResponse;
  modoSimulacion: 'SEMANAL' | 'COLAPSO';
  puntoColapso?: PuntoColapso | null;
  onClose?: () => void;
  onNuevaSimulacion?: () => void;
}

// Tipo para rutas agrupadas
interface RutaAgrupada {
  origen: string;
  destino: string;
  cantidad: number;
}

// Tipo para distribución por día
interface DistribucionDia {
  dia: string;
  cantidad: number;
  fecha: Date; // Para ordenar cronológicamente
}

export function ReporteResultados({ 
  resultado, 
  modoSimulacion, 
  puntoColapso,
  onClose,
  onNuevaSimulacion 
}: ReporteResultadosProps) {
  
  // Calcular métricas básicas
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
  
  // Determinar si hubo colapso
  const huboColapso = modoSimulacion === 'COLAPSO' && puntoColapso !== null;
  const sistemaExitoso = modoSimulacion === 'COLAPSO' && puntoColapso === null;

  // Calcular top rutas más utilizadas
  const topRutas = useMemo((): RutaAgrupada[] => {
    const rutas = resultado.rutasProductos || resultado.lineaDeTiempo?.rutasProductos || [];
    if (rutas.length === 0) return [];

    const rutasMap = new Map<string, number>();
    rutas.forEach((ruta: RutaProductoDTO) => {
      if (ruta.codigoOrigen && ruta.codigoDestino) {
        const key = `${ruta.codigoOrigen}→${ruta.codigoDestino}`;
        rutasMap.set(key, (rutasMap.get(key) || 0) + 1);
      }
    });

    return Array.from(rutasMap.entries())
      .map(([key, cantidad]) => {
        const [origen, destino] = key.split('→');
        return { origen, destino, cantidad };
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [resultado.rutasProductos, resultado.lineaDeTiempo?.rutasProductos]);

  // Calcular tiempo promedio de entrega
  const tiempoPromedioEntrega = useMemo(() => {
    if (resultado.tiempoPromedioEntrega) {
      return resultado.tiempoPromedioEntrega;
    }
    
    const rutas = resultado.rutasProductos || resultado.lineaDeTiempo?.rutasProductos || [];
    if (rutas.length === 0) return null;

    const tiempos = rutas
      .filter((r: RutaProductoDTO) => r.tiempoTotalHoras !== undefined && r.tiempoTotalHoras > 0)
      .map((r: RutaProductoDTO) => r.tiempoTotalHoras!);
    
    if (tiempos.length === 0) return null;
    return tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
  }, [resultado.tiempoPromedioEntrega, resultado.rutasProductos, resultado.lineaDeTiempo?.rutasProductos]);

  // Calcular distribución de pedidos por día
  const distribucionPorDia = useMemo((): DistribucionDia[] => {
    const rutas = resultado.rutasProductos || resultado.lineaDeTiempo?.rutasProductos || [];
    if (rutas.length === 0) return [];

    // Map con fecha como key para agrupar por día
    const diasMap = new Map<string, { cantidad: number; fecha: Date }>();
    rutas.forEach((ruta: RutaProductoDTO) => {
      if (ruta.fechaPedido) {
        const fecha = new Date(ruta.fechaPedido);
        // Usar fecha ISO (yyyy-mm-dd) como key para agrupar correctamente
        const fechaKey = fecha.toISOString().split('T')[0];
        const existing = diasMap.get(fechaKey);
        if (existing) {
          existing.cantidad += 1;
        } else {
          diasMap.set(fechaKey, { cantidad: 1, fecha });
        }
      }
    });

    // Convertir a array y ordenar cronológicamente
    return Array.from(diasMap.entries())
      .map(([, data]) => ({
        dia: data.fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        cantidad: data.cantidad,
        fecha: data.fecha,
      }))
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .slice(0, 7); // Máximo 7 días
  }, [resultado.rutasProductos, resultado.lineaDeTiempo?.rutasProductos]);

  // Función para exportar reporte
  const handleExportar = () => {
    const reporteTexto = generarReporteTexto();
    const blob = new Blob([reporteTexto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_simulacion_${modoSimulacion.toLowerCase()}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generarReporteTexto = () => {
    let texto = `=== REPORTE DE SIMULACIÓN ${modoSimulacion} ===\n`;
    texto += `Fecha: ${new Date().toLocaleString('es-ES')}\n\n`;
    
    texto += `--- MÉTRICAS PRINCIPALES ---\n`;
    texto += `Pedidos: ${pedidosAsignados}/${totalPedidos} (${porcentajePedidos}%)\n`;
    texto += `Productos: ${productosAsignados}/${totalProductos}\n`;
    texto += `Vuelos utilizados: ${vuelosUtilizados}\n`;
    texto += `Tiempo de ejecución: ${tiempoEjecucion}s\n\n`;

    if (tiempoPromedioEntrega) {
      texto += `--- TIEMPOS ---\n`;
      texto += `Tiempo promedio de entrega: ${tiempoPromedioEntrega.toFixed(1)} horas\n\n`;
    }

    if (topRutas.length > 0) {
      texto += `--- TOP RUTAS ---\n`;
      topRutas.forEach((ruta, i) => {
        texto += `${i + 1}. ${ruta.origen} → ${ruta.destino}: ${ruta.cantidad} pedidos\n`;
      });
      texto += '\n';
    }

    if (modoSimulacion === 'COLAPSO') {
      texto += `--- RESULTADO COLAPSO ---\n`;
      if (puntoColapso) {
        texto += `Estado: COLAPSO DETECTADO\n`;
        texto += `Fecha: ${new Date(puntoColapso.fechaColapso).toLocaleString('es-ES')}\n`;
        texto += `Pedido: #${puntoColapso.pedidoId}\n`;
        texto += `Ruta: ${puntoColapso.codigoOrigen} → ${puntoColapso.codigoDestino}\n`;
        texto += `Motivo: ${puntoColapso.motivo}\n`;
      } else {
        texto += `Estado: SISTEMA ESTABLE - No se detectó colapso\n`;
      }
    }

    return texto;
  };

  // Calcular max para el mini gráfico
  const maxDistribucion = Math.max(...distribucionPorDia.map(d => d.cantidad), 1);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-lg">
      {/* Header */}
      <div className={`px-5 py-3 ${
        huboColapso 
          ? 'bg-gradient-to-r from-red-600 to-red-700' 
          : sistemaExitoso 
            ? 'bg-gradient-to-r from-green-600 to-green-700'
            : 'bg-gradient-to-r from-blue-600 to-blue-700'
      }`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {huboColapso && <span>🚨</span>}
              {sistemaExitoso && <span>✅</span>}
              {modoSimulacion === 'SEMANAL' && <span>📊</span>}
              Reporte {modoSimulacion === 'SEMANAL' ? 'Semanal' : 'Colapso'}
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {huboColapso 
                ? 'Colapso detectado'
                : sistemaExitoso
                  ? 'Sistema estable'
                  : `${resultado.totalPedidos} pedidos procesados`
              }
            </p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Métricas principales - más compactas */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            titulo="Pedidos"
            valor={`${pedidosAsignados}/${totalPedidos}`}
            porcentaje={porcentajePedidos}
            colorBarra={porcentajePedidos >= 90 ? 'bg-green-500' : porcentajePedidos >= 70 ? 'bg-yellow-500' : 'bg-red-500'}
            detalle={`${pedidosNoAsignados} sin asignar`}
          />
          <MetricCard
            titulo="Productos"
            valor={productosAsignados.toLocaleString()}
            porcentaje={porcentajeProductos}
            colorBarra={porcentajeProductos >= 90 ? 'bg-green-500' : porcentajeProductos >= 70 ? 'bg-yellow-500' : 'bg-red-500'}
            detalle={`de ${totalProductos.toLocaleString()}`}
          />
          <MetricCard
            titulo="Vuelos"
            valor={vuelosUtilizados.toString()}
            detalle="utilizados"
            sinBarra
          />
        </div>

        {/* Métricas secundarias */}
        <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500">Ejecución</p>
            <p className="text-sm font-semibold text-gray-900">
              {tiempoEjecucion < 60 
                ? `${tiempoEjecucion}s`
                : `${Math.floor(tiempoEjecucion / 60)}m ${tiempoEjecucion % 60}s`
              }
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Asignación</p>
            <p className={`text-sm font-semibold ${
              porcentajePedidos >= 90 ? 'text-green-600' : 
              porcentajePedidos >= 70 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {resultado.porcentajeAsignacion?.toFixed(1) || porcentajePedidos}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Tiempo prom.</p>
            <p className="text-sm font-semibold text-gray-900">
              {tiempoPromedioEntrega 
                ? `${tiempoPromedioEntrega.toFixed(1)}h`
                : '-'
              }
            </p>
          </div>
        </div>

        {/* Top Rutas */}
        {topRutas.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Top Rutas
            </h3>
            <div className="space-y-1.5">
              {topRutas.map((ruta, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-900">{ruta.origen}</span>
                    <span className="mx-1">→</span>
                    <span className="font-medium text-gray-900">{ruta.destino}</span>
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                    {ruta.cantidad}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini gráfico de distribución por día */}
        {distribucionPorDia.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Pedidos por Día
            </h3>
            <div className="flex items-end justify-between gap-2 h-20">
              {distribucionPorDia.map((d, i) => {
                const heightPercent = Math.max((d.cantidad / maxDistribucion) * 100, 10);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    {/* Cantidad sobre la barra */}
                    <span className="text-[10px] font-semibold text-blue-700 mb-0.5">
                      {d.cantidad}
                    </span>
                    {/* Barra */}
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all"
                      style={{ height: `${heightPercent}%` }}
                    />
                    {/* Día */}
                    <span className="text-[9px] text-gray-500 mt-1 whitespace-nowrap">{d.dia}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Información de colapso */}
        {modoSimulacion === 'COLAPSO' && (
          <div className={`rounded-lg p-3 ${
            huboColapso 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            {huboColapso && puntoColapso ? (
              <>
                <h3 className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                  ⚠️ Punto de Colapso
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-red-600">Fecha</p>
                    <p className="font-medium text-red-900">
                      {new Date(puntoColapso.fechaColapso).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-red-600">Pedido</p>
                    <p className="font-medium text-red-900">#{puntoColapso.pedidoId}</p>
                  </div>
                  <div>
                    <p className="text-red-600">Ruta</p>
                    <p className="font-medium text-red-900">
                      {puntoColapso.codigoOrigen} → {puntoColapso.codigoDestino}
                    </p>
                  </div>
                  <div>
                    <p className="text-red-600">Motivo</p>
                    <p className="font-medium text-red-900 truncate" title={puntoColapso.motivo}>
                      {puntoColapso.motivo}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-red-200 flex justify-between text-xs">
                  <span className="text-red-700">
                    Antes: <strong>{puntoColapso.pedidosAntesColapso}</strong>
                  </span>
                  <span className="text-red-700">
                    Sin procesar: <strong>{puntoColapso.pedidosDespuesColapso}</strong>
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <div>
                  <p className="text-xs font-semibold text-green-900">Sistema Estable</p>
                  <p className="text-xs text-green-700">
                    Todos los pedidos procesados sin colapso
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-between gap-2 pt-2">
          <button
            onClick={handleExportar}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </button>
          <div className="flex gap-2">
            {onNuevaSimulacion && (
              <button
                onClick={onNuevaSimulacion}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                Nueva
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para las tarjetas de métricas (más compacto)
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
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-xs font-medium text-gray-500 mb-0.5">{titulo}</p>
      <p className="text-lg font-bold text-gray-900">{valor}</p>
      
      {!sinBarra && porcentaje !== undefined && (
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all ${colorBarra}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
      )}
      
      {detalle && (
        <p className="text-[10px] text-gray-500 mt-1">{detalle}</p>
      )}
    </div>
  );
}

export default ReporteResultados;
