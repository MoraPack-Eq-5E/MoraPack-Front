/**
 * EnVivoPage — versión compacta
 */

import { useState, useEffect, useRef } from "react";
import { ejecutarAlgoritmoDiario } from "@/services/algoritmoSemanal.service";
import { MapViewDiaADia } from "@/features/map/components/MapViewDiaADiaProps";
import { useAirportsForMap } from "@/features/map/hooks";

export function EnVivoPage() {

  const pad = (n: number) => String(n).padStart(2, "0");

  const toLocalIso = (date: Date) => {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}`;
  };

  const [horaSimulada, setHoraSimulada] = useState(() =>
    toLocalIso(new Date())
  );

  const [isRunning, setIsRunning] = useState(false);
  const [resultadoVentana, setResultadoVentana] = useState<any | null>(null);
  //const { airports, isLoading: airportsLoading } = useAirportsForMap();

  const [autoRun, setAutoRun] = useState(false);
  const [intervaloMs, setIntervaloMs] = useState(6000);

  const autoRunRef = useRef(false);
  autoRunRef.current = autoRun;

  const ejecutarRef = useRef<() => Promise<void>>(async () => {});

  const { isLoading: airportsLoading, refetch: refetchAirports } = useAirportsForMap();
  // -------------------------------
  // Ejecutar ventana de 1h
  // -------------------------------
  const ejecutarVentana = async () => {
    if (isRunning) return;

    setIsRunning(true);
    await refetchAirports();

    const request = {
      horaInicioSimulacion: horaSimulada,
      duracionSimulacionHoras: 1,
      usarBaseDatos: true,
      maxIteraciones: 800,
      tasaDestruccion: 0.3,
      habilitarUnitizacion: true,
    };

    try {
      const res = await ejecutarAlgoritmoDiario(request);
      setResultadoVentana(res);

      const t = new Date(horaSimulada);
      t.setHours(t.getHours() + 1);
      setHoraSimulada(toLocalIso(t));
    } catch (err) {
      console.error("Error ejecutando ventana:", err);
      setAutoRun(false);
    }

    setIsRunning(false);
  };

  ejecutarRef.current = ejecutarVentana;

  // -------------------------------
  // Auto-run
  // -------------------------------
  useEffect(() => {
    if (!autoRun) return;

    const timer = setInterval(() => {
      if (!isRunning && autoRunRef.current) ejecutarRef.current();
    }, intervaloMs);

    return () => clearInterval(timer);
  }, [autoRun, intervaloMs, isRunning]);

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="h-full flex flex-col p-3">

      {/* Header compactado */}
      <h1 className="text-xl font-semibold text-gray-900 mb-2">
        🔴 En Vivo — Operación Día a Día
      </h1>

      {/* Controles compactos */}
      <div className="mb-3 bg-white border rounded-lg p-3 flex items-center gap-4">

        <button
          onClick={ejecutarVentana}
          disabled={isRunning || autoRun}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isRunning ? "Procesando..." : "Siguiente ventana →"}
        </button>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
          />
          Automático
        </label>

        {autoRun && (
          <input
            type="number"
            value={intervaloMs}
            min={1000}
            onChange={(e) => setIntervaloMs(Number(e.target.value))}
            className="border p-1 rounded w-24 text-sm"
          />
        )}

        <span className="text-sm text-gray-600 ml-auto">
          ⏱ Hora simulada: <strong>{horaSimulada}</strong>
        </span>
      </div>

      {/* Mapa más grande */}
      <div className="flex-1 border rounded-xl overflow-hidden">
        {resultadoVentana?.lineaDeTiempo && !airportsLoading ? (
          <MapViewDiaADia resultado={resultadoVentana} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            {airportsLoading ? "Cargando aeropuertos..." : "Sin ventanas procesadas todavía."}
          </div>
        )}
      </div>
    </div>
  );
}
