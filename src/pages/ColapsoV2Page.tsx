// src/pages/ColapsoV2Page.tsx
/**
 * ColapsoV2Page - Escenario COLAPSO (V2)
 *
 * Misma estructura/HTML que la SimulacionPage semanal (4 pasos),
 * pero el flujo de colapso ahora es:
 * 1) Cargar datos (archivos -> BD)
 * 2) Configurar (solo fecha inicio + parámetros fijos)
 * 3) Ejecutar:
 *    3.1) Encontrar zona aproximada de colapso (probe rápido) => encontrarVentanaColapsoAprox()
 *    3.2) Ejecutar corrida final con buffer (diaRecomendado) => ejecutarAlgoritmoSemanal()
 *    3.3) Detectar colapso real + recortar timeline
 * 4) Resultados (mapa + reporte + badges de fechas aproximadas)
 */

import { useState } from 'react';
import { FileUploadSection, ReporteResultados } from '@/features/simulation/components';
import {
    obtenerEstadoDatosNoDiario,
    type CargaDatosResponse,
    type EstadoDatosResponse
} from '@/services/cargaDatos.service';

import {
    ejecutarAlgoritmoSemanal,
    detectarPuntoColapso,
    recortarTimelineHastaColapso,
    type AlgoritmoRequest,
    type AlgoritmoResponse,
    type PuntoColapso
} from '@/services/algoritmoSemanal.service';

import { encontrarVentanaColapsoAprox, type VentanaColapsoAprox } from '@/services/colapso.service';

import { consultarEstadisticasAsignacion, consultarVuelos, consultarPedidos } from '@/services/consultas.service';
import { MapViewTemporal } from '@/features/map/components';
import { useAirportsForMap } from '@/features/map/hooks';

type SimulationStep = 'load-data' | 'config' | 'running' | 'results';
type ModoSimulacion = 'COLAPSO';

export function ColapsoV2Page() {
    // === Estado de flujo ===
    const [currentStep, setCurrentStep] = useState<SimulationStep>('load-data');
    const [modoSimulacion] = useState<ModoSimulacion>('COLAPSO');

    // Estado de carga de datos
    const [dataCargada, setDataCargada] = useState(false);
    const [resultadoCarga, setResultadoCarga] = useState<CargaDatosResponse | null>(null);
    const [estadoDatos, setEstadoDatos] = useState<EstadoDatosResponse | null>(null);

    // Estado del algoritmo
    const [resultadoAlgoritmo, setResultadoAlgoritmo] = useState<AlgoritmoResponse | null>(null);

    // Punto colapso real (si backend lo devuelve)
    const [puntoColapso, setPuntoColapso] = useState<PuntoColapso | null>(null);

    // Zona/ventana aproximada (probe)
    const [ventanaColapso, setVentanaColapso] = useState<VentanaColapsoAprox | null>(null);
    const [colapsoStatus, setColapsoStatus] = useState<string | null>(null);

    // UI
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mostrarReporte, setMostrarReporte] = useState(false);

    // Hook aeropuertos
    const { isLoading: airportsLoading, refetch: refetchAirports } = useAirportsForMap();

    // Config base (se mantiene igual estructura)
    const [config, setConfig] = useState<AlgoritmoRequest>({
        horaInicioSimulacion: '2025-01-02T00:00:00',
        // En colapso V2, la duración final la decide el detector (diaRecomendado)
        // pero dejamos un valor por defecto para evitar undefined en algunos logs.
        duracionSimulacionDias: 7,
        usarBaseDatos: true,

        // Parámetros fijos (pueden quedar como los de tu semanal, luego ajustas)
        maxIteraciones: 1000,
        tasaDestruccion: 0.3,
        habilitarUnitizacion: true,
    });

    // ==================== PASO 1: CARGA DE DATOS ====================

    const handleFileImportSuccess = async (sessionId?: string) => {
        const usandoBD = sessionId === 'database';

        try {
            setIsLoading(true);
            console.log(usandoBD
                ? '📊 Usando datos existentes en BD...'
                : `✅ Archivos importados exitosamente (Session: ${sessionId})`);
            console.log('📊 Consultando estado de base de datos...');

            // Refetch aeropuertos después de importar
            await refetchAirports();

            // Obtener estado de datos desde BD
            const estado = await obtenerEstadoDatosNoDiario();
            setEstadoDatos(estado);

            console.log('✅ Datos disponibles en BD:', estado.estadisticas);

            setDataCargada(true);

            // Resultado para UI
            setResultadoCarga({
                exito: true,
                mensaje: usandoBD
                    ? 'Usando datos existentes en la base de datos'
                    : 'Archivos cargados exitosamente desde tu equipo',
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

            // Salto automático a config si estás usando BD
            if (usandoBD) {
                setCurrentStep('config');
            }
        } catch (err) {
            console.error('❌ Error consultando datos:', err);
            setError(err instanceof Error ? err.message : 'Error al consultar datos');
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
        setPuntoColapso(null);
        setVentanaColapso(null);
        setColapsoStatus(null);

        setCurrentStep('running');

        try {
            console.log(`🚀 Ejecutando algoritmo en modo ${modoSimulacion} (V2)...`);
            console.log('Configuración base:', config);

            // 1) Detectar ventana aproximada con probe rápido
            setColapsoStatus('🔎 Buscando zona aproximada de colapso... (probe rápido)');

            const ventana = await encontrarVentanaColapsoAprox(
                {
                    ...config,
                    usarBaseDatos: true,
                },
                {
                    minDias: 7,
                    maxDias: 365,
                    factorCrecimiento: 2,
                    probeMaxIteraciones: 150,
                    probeTiempoLimiteSegundos: 8,
                    bufferDias: 7,
                    maxLlamadas: 20,
                }
            );

            let resultado: AlgoritmoResponse;

            if (!ventana) {
                // No colapso detectado (según señales del backend)
                setVentanaColapso(null);
                setColapsoStatus('✅ No se detectó colapso en el rango de búsqueda.');

                // Para no dejar la pantalla sin resultados, ejecutamos una corrida "demostrativa" corta
                // (ajústalo a 30/60/90 según tu performance real)
                setColapsoStatus('📌 Ejecutando corrida demostrativa (30 días) para visualizar operaciones...');
                resultado = await ejecutarAlgoritmoSemanal({
                    ...config,
                    duracionSimulacionDias: 30,
                    maxIteraciones: 1500,
                    tiempoLimiteSegundos: 90,
                    modoDebug: true,
                });

                // En teoría debería no colapsar; si colapsa, igual lo detectamos abajo.
            } else {
                setVentanaColapso(ventana);

                setColapsoStatus(
                    `⚠️ Zona aprox: día ${ventana.primerDiaFalla}. Ejecutando corrida final con margen (+${ventana.bufferDias}) => día ${ventana.diaRecomendado}...`
                );

                // 2) Corrida final con buffer (diaRecomendado)
                resultado = await ejecutarAlgoritmoSemanal({
                    ...config,
                    duracionSimulacionDias: ventana.diaRecomendado,

                    // Parámetros "finales" (ajusta a tu estándar)
                    maxIteraciones: 3000,
                    tiempoLimiteSegundos: 120,
                    modoDebug: true,
                });
            }

            // 3) Detectar colapso real y recortar timeline
            const colapsoReal = detectarPuntoColapso(resultado);
            if (colapsoReal) {
                console.log('🚨 COLAPSO REAL DETECTADO:', colapsoReal);
                setPuntoColapso(colapsoReal);

                if (resultado.lineaDeTiempo) {
                    resultado = {
                        ...resultado,
                        lineaDeTiempo: recortarTimelineHastaColapso(
                            resultado.lineaDeTiempo,
                            colapsoReal.fechaColapso
                        )
                    };
                }

                setColapsoStatus(`🚨 Colapso confirmado. Pedido ${colapsoReal.pedidoId} causó el fallo.`);
            } else {
                console.log('✅ Corrida final no confirmó colapso (posible variación / o sistema estable en ventana evaluada).');
                if (ventana) {
                    setColapsoStatus('✅ Corrida final no confirmó colapso (posible variación del algoritmo).');
                } else {
                    setColapsoStatus('✅ Sistema estable en la corrida demostrativa.');
                }
            }

            setResultadoAlgoritmo(resultado);

            console.log('✅ Colapso V2 completado:', {
                productosAsignados: resultado.productosAsignados ?? resultado.totalProductos,
                pedidosAsignados: resultado.pedidosAsignados,
                pedidosNoAsignados: resultado.pedidosNoAsignados,
                segundosEjecucion: resultado.tiempoEjecucionSegundos ?? resultado.segundosEjecucion,
            });

            // Espera breve para persistencia
            await new Promise(resolve => setTimeout(resolve, 1000));

            setCurrentStep('results');
            setMostrarReporte(true);
        } catch (err) {
            console.error('❌ Error ejecutando colapso V2:', err);
            setError(err instanceof Error ? err.message : 'Error al ejecutar algoritmo');
            setCurrentStep('config');
        } finally {
            setIsLoading(false);
        }
    };

    // ==================== PASO 3: CONSULTAR RESULTADOS ====================

    const handleVerResultados = async () => {
        try {
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

    // ==================== RENDER PRINCIPAL ====================

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
                            <div className="h-full bg-gray-200 transition-all w-0" />
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
                {/* ==================== STEP 1: LOAD DATA ==================== */}
                {currentStep === 'load-data' && (
                    <div className="max-w-6xl mx-auto p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Paso 1: Cargar Pedidos a Base de Datos
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Carga archivos de pedidos desde tu equipo
                        </p>

                        {/* Modo fijo (COLAPSO V2) - misma estética que tu card de modo */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-gray-900 mb-2">Modo de Simulación</h3>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="modo"
                                        value="COLAPSO"
                                        checked
                                        readOnly
                                    />
                                    <span>Simulación por colapso (V2: estimación + corrida final)</span>
                                </label>
                            </div>
                            <p className="text-xs text-amber-700 mt-2">
                                Se ejecutará desde <strong>{formatearFechaLegible(config.horaInicioSimulacion!)}</strong> y primero estimará una <strong>zona aproximada</strong> de colapso,
                                luego ejecutará una corrida final con <strong>margen +7 días</strong>.
                            </p>
                        </div>

                        {/* Configuración de fecha inicio - misma estructura */}
                        <div className="bg-amber-50 border border-amber-200 border rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-amber-900 mb-3">
                                Fecha de Inicio - Simulación de Colapso (V2)
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-amber-900 mb-2">
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
                                    className="w-full px-3 py-2 border border-amber-300 focus:ring-amber-500 rounded-lg focus:ring-2"
                                />

                                <p className="text-xs text-amber-700 mt-2">
                                    Se analizarán pedidos desde esta fecha para encontrar la zona de colapso.
                                </p>
                            </div>
                        </div>

                        {/* Panel informativo colapso - misma estructura que tu warning rojo */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-red-900 mb-2">🚨 Modo Colapso V2 Activado</h3>
                            <p className="text-sm text-red-800 mb-2">
                                Este modo busca el punto donde el sistema deja de ser factible y muestra el mapa hasta el colapso:
                            </p>
                            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                                <li>Pedidos sin asignación (no hay ruta válida / deadline)</li>
                                <li>Capacidades insuficientes reflejadas por el algoritmo</li>
                                <li>Congestión que impide cumplimiento</li>
                            </ul>
                            <p className="text-xs text-red-600 mt-2">
                                ⚙️ Flujo: (1) probe rápido para estimar zona de colapso + (2) corrida final con margen (+7 días).
                            </p>
                        </div>

                        {/* Importar archivos */}
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-900 mb-3">Subir archivos desde tu equipo</h3>
                            <FileUploadSection
                                onValidationSuccess={handleFileImportSuccess}
                                horaInicio={config.horaInicioSimulacion}
                                // En colapso V2 NO filtramos por horaFin (cargas todo lo disponible)
                                horaFin={undefined}
                                modoSimulacion="COLAPSO"
                                onClear={() => {
                                    setDataCargada(false);
                                    setResultadoCarga(null);
                                    setEstadoDatos(null);
                                    setResultadoAlgoritmo(null);
                                    setPuntoColapso(null);
                                    setVentanaColapso(null);
                                    setColapsoStatus(null);
                                    setError(null);
                                    console.log('[ColapsoV2Page] onClear: estado reseteado');
                                }}
                            />
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

                {/* ==================== STEP 2: CONFIG ==================== */}
                {currentStep === 'config' && (
                    <div className="max-w-4xl mx-auto p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Paso 2: Configurar Algoritmo por Colapso (V2)
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Configura los parámetros para la simulación de colapso del sistema (estimación + corrida final)
                        </p>

                        {resultadoCarga && (
                            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">
                                    ✓ {resultadoCarga.estadisticas.pedidosCargados} pedidos listos para análisis
                                </p>
                            </div>
                        )}

                        {/* Info modo colapso - misma estructura */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-red-900 mb-2">🚨 Configuración del Algoritmo de Colapso V2</h3>
                            <p className="text-sm text-red-800 mb-2">
                                El sistema ejecutará dos etapas:
                            </p>
                            <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
                                <li><strong>Etapa 1 (probe):</strong> encuentra zona aproximada de colapso con parámetros rápidos</li>
                                <li><strong>Etapa 2 (final):</strong> corre el ALNS hasta <strong>día recomendado = colapso + 7</strong> para robustez</li>
                            </ul>
                            <p className="text-xs text-red-600 mt-2">
                                ⚠️ La fecha exacta puede variar por estocasticidad del algoritmo; por eso usamos margen de seguridad.
                            </p>
                        </div>

                        {/* Advertencia de tiempo - misma estructura */}
                        <div className="mt-6 rounded-lg p-4 bg-orange-50 border border-orange-200">
                            <p className="text-sm text-orange-800">
                                ⏱️ El tiempo de ejecución es variable: primero se hace una estimación rápida y luego una corrida final más pesada.
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
                                className="px-6 py-2 text-white rounded-lg font-medium bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                            >
                                {isLoading ? 'Iniciando...' : 'Ejecutar simulación de colapso V2 🚨'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ==================== STEP 3: RUNNING ==================== */}
                {currentStep === 'running' && (
                    <div className="max-w-4xl mx-auto p-6">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Ejecutando Simulación de Colapso (V2)...
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Primero estimamos zona de colapso y luego ejecutamos corrida final con margen.
                            </p>

                            <p className="text-sm text-gray-500 mb-2">
                                Configuración base: {config.maxIteraciones} iteraciones, destrucción {config.tasaDestruccion}
                            </p>

                            <p className="text-sm font-medium text-orange-600">
                                El tiempo de ejecución es variable. Por favor espera...
                            </p>

                            {/* Estado del proceso */}
                            {colapsoStatus && (
                                <p className="mt-4 text-sm text-gray-700">
                                    {colapsoStatus}
                                </p>
                            )}

                            {/* Detalles de ventana aproximada */}
                            {ventanaColapso && (
                                <div className="mt-4 text-xs text-gray-600">
                                    <p>📌 Último OK: día {ventanaColapso.ultimoDiaOk} ({formatearFechaLegible(ventanaColapso.fechaUltimoOkISO)})</p>
                                    <p>📌 Primer fallo aprox: día {ventanaColapso.primerDiaFalla} ({formatearFechaLegible(ventanaColapso.fechaPrimerFallaISO)})</p>
                                    <p>✅ Recomendado (+{ventanaColapso.bufferDias} días): día {ventanaColapso.diaRecomendado} ({formatearFechaLegible(ventanaColapso.fechaRecomendadaISO)})</p>
                                    <p>🔁 Llamadas probe: {ventanaColapso.llamadasRealizadas}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== STEP 4: RESULTS ==================== */}
                {currentStep === 'results' && resultadoAlgoritmo && (
                    <div className="h-full flex flex-col">
                        {/* Barra superior con botón de reporte */}
                        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    puntoColapso ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {puntoColapso ? '🚨 Colapso detectado' : '✅ Sistema estable'}
                </span>

                                <span className="text-sm text-gray-600">
                  {resultadoAlgoritmo.pedidosAsignados || 0}/{resultadoAlgoritmo.totalPedidos || 0} pedidos asignados
                </span>

                                {/* Badges de ventana aproximada */}
                                {ventanaColapso && (
                                    <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      ⏱️ Aproximado: día {ventanaColapso.primerDiaFalla}
                    </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      ✅ Run final: día {ventanaColapso.diaRecomendado} (+{ventanaColapso.bufferDias})
                    </span>
                                        <span className="text-xs text-gray-600">
                      Aproximado: <strong>{formatearFechaLegible(ventanaColapso.fechaPrimerFallaISO)}</strong> •
                      recomendado: <strong>{formatearFechaLegible(ventanaColapso.fechaRecomendadaISO)}</strong>
                    </span>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => setMostrarReporte(!mostrarReporte)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                                    mostrarReporte
                                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                                        : puntoColapso
                                            ? 'bg-red-600 text-white hover:bg-red-700'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {mostrarReporte ? 'Ocultar reporte' : 'Ver reporte'}
                            </button>
                        </div>

                        {/* Contenedor principal: mapa + reporte */}
                        <div className="flex-1 overflow-hidden relative">
                            {/* Reporte flotante */}
                            {mostrarReporte && (
                                <div className="absolute top-4 left-4 z-[1001] w-[480px] max-h-[calc(100%-2rem)] overflow-y-auto shadow-2xl rounded-xl">
                                    <ReporteResultados
                                        resultado={resultadoAlgoritmo}
                                        modoSimulacion="COLAPSO"
                                        puntoColapso={puntoColapso}
                                        onClose={() => setMostrarReporte(false)}
                                        onNuevaSimulacion={() => {
                                            setCurrentStep('load-data');
                                            setDataCargada(false);
                                            setResultadoCarga(null);
                                            setEstadoDatos(null);
                                            setResultadoAlgoritmo(null);
                                            setPuntoColapso(null);
                                            setVentanaColapso(null);
                                            setColapsoStatus(null);
                                            setError(null);
                                            setMostrarReporte(false);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Mapa */}
                            {resultadoAlgoritmo?.lineaDeTiempo && !airportsLoading ? (
                                <MapViewTemporal
                                    resultado={resultadoAlgoritmo as AlgoritmoResponse}
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
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
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
export default ColapsoV2Page;
