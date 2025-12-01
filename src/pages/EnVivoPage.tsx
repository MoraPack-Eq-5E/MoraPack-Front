/**
 * EnVivoPage – con Modo Automático
 *
 * Simulación en tiempo real usando /api/algoritmo/diario
 * Flujo:
 * 1. Cargar pedidos
 * 2. Ejecutar ventanas manual o automáticamente
 * 3. Mostrar resultados por ventana
 */
import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { MapViewTemporal } from '@/features/map/components';
import {
  ejecutarAlgoritmoDiario,
  type AlgoritmoResponse,
  type LineaDeTiempoSimulacionDTO
} from '@/services/algoritmoSemanal.service';
import { useAirportsForMap } from '@/features/map/hooks';

type VentanaSimulacion = {
  index: number;
  horaInicio: string;
  horaFin: string;
  resultado: AlgoritmoResponse;
  orderIds: number[];
};
type PedidoLocal = {
  id: number;
  destino: string;
  cantidad: number;
  fechaRegistro: string;
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
  const [intervaloMs, setIntervalMs] = useState(60000); // 1 min para pruebas, luego 3600000
  const autoRunRef = useRef(false);
  autoRunRef.current = autoRun;

  const { isLoading: airportsLoading, refetch: refetchAirports } =
      useAirportsForMap();
  // === Estado para pedidos locales (solo front) ===
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [nuevoPedidoDestino, setNuevoPedidoDestino] = useState('');
  const [nuevoPedidoCantidad, setNuevoPedidoCantidad] = useState(1);
  const [orderFormError, setOrderFormError] = useState<string | null>(null);
  const [pedidosLocales, setPedidosLocales] = useState<PedidoLocal[]>([]);
  const pedidoIdRef = useRef(1);

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
        eventos: resultado.lineaDeTiempo.eventos.map((e: any) => ({
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

    linea.eventos.forEach((event: any) => {
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

      // 1) Decorar timeline con la ventana
      const resultado = annotateTimelineWithWindow(resultadoCrudo, ventanaIndex);

      // 2) Calcular pedidos de esta ventana
      const orderIds = extractOrderIdsFromTimeline(resultado.lineaDeTiempo);

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
    setAutoRun(false);
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

  // modo automático: dispara ejecutarVentana cada intervaloMs
  useEffect(() => {
    if (!autoRun) return;

    const interval = setInterval(() => {
      if (!isRunning && autoRunRef.current) {
        ejecutarReferencia.current();
      }
    }, intervaloMs);

    return () => clearInterval(interval);
  }, [autoRun, intervaloMs, isRunning]);
  // --------- handler para crear pedido local (solo front) ----------
  const handleSubmitPedido = (e: FormEvent) => {
    e.preventDefault();

    const destino = nuevoPedidoDestino.trim().toUpperCase();
    const cantidad = Number(nuevoPedidoCantidad);

    if (!destino) {
      setOrderFormError('El código de destino es obligatorio.');
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setOrderFormError('La cantidad debe ser mayor a 0.');
      return;
    }

    const now = new Date();
    const nuevo: PedidoLocal = {
      id: pedidoIdRef.current++,
      destino,
      cantidad,
      fechaRegistro: toLocalIsoNoZ(now),
    };

    setPedidosLocales((prev) => [...prev, nuevo]);
    setOrderFormError(null);
    setNuevoPedidoDestino('');
    setNuevoPedidoCantidad(1);
    setShowOrderForm(false);

    // Por ahora solo log: aquí luego puedes llamar a tu API / registrar en back
    console.log('[EnVivo] Pedido local registrado (solo front):', nuevo);
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
                    onClick={() => setShowOrderForm((v) => !v)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium shadow-sm"
                >
                  Registrar pedido
                </button>

                <p className="mt-1 text-sm text-gray-500">
                  Hora inicio próxima ventana:{' '}
                  <strong>{horaActual}</strong>
                </p>
                {pedidosLocales.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Pedidos registrados localmente (solo front):{' '}
                      <strong>{pedidosLocales.length}</strong>
                    </p>
                )}
              </div>

              <div className="flex-1 flex gap-4 min-h-0">
                {/* Mapa */}
                <div className="flex-1 border rounded-xl overflow-hidden bg-gray-50">
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
                {/* Panel flotante para registrar pedido */}
                {showOrderForm && (
                    <div className="absolute top-3 right-3 z-[1100] bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 w-[260px]">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Registrar pedido
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowOrderForm(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>

                      <form
                          className="space-y-3 text-xs"
                          onSubmit={handleSubmitPedido}
                      >
                        <div>
                          <label className="block text-gray-600 mb-1">
                            Código destino (IATA)
                          </label>
                          <input
                              type="text"
                              value={nuevoPedidoDestino}
                              onChange={(e) =>
                                  setNuevoPedidoDestino(e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5 text-sm"
                              placeholder="Ej: SKBO, SBBR..."
                              maxLength={10}
                          />
                        </div>

                        <div>
                          <label className="block text-gray-600 mb-1">
                            Cantidad de productos
                          </label>
                          <input
                              type="number"
                              min={1}
                              value={nuevoPedidoCantidad}
                              onChange={(e) =>
                                  setNuevoPedidoCantidad(
                                      Number(e.target.value) || 1
                                  )
                              }
                              className="w-full border rounded px-2 py-1.5 text-sm"
                          />
                        </div>

                        {orderFormError && (
                            <p className="text-[11px] text-red-600">
                              {orderFormError}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full mt-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold"
                        >
                          Guardar pedido (solo front)
                        </button>
                      </form>
                    </div>
                )}
                {/* Panel derecho con info por ventana */}
                <div className="w-80 border rounded-xl p-3 bg-white overflow-y-auto">
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
/*
import { useState, useEffect, useRef } from 'react';
import { MapViewTemporal } from '@/features/map/components';
import { ejecutarAlgoritmoDiario, type AlgoritmoResponse } from '@/services/algoritmoSemanal.service';
import { useAirportsForMap } from '@/features/map/hooks';

export function EnVivoPage() {

  const [dataCargada, setDataCargada] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [resultadoVentana, setResultadoVentana] = useState<AlgoritmoResponse | null>(null);

  // --------------------------------------
  // FORMATEAR FECHA A LOCAL yyyy-MM-ddTHH:mm:ss
  // --------------------------------------
  function toLocalIsoNoZ(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");

    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());     // <-- hora local REAL
    const min = pad(date.getMinutes());
    const s = pad(date.getSeconds());

    return `${y}-${m}-${d}T${h}:${min}:${s}`;
  }

  // --------------------------------------
  // HORA INICIAL = HORA LOCAL REAL DEL SISTEMA
  // --------------------------------------
  const [horaActual, setHoraActual] = useState(() => {
    const now = new Date();
    return toLocalIsoNoZ(now);
  });

  // Obtener estado de carga y refetch para forzar carga desde BD (useAirportsForMap está configurado con enabled: false)
  const { isLoading: airportsLoading, refetch: refetchAirports } = useAirportsForMap();

  // ===========================
  // AUTOMÁTICO
  // ===========================
  const [autoRun, setAutoRun] = useState(false);
  // Intervalo por defecto en tiempo real: 60s
  const [intervaloMs, setIntervaloMs] = useState(60000); // 60s por defecto

  const autoRunRef = useRef(false);
  autoRunRef.current = autoRun;

  const ejecutarReferencia = useRef<() => Promise<void>>(async () => {});

  // ===========================
  // 1) Carga de datos
  // ===========================
  // Nota: ya no usamos una sección de carga de archivos en esta vista; iniciamos
  // la operación día a día con el botón único.

  // ===========================
  // 2) Ejecutar una ventana
  // ===========================
  const ejecutarVentana = async () => {
    if (isRunning) return;

    setIsRunning(true);

    const request = {
      horaInicioSimulacion: horaActual,
      duracionSimulacionHoras: 1,
      usarBaseDatos: true,
      maxIteraciones: 800,
      tasaDestruccion: 0.3,
      habilitarUnitizacion: true
    };

    try {
      const resultado = await ejecutarAlgoritmoDiario(request);
      setResultadoVentana(resultado);

      // Refrescar aeropuertos tras recibir resultado para asegurar datos actualizados
      try {
        await refetchAirports();
      } catch (e) {
        console.warn('No se pudieron refrescar aeropuertos tras ejecutar ventana:', e);
      }

      // Avanzar la hora actual
      const inicio = new Date(horaActual);
      inicio.setHours(inicio.getHours() + 1);
      setHoraActual(toLocalIsoNoZ(inicio));
    } catch (e) {
      console.error("Error ejecutando ventana:", e);
      setAutoRun(false); // detener automático al fallar
    }

    setIsRunning(false);
  };

  // Guardar referencia de ejecutarVentana
  ejecutarReferencia.current = ejecutarVentana;

  // Iniciar operación día a día: marcar datos cargados, activar autoRun, refetch aeropuertos y ejecutar una ventana inmediata
  const iniciarOperacionDiaria = async () => {
    setDataCargada(true);
    setAutoRun(false);
    // Refrescar aeropuertos desde la BD para que el mapa pueda mostrarlos
    try {
      await refetchAirports();
    } catch (e) {
      console.warn('Advertencia: no se pudieron cargar los aeropuertos antes de iniciar la operación:', e);
    }

    // Ejecutar inmediatamente la primera ventana
    try {
      await ejecutarReferencia.current();
    } catch (e) {
      // En caso de error, detener autoRun
      console.error('Error iniciando operación día a día:', e);
      setAutoRun(false);
    }
  };

  // ===========================
  // Mecanismo del modo automático
  // ===========================
  useEffect(() => {
    if (!autoRun) return;

    const interval = setInterval(() => {
      // Evitar múltiples ejecuciones simultáneas
      if (!isRunning && autoRunRef.current) {
        ejecutarReferencia.current();
      }
    }, intervaloMs);

    return () => clearInterval(interval);
  }, [autoRun, intervaloMs, isRunning]);

  // ======================================================
  // FRONT
  // ======================================================
  return (
    <div className="h-full flex flex-col p-6">

      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        🔴 Simulación En Vivo
      </h1>
*/
      {/* Paso 1: iniciar Operación día a día */}
 /*     {!dataCargada && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. Ejecutar Operación día a día</h2>
          <p className="text-gray-600 mb-3">Inicia la operación día a día y ejecuta el algoritmo automáticamente.</p>

          <button
            onClick={iniciarOperacionDiaria}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Ejecutar Operación día a día
          </button>
        </div>
      )}
*/
      {/* Paso 2: ejecución */}
 /*     {dataCargada && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">2. Operaciones en tiempo real</h2>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={ejecutarVentana}
                disabled={isRunning || autoRun}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-medium"
              >
                {isRunning ? "Procesando..." : "Procesar siguiente ventana ➜"}
              </button>
*/
              {/* AUTO MODE */}
 /*             <label className="flex items-center gap-2">
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
                  onChange={(e) => setIntervaloMs(Number(e.target.value))}
                  className="border p-2 rounded w-32"
                  min={1000}
                />
              )}
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Hora actual de simulación: <strong>{horaActual}</strong>
            </p>
          </div>
*/
          {/* Mapa */}
 /*         <div className="flex-1 border rounded-xl overflow-hidden bg-gray-50">
            {resultadoVentana?.lineaDeTiempo && !airportsLoading ? (
              <MapViewTemporal resultado={resultadoVentana} /*initialTimeUnit="seconds" autoPlay*/ />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {airportsLoading
                  ? "Cargando aeropuertos..."
                  : "Aún no hay ventanas procesadas."}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}*/
