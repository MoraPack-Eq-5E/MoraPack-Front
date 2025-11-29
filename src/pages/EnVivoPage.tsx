/**
 * EnVivoPage - Simulación Diaria en Tiempo Real
 * 
 * Funciona independientemente con la fecha actual del sistema
 * Sistema de rolling window con ventanas de 10 minutos
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { servicioSimulacionDiaria, type InstanciaVuelo, type EstadoVuelo } from '@/services/simulacionDiaria.service';
import { useAirportCapacityManager } from '@/features/map/hooks/useAirportCapacityManager';
import { MapViewTemporal } from '@/features/map/components/MapViewTemporal';
import { Button } from '@/components/ui/button';
import type { AlgoritmoResponse } from '@/services/algoritmoSemanal.service';

const HORAS_VENTANA_INICIAL = 72;
const VELOCIDADES = [1, 10, 30, 60, 120, 300];

export function EnVivoPage() {
  // Estado independiente (no usa store para ser autónomo)
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null);
  const [tiempoActual, setTiempoActual] = useState<Date | null>(null);
  const [velocidad, setVelocidad] = useState(60); // 60x por defecto
  const [simulacionIniciada, setSimulacionIniciada] = useState(false);
  
  const [instanciasVuelo, setInstanciasVuelo] = useState<InstanciaVuelo[]>([]);
  const [vuelosPlantilla, setVuelosPlantilla] = useState<EstadoVuelo[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [contadorDias, setContadorDias] = useState(0);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fecha seleccionada en el formulario (formato YYYY-MM-DD)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  
  const intervaloRelojRef = useRef<number | null>(null);
  const ultimoDiaGeneradoRef = useRef(0);
  const ultimoDiaActualizacionEstadosRef = useRef(-1);

  const capacityManager = useAirportCapacityManager();
  const { airports } = capacityManager;

  // Función para iniciar simulación
  const handleIniciarSimulacion = async () => {
    try {
      const fecha = new Date(fechaSeleccionada + 'T00:00:00');
      setFechaInicio(fecha);
      setTiempoActual(fecha);
      
      setCargandoDatos(true);
      setError(null);

      console.log('🔄 Iniciando simulación para:', fecha.toLocaleDateString());
      
      // PASO 1: Cargar datos base (aeropuertos y vuelos)
      console.log('📦 Cargando datos base...');
      const resultadoDatosBase = await servicioSimulacionDiaria.cargarDatosBase();
      
      if (!resultadoDatosBase.success) {
        throw new Error(resultadoDatosBase.message);
      }
      
      console.log(`✅ Datos base cargados: ${resultadoDatosBase.aeropuertos} aeropuertos, ${resultadoDatosBase.vuelos} vuelos`);
      
      // PASO 2: Cargar pedidos para la ventana de 10 minutos
      console.log('📦 Cargando pedidos...');
      await servicioSimulacionDiaria.cargarParaSimulacionDiaria(fecha.toISOString());
      
      // PASO 3: Obtener vuelos disponibles
      console.log('✈️ Obteniendo vuelos disponibles...');
      const respuestaVuelos = await servicioSimulacionDiaria.obtenerEstadoVuelos();
      setVuelosPlantilla(respuestaVuelos.flights);

      // PASO 4: Generar instancias de vuelo para 3 días
      console.log('🗓️ Generando instancias de vuelo...');
      const instancias = servicioSimulacionDiaria.generarInstanciasVuelo(
        respuestaVuelos.flights,
        fecha,
        HORAS_VENTANA_INICIAL,
        airports
      );
      setInstanciasVuelo(instancias);

      // PASO 5: Ejecutar algoritmo inicial
      console.log('🚀 Ejecutando algoritmo inicial...');
      await servicioSimulacionDiaria.ejecutarDiario({
        simulationStartTime: fecha.toISOString(),
        simulationDurationHours: 10 / 60,
        useDatabase: true,
      });

      setSimulacionIniciada(true);
      setCargandoDatos(false);
      
      console.log('✅ Simulación iniciada correctamente');
    } catch (err) {
      console.error('❌ Error iniciando simulación:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setCargandoDatos(false);
    }
  };

  // Reloj de simulación
  const iniciarRelojSimulacion = useCallback(() => {
    if (intervaloRelojRef.current) clearInterval(intervaloRelojRef.current);

    intervaloRelojRef.current = window.setInterval(() => {
      setTiempoActual((prevTiempo) => {
        if (!prevTiempo || !fechaInicio) return null;

        const siguiente = new Date(prevTiempo.getTime() + velocidad * 1000);

        const transcurridoMs = siguiente.getTime() - fechaInicio.getTime();
        const transcurridoHoras = transcurridoMs / (1000 * 60 * 60);
        const diaActual = Math.floor(transcurridoHoras / 24);
        const horaDia = transcurridoHoras % 24;

        setContadorDias(diaActual);

        // Rolling window al cambiar de día
        if (diaActual > ultimoDiaGeneradoRef.current) {
          ultimoDiaGeneradoRef.current = diaActual;
          const instanciasActualizadas = servicioSimulacionDiaria.agregarInstanciasDiaSiguiente(
            vuelosPlantilla,
            instanciasVuelo,
            fechaInicio,
            diaActual,
            airports
          );
          setInstanciasVuelo(instanciasActualizadas);
        }

        // Actualizar estados al final del día
        if (horaDia >= 23 && diaActual > ultimoDiaActualizacionEstadosRef.current) {
          ultimoDiaActualizacionEstadosRef.current = diaActual;
          servicioSimulacionDiaria.actualizarEstados({ currentTime: siguiente.toISOString() })
            .catch(err => console.error('Error actualizando estados:', err));
        }

        return siguiente;
      });
    }, 1000);
  }, [
    fechaInicio,
    velocidad,
    instanciasVuelo,
    vuelosPlantilla,
    airports,
  ]);

  // Controles
  const handlePlayPause = () => {
    if (isPlaying) {
      if (intervaloRelojRef.current) clearInterval(intervaloRelojRef.current);
      setIsPlaying(false);
    } else {
      iniciarRelojSimulacion();
      setIsPlaying(true);
    }
  };

  const handleVelocidadChange = (nuevaVelocidad: number) => {
    setVelocidad(nuevaVelocidad);
    if (isPlaying) {
      if (intervaloRelojRef.current) clearInterval(intervaloRelojRef.current);
      iniciarRelojSimulacion();
    }
  };

  const handleDetener = () => {
    if (intervaloRelojRef.current) clearInterval(intervaloRelojRef.current);
    setIsPlaying(false);
    setSimulacionIniciada(false);
    setFechaInicio(null);
    setTiempoActual(null);
    setInstanciasVuelo([]);
    setVuelosPlantilla([]);
    setContadorDias(0);
    ultimoDiaGeneradoRef.current = 0;
    ultimoDiaActualizacionEstadosRef.current = -1;
  };

  useEffect(() => {
    return () => {
      if (intervaloRelojRef.current) clearInterval(intervaloRelojRef.current);
    };
  }, []);

  // Formatear tiempo
  const tiempoFormateado = tiempoActual
    ? tiempoActual.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'No iniciado';

  // Convertir instancias a timeline para MapViewTemporal
  const resultadoSimulado: AlgoritmoResponse | null = useMemo(() => {
    if (instanciasVuelo.length === 0 || !fechaInicio) return null;

    const eventos = instanciasVuelo.flatMap((inst) => [
      {
        idEvento: `${inst.id}-departure`,
        tipoEvento: 'DEPARTURE' as const,
        horaEvento: inst.departureTime,
        idVuelo: inst.flightId,
        codigoVuelo: inst.flightCode,
        ciudadOrigen: inst.originAirport.city.name,
        ciudadDestino: inst.destinationAirport.city.name,
      },
      {
        idEvento: `${inst.id}-arrival`,
        tipoEvento: 'ARRIVAL' as const,
        horaEvento: inst.arrivalTime,
        idVuelo: inst.flightId,
        codigoVuelo: inst.flightCode,
        ciudadOrigen: inst.originAirport.city.name,
        ciudadDestino: inst.destinationAirport.city.name,
      },
    ]);

    const fechaFin = new Date(fechaInicio.getTime() + HORAS_VENTANA_INICIAL * 60 * 60 * 1000);

    return {
      exito: true,
      mensaje: 'Simulación diaria',
      tiempoInicioEjecucion: fechaInicio.toISOString(),
      tiempoFinEjecucion: new Date().toISOString(),
      tiempoEjecucionSegundos: 0,
      horaInicioSimulacion: fechaInicio.toISOString(),
      horaFinSimulacion: fechaFin.toISOString(),
      totalPedidos: 0,
      pedidosAsignados: 0,
      pedidosNoAsignados: 0,
      totalProductos: 0,
      productosAsignados: 0,
      productosNoAsignados: 0,
      puntaje: 0,
      lineaDeTiempo: {
        eventos,
        horaInicioSimulacion: fechaInicio.toISOString(),
        horaFinSimulacion: fechaFin.toISOString(),
        totalEventos: eventos.length,
        duracionTotalMinutos: HORAS_VENTANA_INICIAL * 60,
      },
    } as AlgoritmoResponse;
  }, [instanciasVuelo, fechaInicio]);

  // Render - Form inicial
  if (!simulacionIniciada) {
    return (
      <div className="h-full bg-gray-50">
        <div className="py-8">
          <div className="px-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Simulación en Tiempo Real
              </h1>
              <p className="text-gray-600 mb-6">
                Sistema de rolling window con ventanas de 10 minutos
              </p>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    disabled={cargandoDatos}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Por defecto usa la fecha actual del sistema
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Velocidad Inicial
                  </label>
                  <select
                    value={velocidad}
                    onChange={(e) => setVelocidad(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    disabled={cargandoDatos}
                  >
                    {VELOCIDADES.map((vel) => (
                      <option key={vel} value={vel}>
                        {vel}x (1 segundo real = {vel} segundos simulados)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    ¿Cómo funciona?
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ventana de 72 horas (3 días) de vuelos</li>
                    <li>• Re-ejecuta algoritmo cada 10 minutos simulados</li>
                    <li>• Rolling window: agrega día siguiente automáticamente</li>
                    <li>• Actualiza capacidades de almacén en tiempo real</li>
                  </ul>
                </div>

                <Button
                  onClick={handleIniciarSimulacion}
                  disabled={cargandoDatos || !fechaSeleccionada}
                  className="w-full"
                >
                  {cargandoDatos ? 'Iniciando...' : 'Iniciar Simulación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (cargandoDatos) {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Cargando simulación...
          </h3>
          <p className="text-gray-600">Generando instancias de vuelo</p>
        </div>
      </div>
    );
  }

  // Mapa con controles
  return (
    <div className="h-full flex flex-col">
      {/* Barra superior */}
      <div className="bg-white shadow-md border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Simulación Diaria</h1>
            <p className="text-sm text-gray-600">
              {tiempoFormateado} · Día {contadorDias}
            </p>
          </div>
          
          <div className="h-8 w-px bg-gray-300" />
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Velocidad:</span>
              <select
                value={velocidad}
                onChange={(e) => handleVelocidadChange(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {VELOCIDADES.map((vel) => (
                  <option key={vel} value={vel}>
                    {vel}x
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePlayPause}
              className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
            </button>
            
            <button
              onClick={handleDetener}
              className="px-4 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              ⏹ Detener
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Vuelos: <span className="font-semibold">{instanciasVuelo.length}</span> instancias
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {resultadoSimulado ? (
          <MapViewTemporal resultado={resultadoSimulado} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Generando timeline...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnVivoPage;

