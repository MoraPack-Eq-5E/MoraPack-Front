/**
 * EnVivoPage – con Modo Automático
 *
 * Simulación en tiempo real usando /api/algoritmo/diario
 * Flujo:
 * 1. Cargar pedidos
 * 2. Ejecutar ventanas manual o automáticamente
 * 3. Mostrar resultados por ventana
 */

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

      {/* Paso 1: iniciar Operación día a día */}
      {!dataCargada && (
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

      {/* Paso 2: ejecución */}
      {dataCargada && (
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

              {/* AUTO MODE */}
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

          {/* Mapa */}
          <div className="flex-1 border rounded-xl overflow-hidden bg-gray-50">
            {resultadoVentana?.lineaDeTiempo && !airportsLoading ? (
              <MapViewTemporal resultado={resultadoVentana} initialTimeUnit="seconds" autoPlay />
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
}
