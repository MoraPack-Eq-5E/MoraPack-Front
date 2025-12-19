import { useState } from 'react';
import { ReporteResultados } from '@/features/simulation/components';
import { FileUploadSectionColapso } from '@/features/simulation/components/FileUploadSectionColapso';
import { 
  detectarPuntoColapso,
  recortarTimelineHastaColapso,
  type ColapsoRequest, 
  type AlgoritmoResponse,
  type PuntoColapso
} from '@/services/algoritmoSemanal.service';
import { ejecutarAlgoritmoColapsoInMem } from '@/services/algoritmoSemanal.service'; 
import { MapViewTemporal } from '@/features/map/components';
import { AlertCircle, Clock, Play, Calendar, Info, RefreshCcw } from 'lucide-react';

export function ColapsoPage() {
  // --- ESTADOS ---
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Setup, 2: Resultados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ CAMBIO 1: Estado para el ID de sesión (Ticket de la RAM)
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [config, setConfig] = useState<ColapsoRequest>({
    sessionId: '',
    horaInicioSimulacion: '2025-12-12T00:00:00',
  });

  const [resultadoSimulacion, setResultadoSimulacion] = useState<AlgoritmoResponse | null>(null);
  const [puntoColapso, setPuntoColapso] = useState<PuntoColapso | null>(null);


  // --- MANEJADORES --

  // ✅ CAMBIO 2: Lógica de ejecución simplificada (Sin archivos, solo JSON)
  const handleEjecutarColapso = async () => {
    if (!sessionId) {
      setError("Primero debes validar los archivos para obtener una sesión.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Ya no creamos FormData porque los archivos ya están en el servidor (RAM)
      // Mandamos el DTO de petición que espera el Back
      const requestPayload = {
        sessionId: sessionId,
        horaInicioSimulacion: config.horaInicioSimulacion
      };

      const res = await ejecutarAlgoritmoColapsoInMem(requestPayload);
      
      const colapso = detectarPuntoColapso(res);
      setPuntoColapso(colapso);

      if (colapso) {
        const timelineRecortado = recortarTimelineHastaColapso(res.lineaDeTiempo, colapso.fechaColapso);
        setResultadoSimulacion({ ...res, lineaDeTiempo: timelineRecortado });
      } else {
        setResultadoSimulacion(res);
      }

      setCurrentStep(2); // Ir a resultados
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al procesar el colapso.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* CABECERA */}
      <div className="bg-white border-b border-gray-200 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={28} /> 
              Analizador de Colapso Logístico
            </h1>
            <p className="text-gray-500">Configuración de estrés y detección de quiebre en RAM</p>
          </div>
          {currentStep === 2 && (
            <button 
              onClick={() => { setCurrentStep(1); setResultadoSimulacion(null);}}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 transition-all"
            >
              <RefreshCcw size={18} /> Nuevo Análisis
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* INDICADOR DE PASOS SIMPLIFICADO */}
        <div className="mb-10 flex justify-center gap-16">
          <div className={`flex items-center gap-3 ${currentStep === 1 ? 'text-red-600' : 'text-green-600'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 1 ? 'bg-red-600 text-white ring-4 ring-red-100' : 'bg-green-600 text-white'}`}>
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span className="font-bold uppercase tracking-tight">Configuración</span>
          </div>
          <div className="h-0.5 w-12 bg-gray-200 self-center" />
          <div className={`flex items-center gap-3 ${currentStep === 2 ? 'text-red-600' : 'text-gray-300'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${currentStep === 2 ? 'bg-red-600 text-white ring-4 ring-red-100' : 'bg-white border-2 border-gray-200'}`}>
              2
            </div>
            <span className="font-bold uppercase tracking-tight">Resultados</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 rounded-xl">
            <AlertCircle className="shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* --- PASO 1: SETUP (FECHA + ARCHIVOS) --- */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Columna Izquierda: Parámetros */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Calendar className="text-red-600" size={20} /> Ventana de Tiempo
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fecha de Inicio del Test</label>
                    <input 
                      type="datetime-local" 
                      className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-500 outline-none transition-all font-medium text-gray-700"
                      // Aseguramos que el valor tenga exactamente 16 caracteres para el input
                      value={(config.horaInicioSimulacion || '').substring(0, 16)}
                      onChange={(e) => {
                        const val = e.target.value; // Esto viene como YYYY-MM-DDTHH:mm
                        if (!val) return;
                        
                        setConfig({
                            ...config, 
                            // Le agregamos :00 para que el backend reciba un LocalDateTime válido
                            horaInicioSimulacion: `${val}:00` 
                        });
                     }}
                    />
                    <p className="text-[10px] text-gray-400 mt-2">Los pedidos previos a esta fecha serán ignorados.</p>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleEjecutarColapso}
                    disabled={isLoading}
                    className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-lg hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-100 disabled:bg-gray-200 disabled:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        PROCESANDO...
                      </>
                    ) : (
                      <><Play fill="currentColor" size={20} /> EJECUTAR TEST</>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                <Info className="text-blue-500 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Modo RAM:</strong> El sistema cargará los 107k pedidos de forma volátil para encontrar el quiebre sin afectar la base de datos principal.
                </p>
              </div>
            </div>

            {/* Columna Derecha: Archivos */}
            <div className="lg:col-span-8">
              <FileUploadSectionColapso
                onValidationSuccess={(id) => {
                  setSessionId(id);
                  setError(null);
                  console.log("Sesión de RAM lista:", id);
                }}
                onValidationError={(err) => setError(err)}
              />
            </div>
          </div>
        )}

        {/* --- PASO 2: RESULTADOS --- */}
        {currentStep === 2 && resultadoSimulacion && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            {puntoColapso && (
              <div className="bg-red-600 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border-b-8 border-red-800">
                <div className="flex items-center gap-4">
                  <AlertCircle size={40} className="animate-pulse" />
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Colapso Identificado</h2>
                    <p className="text-red-50 opacity-90">
                      El sistema falló el: <strong className="underline">{new Date(puntoColapso.fechaColapso).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
                <div className="bg-red-900/30 p-4 rounded-xl backdrop-blur-md border border-white/10 text-sm max-w-md">
                   <p className="font-bold uppercase text-[10px] mb-1 opacity-60">Causa Raíz:</p>
                   <p>{puntoColapso.motivo}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 h-[650px]">
                <MapViewTemporal resultado={resultadoSimulacion} />
              </div>
              <div className="xl:col-span-1 h-[650px] overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-gray-200">
                <ReporteResultados resultado={resultadoSimulacion} modoSimulacion="COLAPSO" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ColapsoPage;