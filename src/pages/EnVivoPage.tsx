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
/*import {
  obtenerEstadoDatosNoDiario
} from '@/services/cargaDatos.service';*/

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
  // Helper para convertir Date a string ISO local
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

  const [isRunning, setIsRunning] = useState(false);

  // Estados para carga de archivos
  const [archivosValidados, setArchivosValidados] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);

  // Tiempo real que se actualiza cada segundo
  const [horaActual, setHoraActual] = useState(() => {
    const now = new Date();
    return toLocalIsoNoZ(now);
  });

  const [ventanas, setVentanas] = useState<VentanaSimulacion[]>([]);
  const [timelineGlobal, setTimelineGlobal] =
      useState<LineaDeTiempoSimulacionDTO | null>(null);

  // modo automático
  const [autoRun, setAutoRun] = useState(false);
  const [intervaloMs, setIntervalMs] = useState(3600000); // 1 hora = 3600000 ms
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

  // Actualizar horaActual cada segundo para reflejar tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setHoraActual(toLocalIsoNoZ(now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
      // estado = await obtenerEstadoDatosNoDiario();

      //console.log('✅ Pedidos disponibles en BD:', estado.estadisticas);

      setArchivosValidados(true);

      toast.success(
          '¡Pedidos cargados!',
          //`${estado.estadisticas.totalPedidos} pedidos disponibles. Iniciando operación en tiempo real...`
      );

      // Cerrar modal automáticamente
      setShowFileUploadModal(false);

      // Ejecutar automáticamente la primera ventana
      console.log('🚀 Ejecutando primera ventana automáticamente...');
      await iniciarOperacionDiaria();
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
    setAutoRun(true);
    setVentanas([]);
    setTimelineGlobal(null);

    // Actualizar hora actual al momento exacto de inicio
    const now = new Date();
    setHoraActual(toLocalIsoNoZ(now));

    try {
      await refetchAirports();
    } catch (e) {
      console.warn(
          'Advertencia: no se pudieron cargar los aeropuertos antes de iniciar la operación:',
          e
      );
    }

    console.log('⏰ Iniciando primera ventana en tiempo real:', toLocalIsoNoZ(now));
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
      // Calcular la hora de inicio de la siguiente ventana
      let horaSiguienteVentana = ventanas.length > 0
          ? ventanas[ventanas.length - 1].horaFin
          : horaActual;
      const fecha = new Date(horaSiguienteVentana);
      fecha.setMinutes(fecha.getMinutes() + 2);
      horaSiguienteVentana = toLocalIsoNoZ(fecha);
      const nuevoId = await crearPedidoDiaADia({
        aeropuertoDestinoCodigo: destinoCodigo.trim().toUpperCase(),
        cantidadProductos: cantidad,
        fechaPedido: horaSiguienteVentana,
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
  const emptyResultado: AlgoritmoResponse = {
    exito: true,
    mensaje: 'Sin datos aún',
    tiempoInicioEjecucion: horaActual,
    tiempoFinEjecucion: horaActual,
    tiempoEjecucionSegundos: 0,
    totalPedidos: 0,
    pedidosAsignados: 0,
    pedidosNoAsignados: 0,
    totalProductos: 0,
    productosAsignados: 0,
    productosNoAsignados: 0,
  };
  // -------------- RENDER --------------
  return (
      <div className="h-full flex flex-col relative">
        {/* Mapa visible inmediatamente - sin condición */}
        <div className="flex-1 relative min-h-0">
          <div className="absolute inset-0 z-0 bg-gray-50">
            {airportsLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Cargando aeropuertos...
                </div>
            ) : (
                <MapViewEnVivo
                    // si ya hay ventanas, usa el resultado real; si no, usa el vacío
                    resultado={(resultadoGlobalParaMapa ?? emptyResultado) as AlgoritmoResponse}
                    initialTimeUnit="seconds"
                    autoPlay={!!resultadoGlobalParaMapa} // solo autoPlay cuando ya hay timeline
                    onCompletedOrdersChange={setCompletedOrderIds}
                    currentRealTime={new Date(horaActual)}
                />
            )}
          </div>

          {/* Botón flotante para cargar archivos - Centro superior */}
          {!archivosValidados && ventanas.length === 0 && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1100]">
                <button
                    onClick={() => setShowFileUploadModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all flex items-center gap-3 animate-pulse"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Cargar Archivo de Pedidos
                </button>
              </div>
          )}

          {/* Indicador de tiempo real - Centro superior (aparece después de cargar) */}
          {archivosValidados && (
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1100] bg-white/95 backdrop-blur-sm border-2 border-teal-500 shadow-xl rounded-2xl px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-600 mb-0.5">Operación en Tiempo Real</div>
                    <div className="text-2xl font-bold text-teal-700 font-mono">
                      {new Date(horaActual).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Panel Automático - flotante arriba a la izquierda */}
          {archivosValidados && (
              <div className="absolute top-6 left-6 z-[1100] bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-xl px-4 py-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                      type="checkbox"
                      checked={autoRun}
                      onChange={(e) => setAutoRun(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Ventanas Automáticas</span>
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
          )}

          {/* Botón Registrar Pedido flotante en la esquina superior derecha */}
          {archivosValidados && (
              <button
                  type="button"
                  onClick={() => setShowNewOrderPanel(true)}
                  className="absolute top-6 right-6 z-[1100] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xl"
              >
                + Registrar pedido
              </button>
          )}

          {/* Modal de carga de archivos */}
          {showFileUploadModal && (
              <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white">Cargar Pedidos</h2>
                      <button
                          onClick={() => setShowFileUploadModal(false)}
                          className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-600 mb-6">
                      Carga el archivo de pedidos para iniciar la operación en tiempo real.
                      El sistema procesará los pedidos y ejecutará la primera ventana automáticamente.
                    </p>

                    <FileUploadPedidosDiaADia
                        onValidationSuccess={handleFileImportSuccess}
                        onClear={() => {
                          setArchivosValidados(false);
                          console.log('[EnVivoPage] Archivos limpiados');
                        }}
                    />

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                          </svg>
                          ¿Ya tienes datos en la base de datos?
                        </h3>
                        <p className="text-sm text-blue-700 mb-4">
                          Si ya cargaste pedidos previamente, puedes iniciar la operación directamente.
                        </p>
                        <button
                            onClick={() => {
                              setShowFileUploadModal(false);
                              iniciarOperacionDiaria();
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          Usar datos existentes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          )}

          {/* Panel flotante para registrar pedidos manuales */}
          {showNewOrderPanel && (
              <div className="absolute right-6 top-20 z-[1200] w-80 bg-white border border-gray-200 shadow-2xl rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 text-sm">
                    Registrar pedido (operación diaria)
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
                        placeholder="Ej: LIM, CUZ"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        disabled={isSavingPedido}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cantidad de productos
                    </label>
                    <input
                        type="number"
                        value={cantidadProductos}
                        onChange={(e) => setCantidadProductos(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ej: 10"
                        min={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        disabled={isSavingPedido}
                    />
                  </div>

                  {pedidoError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                        {pedidoError}
                      </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => setShowNewOrderPanel(false)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={isSavingPedido}
                    >
                      Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSavingPedido}
                    >
                      {isSavingPedido ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>

                {ultimoPedidoId && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700">
                      ✅ Último pedido creado: #{ultimoPedidoId}
                    </div>
                )}
              </div>
          )}

          {/* Panel con info por ventana - posicionado abajo a la izquierda */}
          {ventanas.length > 0 && (
              <div className="absolute bottom-6 left-6 z-[1100] w-80 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-xl p-3 max-h-[40vh] overflow-y-auto">
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
                        <div className="text-[10px] text-gray-600">
                          {new Date(v.horaInicio).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} — {new Date(v.horaFin).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
                          <strong className={allDelivered ? 'text-green-600' : 'text-amber-600'}>
                            {pedidosCompletadosVentana}/{totalPedidosVentana} pedidos
                          </strong>
                        </div>
                      </div>
                  );
                })}
              </div>
          )}
        </div>
      </div>
  );
}

export default EnVivoPage;
