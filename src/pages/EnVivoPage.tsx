/**
 * EnVivoPage – con Modo Automático
 *
 * Simulación en tiempo real usando /api/algoritmo/diario
 * Flujo:
 * 1. Cargar pedidos
 * 2. Ejecutar ventanas manual o automáticamente
 * 3. Mostrar resultados por ventana
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import type { FormEvent } from 'react';
import { MapViewTemporal } from '@/features/map/components';
import {
  ejecutarAlgoritmoDiario,
  type AlgoritmoResponse,
  type LineaDeTiempoSimulacionDTO,
  type RutaProductoDTO,
  type EventoLineaDeTiempoVueloDTO
} from '@/services/algoritmoSemanal.service';
import { useAirportsForMap } from '@/features/map/hooks';
import { crearPedidoDiaADia } from '@/services/pedido.service';
type PedidoVentana = {
  id: number;
  nombre: string;
};
type VentanaSimulacion = {
  index: number;
  horaInicio: string;
  horaFin: string;
  resultado: AlgoritmoResponse;
  orderIds: number[];
  pedidos: PedidoVentana[];
};

export function EnVivoPage() {
  const [dataCargada, setDataCargada] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [horaActual, setHoraActual] = useState(() => {
    const now = new Date();
    return toLocalIsoNoZ(now);
  });

  const [ventanas, setVentanas] = useState<VentanaSimulacion[]>([]);
  const [timelineGlobal, setTimelineGlobal] =
      useState<LineaDeTiempoSimulacionDTO | null>(null);

  // modo automático
  const [autoRun, setAutoRun] = useState(false);
  const [intervaloMs, setIntervalMs] = useState(3600000); // 1 min (60000) para pruebas, luego 3600000
  const autoRunRef = useRef(false);
  autoRunRef.current = autoRun;
  const { isLoading: airportsLoading, refetch: refetchAirports } =
      useAirportsForMap();
  // ---- Registro manual de pedidos (operación día a día) ----
  const [showNewOrderPanel, setShowNewOrderPanel] = useState(false);
  const [destinoCodigo, setDestinoCodigo] = useState('');
  const [cantidadProductos, setCantidadProductos] = useState<number | ''>('');
  const [isSavingPedido, setIsSavingPedido] = useState(false);
  const [pedidoError, setPedidoError] = useState<string | null>(null);
  const [ultimoPedidoId, setUltimoPedidoId] = useState<number | null>(null);

  function toLocalIsoNoZ(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    return `${y}-${m}-${d}T${h}:${min}:${s}`;
  }

  // Helper para sumar horas a un string ISO sin Z
  function addHours(dateIso: string, hours: number): string {
    const d = new Date(dateIso);
    d.setHours(d.getHours() + hours);
    return toLocalIsoNoZ(d);
  }
  function extraerPedidosDesdeResultado(resultado: AlgoritmoResponse): PedidoVentana[] {
    const mapa = new Map<number, string>();

    const rutas = resultado.lineaDeTiempo?.rutasProductos ?? [];

    rutas.forEach((ruta: RutaProductoDTO) => {
      const id = ruta.idPedido as number | undefined;
      if (id == null) return;

      const nombre =
          (ruta.nombrePedido as string | undefined) ||
          `Pedido #${id}`;

      if (!mapa.has(id)) {
        mapa.set(id, nombre);
      }
    });

    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id, nombre }));
  }
  // Merge de timelines
  function mergeTimelines(
      prev: LineaDeTiempoSimulacionDTO | null,
      next: LineaDeTiempoSimulacionDTO | undefined
  ): LineaDeTiempoSimulacionDTO | null {
    if (!next) return prev;
    if (!prev) return next;

    const eventos = [...(prev.eventos || []), ...(next.eventos || [])].sort(
        (a, b) => a.horaEvento.localeCompare(b.horaEvento)
    );

    const horaInicioSimulacion =
        prev.horaInicioSimulacion < next.horaInicioSimulacion
            ? prev.horaInicioSimulacion
            : next.horaInicioSimulacion;

    const horaFinSimulacion =
        prev.horaFinSimulacion > next.horaFinSimulacion
            ? prev.horaFinSimulacion
            : next.horaFinSimulacion;

    return {
      ...prev,
      horaInicioSimulacion,
      horaFinSimulacion,
      eventos,
      totalEventos: eventos.length,
      rutasProductos: [
        ...(prev.rutasProductos || []),
        ...(next.rutasProductos || []),
      ],
      totalProductos:
          (prev.totalProductos || 0) + (next.totalProductos || 0),
    };
  }

  // Resultado que realmente va al mapa:
  // toma el último resultado pero le enchufa el timelineGlobal
  const resultadoGlobalParaMapa: AlgoritmoResponse | null = useMemo(() => {
    if (ventanas.length === 0) return null;
    const last = ventanas[ventanas.length - 1].resultado;
    if (!timelineGlobal) return last;
    return {
      ...last,
      lineaDeTiempo: timelineGlobal,
    };
  }, [ventanas, timelineGlobal]);
  const [completedOrderIds, setCompletedOrderIds] = useState<number[]>([]);

  const completedOrderIdsSet = useMemo(
      () => new Set(completedOrderIds),
      [completedOrderIds]
  );
// Marca todos los eventos de la lineaDeTiempo con el índice de ventana
  function annotateTimelineWithWindow(
      resultado: AlgoritmoResponse,
      ventanaIndex: number
  ): AlgoritmoResponse {
    if (!resultado.lineaDeTiempo || !resultado.lineaDeTiempo.eventos) {
      return resultado;
    }

    return {
      ...resultado,
      lineaDeTiempo: {
        ...resultado.lineaDeTiempo,
        eventos: resultado.lineaDeTiempo.eventos.map((e: EventoLineaDeTiempoVueloDTO) => ({
          ...e,
          ventanaIndex,  // <-- campo extra solo usado en frontend
        })),
      },
    };
  }

// Extrae todos los ids de pedidos de una línea de tiempo
  function extractOrderIdsFromTimeline(
      linea?: LineaDeTiempoSimulacionDTO | null
  ): number[] {
    if (!linea?.eventos) return [];
    const set = new Set<number>();

    linea.eventos.forEach((event: EventoLineaDeTiempoVueloDTO) => {
      if (event.idsPedidos && event.idsPedidos.length > 0) {
        event.idsPedidos.forEach((id: number) => set.add(id));
      } else if (event.idPedido) {
        set.add(event.idPedido);
      }
    });

    return Array.from(set);
  }
  // --------- ejecutar una ventana ----------
  const ejecutarVentana = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const horaInicioVentana = horaActual;
    const horaFinVentana = addHours(horaInicioVentana, 1);

    const request = {
      horaInicioSimulacion: horaInicioVentana,
      duracionSimulacionHoras: 1,
      usarBaseDatos: true,
      maxIteraciones: 800,
      tasaDestruccion: 0.3,
      habilitarUnitizacion: true,
    };
    const ventanaIndex = ventanas.length + 1;
    try {
      const resultadoCrudo = await ejecutarAlgoritmoDiario(request);
      console.log(
          '[DEBUG] rutasProductos crudo de esta ventana',
          resultadoCrudo.lineaDeTiempo?.rutasProductos
      );

      // 1) Decorar timeline con la ventana
      const resultado = annotateTimelineWithWindow(resultadoCrudo, ventanaIndex);

      // 2) Calcular pedidos de esta ventana
      const orderIds = extractOrderIdsFromTimeline(resultado.lineaDeTiempo);
      const pedidosVentana = extraerPedidosDesdeResultado(resultado);
      // refrescar aeropuertos
      try {
        await refetchAirports();
      } catch (e) {
        console.warn(
            'No se pudieron refrescar aeropuertos tras ejecutar ventana:',
            e
        );
      }

      // actualizar lista de ventanas
      setVentanas((prev) => [
        ...prev,
        {
          index: prev.length + 1,
          horaInicio: horaInicioVentana,
          horaFin: horaFinVentana,
          resultado,
          orderIds,
          pedidos: pedidosVentana,
        },
      ]);

      // merge de timeline global
      setTimelineGlobal((prev) => mergeTimelines(prev, resultado.lineaDeTiempo));

      // avanzar hora actual a la siguiente ventana
      setHoraActual(horaFinVentana);
    } catch (e) {
      console.error('Error ejecutando ventana:', e);
      setAutoRun(false);
    } finally {
      setIsRunning(false);
    }
  };

  // guardar ref para modo automático
  const ejecutarReferencia = useRef<() => Promise<void>>(async () => {});
  ejecutarReferencia.current = ejecutarVentana;

  // iniciar operación día a día
  const iniciarOperacionDiaria = async () => {
    setDataCargada(true);
    setAutoRun(true);
    setVentanas([]);
    setTimelineGlobal(null);

    try {
      await refetchAirports();
    } catch (e) {
      console.warn(
          'Advertencia: no se pudieron cargar los aeropuertos antes de iniciar la operación:',
          e
      );
    }

    await ejecutarReferencia.current();
  };
  useEffect(() => {
    if (!autoRun) return;

    const interval = setInterval(() => {
      if (!isRunning && autoRunRef.current) {
        ejecutarReferencia.current();
      }
    }, intervaloMs);

    return () => clearInterval(interval);
  }, [autoRun, intervaloMs, isRunning]);
  const handleSubmitNuevoPedido = async (e: FormEvent) => {
    e.preventDefault();
    setPedidoError(null);

    if (!destinoCodigo.trim()) {
      setPedidoError('Debes ingresar el código de aeropuerto destino.');
      return;
    }
    const cantidad = Number(cantidadProductos);
    if (!cantidad || cantidad <= 0) {
      setPedidoError('La cantidad de productos debe ser mayor a 0.');
      return;
    }

    try {
      setIsSavingPedido(true);

      const nuevoId = await crearPedidoDiaADia({
        aeropuertoDestinoCodigo: destinoCodigo.trim().toUpperCase(),
        cantidadProductos: cantidad,
        fechaPedido: horaActual,
      });

      setUltimoPedidoId(nuevoId);
      setShowNewOrderPanel(false);
      setDestinoCodigo('');
      setCantidadProductos('');

      // Opcional: puedes mostrar un toast, por ahora uso alert
      alert(
          `Pedido registrado correctamente (ID ${nuevoId}). ` +
          `Se asignará en la próxima ventana que ejecutes.`
      );
    } catch (err: unknown) {
      console.error('Error registrando pedido:', err);
      const message = err instanceof Error ? err.message : String(err);
      setPedidoError(message || 'Error inesperado al registrar el pedido.');
    } finally {
      setIsSavingPedido(false);
    }
  };
  // -------------- RENDER --------------
  return (
      <div className="h-full flex flex-col p-6">

        {!dataCargada && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                1. Ejecutar Operación día a día
              </h2>
              <p className="text-gray-600 mb-3">
                Inicia la operación día a día. Se ejecutará una ventana de 1h
                por vez.
              </p>

              <button
                  onClick={iniciarOperacionDiaria}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Ejecutar Operación día a día
              </button>
            </div>
        )}

        {dataCargada && (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">
                  2. Operaciones en tiempo real
                </h2>

                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <button
                      onClick={ejecutarVentana}
                      disabled={isRunning || autoRun}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium"
                  >
                    {isRunning ? 'Procesando...' : 'Procesar siguiente ventana ➜'}
                  </button>

                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={autoRun}
                        onChange={(e) => setAutoRun(e.target.checked)}
                    />
                    <span className="text-gray-700">Automático</span>
                  </label>

                  {autoRun && (
                      <input
                          type="number"
                          value={intervaloMs}
                          onChange={(e) => setIntervalMs(Number(e.target.value))}
                          className="border p-2 rounded w-32"
                          min={1000}
                      />
                  )}
                </div>
                {/* lado derecho: botón Registrar pedido */}
                <button
                    type="button"
                    onClick={() => setShowNewOrderPanel(true)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm"
                >
                  + Registrar pedido
                </button>

                <p className="mt-1 text-sm text-gray-500">
                  Hora inicio próxima ventana:{' '}
                  <strong>{horaActual}</strong>
                </p>
              </div>

              <div className="flex-1 relative min-h-0">
                {/* Mapa */}
                <div className="absolute inset-0 z-0 border rounded-xl overflow-hidden bg-gray-50">
                  {resultadoGlobalParaMapa && !airportsLoading ? (
                      <MapViewTemporal
                          resultado={resultadoGlobalParaMapa}
                          initialTimeUnit="seconds"
                          autoPlay
                          onCompletedOrdersChange={setCompletedOrderIds}
                      />
                  ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        {airportsLoading
                            ? 'Cargando aeropuertos...'
                            : 'Aún no hay ventanas procesadas.'}
                      </div>
                  )}
                </div>
                {/* Panel flotante para registrar pedidos manuales */}
                {showNewOrderPanel && (
                    <div className="fixed right-6 top-24 z-50 w-80 bg-white border border-gray-200 shadow-2xl rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-gray-900 text-sm">
                          Registrar pedido (día a día)
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowNewOrderPanel(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>

                      <form className="space-y-3" onSubmit={handleSubmitNuevoPedido}>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Código aeropuerto destino
                          </label>
                          <input
                              type="text"
                              value={destinoCodigo}
                              onChange={(e) => setDestinoCodigo(e.target.value)}
                              placeholder="Ej: SPJC, LIM, etc."
                              className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Cantidad de productos
                          </label>
                          <input
                              type="number"
                              min={1}
                              value={cantidadProductos}
                              onChange={(e) =>
                                  setCantidadProductos(e.target.value === '' ? '' : Number(e.target.value))
                              }
                              className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        {pedidoError && (
                            <p className="text-xs text-red-600">{pedidoError}</p>
                        )}

                        {ultimoPedidoId && (
                            <p className="text-[11px] text-emerald-700">
                              Último pedido creado: <strong>ID {ultimoPedidoId}</strong>
                            </p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                              type="button"
                              onClick={() => setShowNewOrderPanel(false)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button
                              type="submit"
                              disabled={isSavingPedido}
                              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:bg-emerald-300"
                          >
                            {isSavingPedido ? 'Guardando...' : 'Registrar'}
                          </button>
                        </div>
                      </form>
                    </div>
                )}
                {/* Panel derecho con info por ventana */}
                <div className="absolute top-24 left-6 z-40 w-80 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl rounded-xl p-3 max-h-[60vh] overflow-y-auto">
                  <h3 className="font-semibold mb-2">
                    Ventanas procesadas ({ventanas.length})
                  </h3>
                  {ventanas.map((v) => {
                    const totalPedidosVentana = v.orderIds.length;
                    const pedidosCompletadosVentana = v.orderIds.filter(id =>
                        completedOrderIdsSet.has(id)
                    ).length;

                    const allDelivered =
                        totalPedidosVentana > 0 &&
                        pedidosCompletadosVentana === totalPedidosVentana;

                    return (
                        <div
                            key={v.index}
                            className="mb-3 rounded-lg border px-2 py-1 text-xs bg-gray-50"
                        >
                          <div className="flex justify-between items-center">
                            <div className="font-semibold">Ventana {v.index}</div>
                            <div>
                              {allDelivered ? '✅' : '⌛'}
                            </div>
                          </div>
                          <div>
                            {v.horaInicio} — {v.horaFin}
                          </div>
                          <div>
                            Pedidos:{' '}
                            <strong>
                              {v.resultado.totalPedidos} ({v.resultado.pedidosAsignados} asignados)
                            </strong>
                          </div>
                          <div>
                            Productos:{' '}
                            <strong>{v.resultado.totalProductos}</strong>
                          </div>
                          {v.pedidos.length > 0 && (
                              <div className="mt-1">
                                <div className="font-semibold mb-0.5">Listado de pedidos:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {v.pedidos.map((p) => (
                                      <li key={p.id}>
                                        {p.nombre} <span className="text-[10px] text-gray-500">(# {p.id})</span>
                                      </li>
                                  ))}
                                </ul>
                              </div>
                          )}
                          <div className="mt-1">
                            Entrega:{' '}
                            <strong>
                              {pedidosCompletadosVentana}/{totalPedidosVentana} pedidos entregados
                            </strong>
                          </div>
                        </div>
                    );
                  })}


                  {ventanas.length === 0 && (
                      <p className="text-xs text-gray-500">
                        A medida que se vayan ejecutando ventanas, aquí se
                        listará qué pedidos/productos se asignaron en cada una.
                      </p>
                  )}
                </div>
              </div>
            </>
        )}
      </div>
  );
}
export default EnVivoPage;
