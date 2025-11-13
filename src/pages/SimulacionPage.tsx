/**
 * SimulacionPage - ACTUALIZADO PARA ESCENARIO SEMANAL Y COLAPSO
 * 
 * Página con flujo de 3 pasos siguiendo frontend.md:
 * 1. Cargar pedidos desde archivos a BD (POST /api/datos/cargar-pedidos)
 * 2. Ejecutar algoritmo semanal (POST /api/algoritmo/semanal)
 * 3. Consultar y visualizar resultados (GET /api/consultas/*)
 */

import { useState } from 'react';
import { FileUploadSection } from '@/features/simulation/components/FileUploadSection';
import { cargarPedidos, obtenerEstadoDatos, type CargaDatosResponse, type EstadoDatosResponse } from '@/services/cargaDatos.service';
import { ejecutarAlgoritmoSemanal, 
  ejecutarAlgoritmoColapso,
  type AlgoritmoRequest, type AlgoritmoResponse,
  type ResultadoColapsoDTO
} from '@/services/algoritmoSemanal.service';
import { consultarEstadisticasAsignacion, consultarVuelos, consultarPedidos } from '@/services/consultas.service';
import { MapViewTemporal } from '@/features/map/components';
import { useAirportsForMap } from '@/features/map/hooks';

type SimulationStep = 'load-data' | 'config' | 'running' | 'results';
type ModoSimulacion = 'SEMANAL' | 'COLAPSO';

export function SimulacionPage() {
  const [currentStep, setCurrentStep] = useState<SimulationStep>('load-data');
  const [modoSimulacion, setModoSimulacion] = useState<ModoSimulacion>('SEMANAL');

  // Estado de carga de datos
  const [dataCargada, setDataCargada] = useState(false);
  const [resultadoCarga, setResultadoCarga] = useState<CargaDatosResponse | null>(null);
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosResponse | null>(null);
  
  // Estado del algoritmo - ahora puede ser de ambos tipos
  const [resultadoAlgoritmo, setResultadoAlgoritmo] = useState<AlgoritmoResponse | 
        ResultadoColapsoDTO | null>(null);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Hook para obtener aeropuertos
  const { isLoading: airportsLoading } = useAirportsForMap();
  
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
    // setIsLoading(true);
    // setError(null);
    
    try {
      // Los archivos ya fueron importados a BD por FileUploadSection
      // Solo necesitamos consultar el estado
      console.log('✅ Archivos importados exitosamente', sessionId ? `(Session: ${sessionId})` : '');
      console.log('📊 Consultando estado de base de datos...');
      
      // Obtener estado de datos desde BD
      const estado = await obtenerEstadoDatos();
      setEstadoDatos(estado);
      
      
      console.log('✅ Datos disponibles en BD:', estado.estadisticas);
      
      setDataCargada(true);

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
      const resultado = await cargarPedidos({
        modo: modoSimulacion, // 'SEMANAL' o 'COLAPSO'
        horaInicio: modoSimulacion === 'SEMANAL' ? config.horaInicioSimulacion : undefined,
        horaFin:
        modoSimulacion === 'SEMANAL'
          ? calcularHoraFin(config.horaInicioSimulacion!, config.duracionSimulacionDias!)
          : undefined,
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
      console.log(`🚀 Ejecutando algoritmo en modo ${modoSimulacion}...`);
      console.log('Configuración:', config);
      
      let resultado;
      if (modoSimulacion === 'SEMANAL') {
        resultado = await ejecutarAlgoritmoSemanal(config);
      } else {
        // Modo COLAPSO
        resultado = await ejecutarAlgoritmoColapso(config);
      }
      
      setResultadoAlgoritmo(resultado);
      
      console.log(`✅ Algoritmo ${modoSimulacion} completado:`, {
        productosAsignados: 'productosAsignados' in resultado ? resultado.productosAsignados : 'N/A',
        pedidosAsignados: 'pedidosAsignados' in resultado ? resultado.pedidosAsignados : 'N/A',
        segundosEjecucion: 'tiempoEjecucionSegundos' in resultado ? resultado.tiempoEjecucionSegundos : resultado.duracionSegundos,
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
  
  const handleRestart = () => {
    setCurrentStep('load-data');
    setDataCargada(false);
    setResultadoCarga(null);
    setEstadoDatos(null);
    setResultadoAlgoritmo(null);
    setError(null);
  };
  // ==================== RENDERIZADO CONDICIONAL ======================================
  const renderResultadosSemanales = () => (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Resultados de Simulación Semanal
            </h2>
            
            {/* Métricas principales */}
            <div className="grid grid-cols-4 gap-4 mb-3">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-700">Productos Asignados</p>
                <p className="text-2xl font-bold text-green-900">
                  {('productosAsignados' in resultadoAlgoritmo!) ? resultadoAlgoritmo.productosAsignados : 'N/A'}
                </p>
                <p className="text-xs text-green-600">
                  {((('productosAsignados' in resultadoAlgoritmo!) ? resultadoAlgoritmo.productosAsignados : 0) / 
                    ('totalProductos' in resultadoAlgoritmo! ? resultadoAlgoritmo.totalProductos : 1) * 100).toFixed(1)}% de asignación
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700">Pedidos Procesados</p>
                <p className="text-2xl font-bold text-blue-900">
                  {('pedidosAsignados' in resultadoAlgoritmo!) ? resultadoAlgoritmo.pedidosAsignados : 0}
                </p>
                <p className="text-xs text-blue-600">
                  {('totalPedidos' in resultadoAlgoritmo! ? resultadoAlgoritmo.totalPedidos : 0)} total
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-700">Costo Total</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${('costoTotal' in resultadoAlgoritmo! ? resultadoAlgoritmo.costoTotal?.toFixed(2) : 0) || 0}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-700">Tiempo Ejecución</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor((('tiempoEjecucionSegundos' in resultadoAlgoritmo! ? resultadoAlgoritmo.tiempoEjecucionSegundos : 0) || 0) / 60)}m
                </p>
                <p className="text-xs text-gray-600">
                  {('tiempoEjecucionSegundos' in resultadoAlgoritmo! ? resultadoAlgoritmo.tiempoEjecucionSegundos : 0) || 0}s
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600">
              Simulación: {'horaInicioSimulacion' in resultadoAlgoritmo! && resultadoAlgoritmo.horaInicioSimulacion && 
                new Date(resultadoAlgoritmo.horaInicioSimulacion).toLocaleString()} - 
              {'horaFinSimulacion' in resultadoAlgoritmo! && resultadoAlgoritmo.horaFinSimulacion && 
                new Date(resultadoAlgoritmo.horaFinSimulacion).toLocaleString()}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleVerResultados}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Consultar detalles
            </button>
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Nueva simulación
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {'lineaDeTiempo' in resultadoAlgoritmo! && resultadoAlgoritmo.lineaDeTiempo && !airportsLoading ? (
          <MapViewTemporal 
            resultado={resultadoAlgoritmo as AlgoritmoResponse}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center p-8 max-w-xl">
              {/* Mismo contenido de loading/error que antes */}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderResultadosColapso = () => {
  const resultado = resultadoAlgoritmo as ResultadoColapsoDTO;
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              🚨 Resultados de Simulación por Colapso
            </h2>
            
            {/* Métricas principales de colapso */}
            <div className="grid grid-cols-4 gap-4 mb-3">
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-700">Pedidos Asignados</p>
                <p className="text-2xl font-bold text-green-900">{resultado.pedidosAsignados}</p>
                <p className="text-xs text-green-600">de {resultado.pedidosTotales} total</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-700">Almacenes Llenos</p>
                <p className="text-2xl font-bold text-red-900">{resultado.almacenesLlenos}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-700">Vuelos Saturados</p>
                <p className="text-2xl font-bold text-orange-900">{resultado.vuelosSaturados}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-700">Iteraciones</p>
                <p className="text-2xl font-bold text-purple-900">{resultado.iteracionesTotales}</p>
                <p className="text-xs text-purple-600">{resultado.duracionSegundos}s</p>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="bg-yellow-50 px-3 py-1 rounded-full">
                <span className="text-yellow-800 font-medium">Tipo de colapso: </span>
                <span className="text-yellow-900">{resultado.tipoColapso}</span>
              </div>
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-800 font-medium">Duración: </span>
                <span className="text-blue-900">{Math.floor(resultado.duracionSegundos / 60)}m {resultado.duracionSegundos % 60}s</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleVerResultados}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Consultar detalles
            </button>
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Nueva simulación
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {/* Sección del mapa - AHORA EN LA PARTE SUPERIOR */}
        {resultado.lineaDeTiempo && !airportsLoading ? (
          <div className="h-2/3 border-b border-gray-200">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                🗺️ Evolución de Rutas hasta el Colapso
              </h3>
              <p className="text-sm text-gray-600">
                Mostrando {resultado.lineaDeTiempo.totalEventos} eventos desde el inicio hasta la detección del colapso
              </p>
            </div>
            <div className="h-full">
              <MapViewTemporal 
                resultado={({
                  // Crear un objeto compatible con AlgoritmoResponse
                  exito: true,
                  mensaje: `Simulación de colapso: ${resultado.tipoColapso}`,
                  lineaDeTiempo: resultado.lineaDeTiempo,
                  // tiempos aproximados para cumplir la forma esperada por AlgoritmoResponse
                  tiempoInicioEjecucion: new Date().toISOString(),
                  tiempoFinEjecucion: new Date(Date.now() + (resultado.duracionSegundos || 0) * 1000).toISOString(),
                  tiempoEjecucionSegundos: resultado.duracionSegundos || 0,
                  // Campos numéricos/estadísticos que MapViewTemporal puede necesitar
                  totalProductos: resultado.pedidosAsignados,
                  totalPedidos: resultado.pedidosTotales,
                  productosAsignados: resultado.pedidosAsignados,
                  pedidosAsignados: resultado.pedidosAsignados,
                  costoTotal: 0,
                } as AlgoritmoResponse)}
              />
            </div>
          </div>
        ) : (
          <div className="h-2/3 flex items-center justify-center bg-gray-100 border-b border-gray-200">
            <div className="text-center p-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.927-6-2.445M12 6V4m0 0V4m0 0H8m4 0h4" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">No hay datos de timeline disponibles</p>
              <p className="text-sm text-gray-400">
                El colapso ocurrió antes de que se pudieran capturar eventos de simulación
              </p>
            </div>
          </div>
        )}
        
        {/* Sección de métricas y detalles - AHORA EN LA PARTE INFERIOR */}
        <div className="h-1/3 overflow-auto p-6">
          {/* Condiciones de colapso */}
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-3">🚨 Condiciones de Colapso Detectadas</h3>
            <ul className="space-y-2">
              {resultado.condicionesColapso.map((condicion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{condicion}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Bottlenecks */}
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-900 mb-3">📊 Cuellos de Botella Identificados</h3>
            <ul className="space-y-2">
              {resultado.bottlenecks.map((bottleneck, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>{bottleneck}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Métricas detalladas */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">📈 Métricas Detalladas del Colapso</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Iteración de detección:</span>
                <span className="ml-2 font-medium">{resultado.iteracionesTotales}</span>
              </div>
              <div>
                <span className="text-gray-600">Tasa de asignación:</span>
                <span className="ml-2 font-medium">
                  {((resultado.pedidosAsignados / resultado.pedidosTotales) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Duración total:</span>
                <span className="ml-2 font-medium">
                  {Math.floor(resultado.duracionSegundos / 60)}m {resultado.duracionSegundos % 60}s
                </span>
              </div>
              <div>
                <span className="text-gray-600">Eventos capturados:</span>
                <span className="ml-2 font-medium">
                  {resultado.lineaDeTiempo?.totalEventos || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
  // ==================== UTILIDADES ====================
  
  function calcularHoraFin(horaInicio: string, dias: number): string {
    const fecha = new Date(horaInicio);
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().slice(0, 19);
  }
  
  // ==================== RENDER PRINCIPAL ====================
  
  return (
    <div className="h-full flex flex-col">
      {/* Step indicator - Mismo que antes */}
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
            isCompleted={currentStep === 'running' || currentStep === 'results'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full bg-blue-600 transition-all ${
              currentStep === 'running' || currentStep === 'results' ? 'w-full' : 'w-0'
            }`} />
          </div>
          
          <StepIndicator
            number={3}
            title="Ejecutar"
            isActive={currentStep === 'running'}
            isCompleted={currentStep === 'results'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full bg-blue-600 transition-all ${
              currentStep === 'results' ? 'w-full' : 'w-0'
            }`} />
          </div>
          
          <StepIndicator
            number={4}
            title="Resultados"
            isActive={currentStep === 'results'}
            isCompleted={false}
          />
        </div>
      </div>
      
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
            
            {/* Selector de modo */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Modo de Simulación</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="modo"
                    value="SEMANAL"
                    checked={modoSimulacion === 'SEMANAL'}
                    onChange={() => setModoSimulacion('SEMANAL')}
                  />
                  <span>Escenario semanal (7 días)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="modo"
                    value="COLAPSO"
                    checked={modoSimulacion === 'COLAPSO'}
                    onChange={() => setModoSimulacion('COLAPSO')}
                  />
                  <span>Simulación por colapso (sin límite de tiempo)</span>
                </label>
              </div>
            </div>

            {/* Configuración de ventana de tiempo - solo para SEMANAL */}
            {modoSimulacion === 'SEMANAL' && (
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
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          horaInicioSimulacion: e.target.value + ':00',
                        })
                      }
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
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          duracionSimulacionDias: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={1}
                      max={30}
                    />
                    <p className="text-xs text-blue-700 mt-1">
                      Se cargarán pedidos desde {config.horaInicioSimulacion} hasta{' '}
                      {calcularHoraFin(
                        config.horaInicioSimulacion!,
                        config.duracionSimulacionDias!,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Para modo COLAPSO, mostrar información específica */}
            {modoSimulacion === 'COLAPSO' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-900 mb-2">🚨 Modo Colapso Activado</h3>
                <p className="text-sm text-red-800 mb-2">
                  El algoritmo se ejecutará hasta detectar condiciones de colapso en el sistema:
                </p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Almacenes llenos (capacidad ≥95%)</li>
                  <li>Vuelos saturados (capacidad ≥90%)</li>
                  <li>Pedidos críticos bloqueados</li>
                  <li>Rutas inviables</li>
                  <li>Congestión temporal</li>
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  Se cargarán <strong>todos los pedidos disponibles</strong> sin filtro de tiempo.
                </p>
              </div>
            )}

            {/* Opción 1: Importar archivos */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Opción 1: Subir archivos desde tu equipo</h3>
              <FileUploadSection 
                onValidationSuccess={handleFileImportSuccess} 
                horaInicio={modoSimulacion === 'SEMANAL' ? config.horaInicioSimulacion : undefined}
                horaFin={modoSimulacion === 'SEMANAL' ? 
                  calcularHoraFin(config.horaInicioSimulacion!, config.duracionSimulacionDias!) : undefined}
                modoSimulacion={modoSimulacion}
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
            
            {/* Error */}
            {error && !dataCargada && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* Botón de continuar */}
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
              Paso 2: Configurar Algoritmo {modoSimulacion === 'SEMANAL' ? 'Semanal' : 'por Colapso'}
            </h2>
            <p className="text-gray-600 mb-6">
              {modoSimulacion === 'SEMANAL' 
                ? 'Ajusta los parámetros del algoritmo ALNS para el escenario semanal (7 días)'
                : 'Configura los parámetros para la simulación de colapso del sistema'}
            </p>
            
            {resultadoCarga && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ {resultadoCarga.estadisticas.pedidosCargados} pedidos listos para optimización
                </p>
              </div>
            )}
            
            {/* Información específica del modo */}
            {modoSimulacion === 'SEMANAL' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">📊 Configuración del Algoritmo Semanal</h3>
                <p className="text-sm text-blue-800">
                  El algoritmo ALNS usa parámetros optimizados automáticamente:
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                  <li><strong>Iteraciones:</strong> 1000 (óptimo para 7 días)</li>
                  <li><strong>Tasa de destrucción:</strong> 0.3 (balance exploración/explotación)</li>
                  <li><strong>Unitización:</strong> Habilitada (división automática de cargas)</li>
                </ul>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-red-900 mb-2">🚨 Configuración del Algoritmo de Colapso</h3>
                <p className="text-sm text-red-800 mb-2">
                  El algoritmo ejecutará hasta detectar condiciones críticas del sistema:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                  <li><strong>Iteraciones máximas:</strong> 1000 (parada de seguridad)</li>
                  <li><strong>Monitoreo activo:</strong> Almacenes, vuelos, pedidos críticos</li>
                  <li><strong>Detección automática:</strong> Múltiples condiciones de colapso</li>
                  <li><strong>Análisis de bottlenecks:</strong> Identificación de puntos críticos</li>
                </ul>
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ El algoritmo se detendrá automáticamente cuando detecte colapso del sistema
                </p>
              </div>
            )}
            
            {/* Advertencia de tiempo según modo */}
            <div className={`mt-6 rounded-lg p-4 ${
              modoSimulacion === 'SEMANAL' 
                ? 'bg-yellow-50 border border-yellow-200' 
                : 'bg-orange-50 border border-orange-200'
            }`}>
              <p className={`text-sm ${
                modoSimulacion === 'SEMANAL' ? 'text-yellow-800' : 'text-orange-800'
              }`}>
                {modoSimulacion === 'SEMANAL' 
                  ? '⚠️ El escenario semanal puede tardar entre 30-90 minutos en completarse. Por favor, mantén esta ventana abierta.'
                  : '⏱️ El tiempo de ejecución del modo colapso es variable. Depende de cuándo se detecten las condiciones de colapso.'}
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
                className={`px-6 py-2 text-white rounded-lg font-medium ${
                  modoSimulacion === 'SEMANAL'
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                }`}
              >
                {isLoading ? 'Iniciando...' : 
                  modoSimulacion === 'SEMANAL' 
                    ? 'Ejecutar algoritmo semanal 🚀' 
                    : 'Ejecutar simulación de colapso 🚨'}
              </button>
            </div>
          </div>
        )}
        
        {currentStep === 'running' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center">
              <div className={`inline-block animate-spin rounded-full h-16 w-16 border-b-2 ${
                modoSimulacion === 'SEMANAL' ? 'border-blue-600' : 'border-red-600'
              } mb-4`}></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {modoSimulacion === 'SEMANAL' 
                  ? 'Ejecutando Algoritmo ALNS Semanal...' 
                  : 'Ejecutando Simulación de Colapso...'}
              </h2>
              <p className="text-gray-600 mb-4">
                {modoSimulacion === 'SEMANAL' 
                  ? `Optimizando rutas para ${config.duracionSimulacionDias} días de pedidos.`
                  : 'Monitoreando condiciones del sistema hasta detectar colapso...'}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                Configuración: {config.maxIteraciones} iteraciones, destrucción {config.tasaDestruccion}
              </p>
              <p className={`text-sm font-medium ${
                modoSimulacion === 'SEMANAL' ? 'text-yellow-600' : 'text-orange-600'
              }`}>
                {modoSimulacion === 'SEMANAL' 
                  ? 'Esto puede tardar 30-90 minutos. Por favor espera...'
                  : 'El tiempo de ejecución es variable. El sistema se detendrá automáticamente al detectar colapso.'}
              </p>
            </div>
          </div>
        )}
        
        {currentStep === 'results' && resultadoAlgoritmo && (
          <>
            {modoSimulacion === 'SEMANAL' 
              ? renderResultadosSemanales()
              : renderResultadosColapso()
            }
          </>
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
