/**
 * SimulacionPage - ACTUALIZADO PARA ESCENARIO SEMANAL
 * 
 * Página con flujo de 3 pasos siguiendo frontend.md:
 * 1. Cargar pedidos desde archivos a BD (POST /api/datos/cargar-pedidos)
 * 2. Ejecutar algoritmo semanal (POST /api/algoritmo/semanal)
 * 3. Consultar y visualizar resultados (GET /api/consultas/*)
 */

import { useState } from 'react';
import { FileUploadSection } from '@/features/simulation/components/FileUploadSection';
import { cargarPedidos, obtenerEstadoDatos, type CargaDatosResponse, type EstadoDatosResponse } from '@/services/cargaDatos.service';
import { ejecutarAlgoritmoSemanal, type AlgoritmoRequest, type AlgoritmoResponse } from '@/services/algoritmoSemanal.service';
import { consultarEstadisticasAsignacion, consultarVuelos, consultarPedidos } from '@/services/consultas.service';
import { MapViewTemporal } from '@/features/map/components';
import { useAirportsForMap } from '@/features/map/hooks';

type SimulationStep = 'load-data' | 'config' | 'running' | 'results';

export function SimulacionPage() {
  const [currentStep, setCurrentStep] = useState<SimulationStep>('load-data');
  
  // Estado de carga de datos
  const [dataCargada, setDataCargada] = useState(false);
  const [resultadoCarga, setResultadoCarga] = useState<CargaDatosResponse | null>(null);
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosResponse | null>(null);
  
  // Estado del algoritmo
  const [resultadoAlgoritmo, setResultadoAlgoritmo] = useState<AlgoritmoResponse | null>(null);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook para obtener aeropuertos
  const { isLoading: airportsLoading, refetch: refetchAirports } = useAirportsForMap();
  
  // Configuración del algoritmo semanal (simplificada)
  const [config, setConfig] = useState<AlgoritmoRequest>({
    horaInicioSimulacion: '2025-01-02T00:00:00',
    duracionSimulacionDias: 7,
    usarBaseDatos: true,
    // Parámetros fijos optimizados (no configurables por usuario)
    maxIteraciones: 1000,
    tasaDestruccion: 0.3,
    habilitarUnitizacion: true,
  });
  
  // ==================== PASO 1: CARGA DE DATOS ====================
  
  const handleFileImportSuccess = async (sessionId?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Los archivos ya fueron importados a BD por FileUploadSection
      // Solo necesitamos consultar el estado
      console.log('✅ Archivos importados exitosamente', sessionId ? `(Session: ${sessionId})` : '');
      console.log('📊 Consultando estado de base de datos...');
      
      // IMPORTANTE: Refetch de aeropuertos después de importar
      await refetchAirports();
      
      // Obtener estado de datos desde BD
      const estado = await obtenerEstadoDatos();
      setEstadoDatos(estado);
      setDataCargada(true);
      
      console.log('✅ Datos disponibles en BD:', estado.estadisticas);
      
      // Crear un resultado simulado para mostrar en la UI
      setResultadoCarga({
        exito: true,
        mensaje: 'Archivos cargados exitosamente desde tu equipo',
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
      
    } catch (err) {
      console.error('❌ Error consultando datos:', err);
      setError(err instanceof Error ? err.message : 'Error al consultar datos');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCargarDatosSinArchivos = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📥 Cargando pedidos desde directorio del servidor...');
      
      // IMPORTANTE: Refetch de aeropuertos por si fueron cargados en el servidor
      await refetchAirports();
      
      const resultado = await cargarPedidos({
        horaInicio: config.horaInicioSimulacion,
        horaFin: calcularHoraFin(config.horaInicioSimulacion!, config.duracionSimulacionDias!),
      });
      
      setResultadoCarga(resultado);
      setDataCargada(true);
      
      // Obtener estado de datos
      const estado = await obtenerEstadoDatos();
      setEstadoDatos(estado);
      
      console.log('✅ Datos cargados:', resultado.estadisticas);
      
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleContinueToConfig = () => {
    setCurrentStep('config');
    setError(null);
  };
  
  // ==================== PASO 2: EJECUTAR ALGORITMO ====================
  
  const handleStartSimulation = async () => {
    setIsLoading(true);
    setError(null);
    setCurrentStep('running');
    
    try {
      console.log('🚀 Ejecutando algoritmo semanal...');
      console.log('Configuración:', config);
      
      const resultado = await ejecutarAlgoritmoSemanal(config);
      
      setResultadoAlgoritmo(resultado);
      
      console.log('✅ Algoritmo completado:', {
        productosAsignados: resultado.totalProductos,
        costoTotal: resultado.costoTotal,
        segundosEjecucion: resultado.tiempoEjecucionSegundos,
      });
      
      // Esperar un momento para que se persistan los datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCurrentStep('results');
      
    } catch (err) {
      console.error('❌ Error ejecutando algoritmo:', err);
      setError(err instanceof Error ? err.message : 'Error al ejecutar algoritmo');
      setCurrentStep('config');
    } finally {
      setIsLoading(false);
    }
  };
  
  // ==================== PASO 3: CONSULTAR RESULTADOS ====================
  
  const handleVerResultados = async () => {
    try {
      // Consultar estadísticas finales
      const estadisticas = await consultarEstadisticasAsignacion();
      const vuelos = await consultarVuelos();
      const pedidos = await consultarPedidos();
      
      console.log('📊 Resultados consultados:', {
        estadisticas,
        totalVuelos: vuelos.totalVuelos,
        totalPedidos: pedidos.totalPedidos,
      });
    } catch (err) {
      console.error('Error consultando resultados:', err);
    }
  };
  
  // Función para reiniciar la simulación (actualmente no usada en UI)
  // Se puede agregar como botón flotante en el mapa si se necesita
  // const handleRestart = () => {
  //   setCurrentStep('load-data');
  //   setDataCargada(false);
  //   setResultadoCarga(null);
  //   setEstadoDatos(null);
  //   setResultadoAlgoritmo(null);
  //   setError(null);
  // };
  
  // ==================== UTILIDADES ====================
  
  function calcularHoraFin(horaInicio: string, dias: number): string {
    const fecha = new Date(horaInicio);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().slice(0, 19);
  }

  function formatearFechaLegible(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // ==================== RENDER ====================
  
  return (
    <div className="h-full flex flex-col">
      {/* Step indicator - Oculto cuando estamos en resultados */}
      {currentStep !== 'results' && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <StepIndicator
              number={1}
              title="Cargar Datos"
              isActive={currentStep === 'load-data'}
              isCompleted={currentStep !== 'load-data'}
            />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full bg-blue-600 transition-all ${
                currentStep !== 'load-data' ? 'w-full' : 'w-0'
              }`} />
            </div>
            
            <StepIndicator
              number={2}
              title="Configurar"
              isActive={currentStep === 'config'}
              isCompleted={currentStep === 'running'}
            />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full bg-blue-600 transition-all ${
                currentStep === 'running' ? 'w-full' : 'w-0'
              }`} />
            </div>
            
            <StepIndicator
              number={3}
              title="Ejecutar"
              isActive={currentStep === 'running'}
              isCompleted={false}
            />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full bg-gray-200 transition-all w-0`} />
            </div>
            
            <StepIndicator
              number={4}
              title="Resultados"
              isActive={false}
              isCompleted={false}
            />
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {currentStep === 'load-data' && (
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Paso 1: Cargar Pedidos a Base de Datos
            </h2>
            <p className="text-gray-600 mb-6">
              Carga archivos de pedidos desde tu equipo o usa los archivos del servidor
            </p>
            
            {/* Configuración de ventana de tiempo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Ventana de Tiempo - Escenario Semanal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Fecha de inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={config.horaInicioSimulacion?.slice(0, 16)}
                    onChange={(e) => setConfig({ ...config, horaInicioSimulacion: e.target.value + ':00' })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Duración (días)
                  </label>
                  <input
                    type="number"
                    value={config.duracionSimulacionDias}
                    onChange={(e) => setConfig({ ...config, duracionSimulacionDias: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min={1}
                    max={30}
                  />
                  <p className="text-xs text-blue-700 mt-1">
                    Se cargarán pedidos desde <strong>{formatearFechaLegible(config.horaInicioSimulacion!)}</strong> hasta <strong>{formatearFechaLegible(calcularHoraFin(config.horaInicioSimulacion!, config.duracionSimulacionDias!))}</strong>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Opción 1: Importar archivos */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Opción 1: Subir archivos desde tu equipo</h3>
            <FileUploadSection 
              onValidationSuccess={handleFileImportSuccess} 
              horaInicio={config.horaInicioSimulacion}
              horaFin={calcularHoraFin(config.horaInicioSimulacion!, config.duracionSimulacionDias!)}
            />
            </div>
            
            {/* Opción 2: Usar archivos del servidor */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Opción 2: Usar archivos del servidor</h3>
              <p className="text-sm text-gray-600 mb-3">
                Carga pedidos desde el directorio <code className="bg-gray-100 px-2 py-1 rounded">data/</code> del servidor
              </p>
              <button
                onClick={handleCargarDatosSinArchivos}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 font-medium"
              >
                {isLoading ? 'Cargando...' : 'Cargar desde servidor'}
              </button>
            </div>
            
            {/* Resultado de carga */}
            {resultadoCarga && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-900 mb-2">✓ Datos cargados exitosamente</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-green-700">Pedidos cargados</p>
                    <p className="text-2xl font-bold text-green-900">{resultadoCarga.estadisticas.pedidosCargados}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Pedidos creados</p>
                    <p className="text-2xl font-bold text-green-900">{resultadoCarga.estadisticas.pedidosCreados}</p>
                  </div>
                  <div>
                    <p className="text-green-700">Duración</p>
                    <p className="text-2xl font-bold text-green-900">{resultadoCarga.estadisticas.duracionSegundos}s</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Estado de la BD */}
            {estadoDatos && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Estado actual de la base de datos</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Aeropuertos</p>
                    <p className="text-lg font-semibold text-gray-900">{estadoDatos.estadisticas.totalAeropuertos}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total pedidos</p>
                    <p className="text-lg font-semibold text-gray-900">{estadoDatos.estadisticas.totalPedidos}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pendientes</p>
                    <p className="text-lg font-semibold text-gray-900">{estadoDatos.estadisticas.pedidosPendientes}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Solo mostrar error si NO hay datos cargados */}
            {error && !dataCargada && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* Botón de continuar - aparece cuando hay datos cargados */}
            <div className="flex gap-3">
              {dataCargada && (
                <button
                  onClick={handleContinueToConfig}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <span>Continuar a configuración</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        
        {currentStep === 'config' && (
          <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Paso 2: Configurar Algoritmo Semanal
            </h2>
            <p className="text-gray-600 mb-6">
              Ajusta los parámetros del algoritmo ALNS para el escenario semanal (7 días)
            </p>
            
            {resultadoCarga && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ {resultadoCarga.estadisticas.pedidosCargados} pedidos listos para optimización
                </p>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">📊 Configuración del Algoritmo</h3>
              <p className="text-sm text-blue-800">
                El algoritmo ALNS usa parámetros optimizados automáticamente:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                <li><strong>Iteraciones:</strong> 1000 (óptimo para 7 días)</li>
                <li><strong>Tasa de destrucción:</strong> 0.3 (balance exploración/explotación)</li>
                <li><strong>Unitización:</strong> Habilitada (división automática de cargas)</li>
              </ul>
            </div>
            
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ El escenario semanal puede tardar entre <strong>30-90 minutos</strong> en completarse.
                Por favor, mantén esta ventana abierta.
              </p>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setCurrentStep('load-data')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                ← Volver
              </button>
              
              <button
                onClick={handleStartSimulation}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 font-medium"
              >
                {isLoading ? 'Iniciando...' : 'Ejecutar algoritmo semanal 🚀'}
              </button>
            </div>
          </div>
        )}
        
        {currentStep === 'running' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ejecutando Algoritmo ALNS Semanal...
              </h2>
              <p className="text-gray-600 mb-4">
                Optimizando rutas para {config.duracionSimulacionDias} días de pedidos.
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Configuración: {config.maxIteraciones} iteraciones, destrucción {config.tasaDestruccion}
              </p>
              <p className="text-sm text-yellow-600 font-medium">
                Esto puede tardar 30-90 minutos. Por favor espera...
              </p>
            </div>
          </div>
        )}
        
        {currentStep === 'results' && resultadoAlgoritmo && (
          <div className="h-full flex flex-col">
            {/* Header de métricas - ELIMINADO para dar más espacio al mapa */}
            
            {/* Mapa a pantalla completa */}
            <div className="flex-1 overflow-hidden">
              {resultadoAlgoritmo?.lineaDeTiempo && !airportsLoading ? (
                <MapViewTemporal 
                  resultado={resultadoAlgoritmo}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center p-8 max-w-xl">
                    {airportsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Cargando aeropuertos...
                        </h3>
                        <p className="text-gray-600">
                          Preparando visualización del mapa
                        </p>
                      </>
                    ) : !resultadoAlgoritmo?.lineaDeTiempo ? (
                      <>
                        <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Timeline no disponible
                </h3>
                <p className="text-gray-600 mb-4">
                          El algoritmo completó, pero no retornó el timeline de simulación.
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
                          <p className="text-sm text-yellow-900 mb-2">
                            <strong>Posibles causas:</strong>
                          </p>
                          <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                            <li>El backend no generó eventos de vuelo</li>
                            <li>No hay vuelos asignados en el resultado</li>
                            <li>El campo <code className="bg-yellow-100 px-1 rounded">lineaDeTiempo</code> es null</li>
                          </ul>
                        </div>
                <button
                  onClick={handleVerResultados}
                          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                          Ver Detalles en Consola
                </button>
                      </>
                    ) : null}
                  </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}

function StepIndicator({ number, title, isActive, isCompleted }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
        isCompleted 
          ? 'bg-green-600 text-white'
          : isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-600'
      }`}>
        {isCompleted ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`text-sm font-medium mt-2 ${
        isActive ? 'text-blue-600' : 'text-gray-600'
      }`}>
        {title}
      </span>
    </div>
  );
}

// Export default para lazy loading
export default SimulacionPage;
