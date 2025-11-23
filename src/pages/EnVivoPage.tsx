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
import { FileUploadSection } from '@/features/simulation/components/FileUploadSection';
import { MapViewTemporal } from '@/features/map/components';
import { ejecutarAlgoritmoDiario } from '@/services/algoritmoSemanal.service';
import { useAirportsForMap } from '@/features/map/hooks';

export function EnVivoPage() {

  const [dataCargada, setDataCargada] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [resultadoVentana, setResultadoVentana] = useState<any | null>(null);
  
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

  const { airports, isLoading: airportsLoading } = useAirportsForMap();

  // ===========================
  // AUTOMÁTICO
  // ===========================
  const [autoRun, setAutoRun] = useState(false);
  const [intervaloMs, setIntervaloMs] = useState(5000); // 5s por defecto

  const autoRunRef = useRef(false);
  autoRunRef.current = autoRun;

  const ejecutarReferencia = useRef<() => Promise<void>>(async () => {});

  // ===========================
  // 1) Carga de datos
  // ===========================
  const handleFileImportSuccess = async () => {
    console.log("Archivos importados.");
    setDataCargada(true);
  };

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

      {/* Paso 1: cargar datos */}
      {!dataCargada && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">1. Cargar pedidos</h2>
          <p className="text-gray-600 mb-3">
            Sube archivos de pedidos para operar en tiempo real.
          </p>

          <FileUploadSection
            onValidationSuccess={handleFileImportSuccess}
            modoSimulacion="SEMANAL"
            horaInicio={horaActual}
            horaFin={horaActual}
          />
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
              <MapViewTemporal resultado={resultadoVentana} />
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
