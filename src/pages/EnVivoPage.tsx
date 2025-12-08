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
import { MapViewEnVivo } from '@/features/map/components';
import {
  ejecutarAlgoritmoDiario,
  type AlgoritmoResponse,
  type LineaDeTiempoSimulacionDTO,
  type RutaProductoDTO,
  type EventoLineaDeTiempoVueloDTO
} from '@/services/algoritmoSemanal.service';
import { useAirportsForMap } from '@/features/map/hooks';
import { crearPedidoDiaADia } from '@/services/pedido.service';
import { toast } from '@/components/ui';
import { FileUploadPedidosDiaADia } from './components/FileUploadPedidosDiaADiaFINAL';
import {
  obtenerEstadoDatosNoDiario,
  type CargaDatosResponse,
  type EstadoDatosResponse
} from '@/services/cargaDatos.service';
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

  // Estados para carga de archivos
  const [archivosValidados, setArchivosValidados] = useState(false);
  const [resultadoCarga, setResultadoCarga] = useState<CargaDatosResponse | null>(null);
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosResponse | null>(null);

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
    const esPrimeraVentana = ventanas.length === 0;
    const request = {
      horaInicioSimulacion: horaInicioVentana,
      duracionSimulacionHoras: 1,
      usarBaseDatos: true,
      maxIteraciones: 800,
      tasaDestruccion: 0.3,
      habilitarUnitizacion: true,
      inicioOperacionDiaADia: esPrimeraVentana,
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

  // Manejar éxito de carga de archivos
  const handleFileImportSuccess = async (sessionId?: string) => {
    try {
      console.log('✅ Archivos de pedidos importados exitosamente', sessionId ? `(Session: ${sessionId})` : '');
      console.log('📊 Consultando estado de base de datos...');

      // Refetch de aeropuertos después de importar
      await refetchAirports();

      // Obtener estado de datos desde BD
      const estado = await obtenerEstadoDatosNoDiario();
      setEstadoDatos(estado);

      console.log('✅ Pedidos disponibles en BD:', estado.estadisticas);

      setArchivosValidados(true);

      // Crear resultado de carga para mostrar en UI
      setResultadoCarga({
        exito: true,
        mensaje: 'Archivos de pedidos cargados exitosamente',
        estadisticas: {
          pedidosCargados: estado.estadisticas.totalPedidos,
          pedidosCreados: estado.estadisticas.totalPedidos,
          pedidosFiltrados: 0,
          erroresParseo: 0,
          erroresArchivos: 0,
          duracionSegundos: 0,
        },
        tiempoInicio: new Date().toISOString(),
        tiempoFin: new Date().toISOString(),
      });

      toast.success(
        '¡Pedidos cargados!',
        `${estado.estadisticas.totalPedidos} pedidos disponibles en la base de datos`
      );
    } catch (err) {
      console.error('Error al consultar estado de datos:', err);
      toast.error(
        'Error al cargar pedidos',
        err instanceof Error ? err.message : 'Error desconocido'
      );
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

      // Notificación bonita
      toast.success(
          '¡Pedido creado exitosamente!',
          `Pedido #${nuevoId} registrado. Se asignará en la próxima ventana.`
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
            <div className="mb-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  1. Cargar Pedidos
                </h2>
                <p className="text-gray-600 mb-4">
                  Carga los archivos de pedidos desde tu equipo. Los datos se validarán.
                </p>

                {/* Sección de carga de archivos - Solo Pedidos */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
                  <FileUploadPedidosDiaADia
                    onValidationSuccess={handleFileImportSuccess}
                    onClear={() => {
                      setArchivosValidados(false);
                      setResultadoCarga(null);
                      setEstadoDatos(null);
                      console.log('[EnVivoPage] Archivos limpiados');
                    }}
                  />
                </div>

                {/* Divisor con "o" */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="text-sm font-medium text-gray-500">o</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Botón para usar datos existentes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    ¿Ya tienes datos en la base de datos?
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Si ya cargaste pedidos previamente o quieres usar los datos existentes,
                    puedes iniciar la operación directamente sin cargar archivos nuevos.
                  </p>
                  <button
                    onClick={iniciarOperacionDiaria}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Usar datos existentes y continuar
                  </button>
                </div>

                {/* Resultado de carga */}
                {resultadoCarga && archivosValidados && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                      <span className="text-xl">✓</span> Pedidos cargados exitosamente
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-700">Total de pedidos</p>
                        <p className="text-2xl font-bold text-green-900">
                          {resultadoCarga.estadisticas.pedidosCargados}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700">Estado</p>
                        <p className="text-lg font-semibold text-green-900">
                          Listos para procesar
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estado de la BD */}
                {estadoDatos && archivosValidados && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      📊 Estado de la base de datos
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700">Pedidos totales</p>
                        <p className="text-xl font-bold text-blue-900">
                          {estadoDatos.estadisticas.totalPedidos}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Aeropuertos</p>
                        <p className="text-xl font-bold text-blue-900">
                          {estadoDatos.estadisticas.totalAeropuertos}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de iniciar operación (solo visible si hay archivos validados) */}
              {archivosValidados && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    2. Iniciar Operación día a día
                  </h2>
                  <p className="text-gray-600 mb-3">
                    Los pedidos están listos. Inicia la operación día a día. Se ejecutará una ventana de 1h por vez.
                  </p>

                  <button
                    onClick={iniciarOperacionDiaria}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    ▶ Ejecutar Operación día a día
                  </button>
                </div>
              )}
            </div>
        )}

        {dataCargada && (
            <>
              {/* Botón oculto para ejecutar ventana (funcional en background) */}
              <div className="hidden">
                <button
                    onClick={ejecutarVentana}
                    disabled={isRunning || autoRun}
                >
                  {isRunning ? 'Procesando...' : 'Procesar siguiente ventana ➜'}
                </button>
              </div>

              {/* Panel Automático - flotante arriba a la izquierda */}
              <div className="absolute top-3 left-3 z-[1100] bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-xl px-4 py-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                      type="checkbox"
                      checked={autoRun}
                      onChange={(e) => setAutoRun(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Automático</span>
                  {autoRun && (
                    <input
                        type="number"
                        value={intervaloMs}
                        onChange={(e) => setIntervalMs(Number(e.target.value))}
                        className="ml-2 w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={1000}
                        placeholder="ms"
                    />
                  )}
                </label>
              </div>

              {/* Botón Registrar Pedido flotante en la esquina superior derecha */}
              <button
                  type="button"
                  onClick={() => setShowNewOrderPanel(true)}
                  className="absolute top-3 right-3 z-[1100] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xl"
              >
                + Registrar pedido
              </button>


              <div className="flex-1 relative min-h-0">
                {/* Mapa */}
                <div className="absolute inset-0 z-0 border rounded-xl overflow-hidden bg-gray-50">
                  {resultadoGlobalParaMapa && !airportsLoading ? (
                      <MapViewEnVivo
                          resultado={resultadoGlobalParaMapa}
                          initialTimeUnit="seconds"
                          autoPlay
                          onCompletedOrdersChange={setCompletedOrderIds}
                          currentRealTime={new Date(horaActual)}
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
                    <div className="absolute right-3 top-14 z-[1200] w-80 bg-white border border-gray-200 shadow-2xl rounded-xl p-4">
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
                {/* Panel con info por ventana - posicionado más abajo */}
                <div className="absolute bottom-3 left-3 z-40 w-80 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-2xl rounded-xl p-3 max-h-[40vh] overflow-y-auto">
                  <h3 className="font-semibold mb-2 text-sm">
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
