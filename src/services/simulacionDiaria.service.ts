const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ===== Tipos =====

export interface SolicitudAlgoritmoDiario {
  simulationStartTime: string // ISO 8601
  simulationDurationHours: number
  useDatabase: boolean
  simulationSpeed?: number
}

export interface RespuestaAlgoritmoDiario {
  success: boolean
  message: string
  executionStartTime: string
  executionEndTime: string
  executionTimeSeconds: number
  simulationStartTime: string
  simulationEndTime: string
  totalOrders: number
  assignedOrders: number
  unassignedOrders: number
  totalProducts: number
  assignedProducts: number
  unassignedProducts: number
  score: number
  productRoutes: null
}

export interface SolicitudActualizarEstados {
  currentTime: string
}

export interface RespuestaActualizarEstados {
  success: boolean
  currentSimulationTime: string
  transitions: {
    pendingToInTransit: number
    inTransitToArrived: number
    arrivedToDelivered: number
    total: number
  }
}

export interface EstadoVuelo {
  id: number
  code: string
  originAirport: {
    codeIATA: string
    city: { name: string }
    latitude?: number
    longitude?: number
  }
  destinationAirport: {
    codeIATA: string
    city: { name: string }
    latitude?: number
    longitude?: number
  }
  maxCapacity: number
  usedCapacity: number
  availableCapacity: number
  transportTimeDays: number
  dailyFrequency: number
  utilizationPercentage: number
  assignedProducts: number
  assignedOrders: number
}

export interface InstanciaVuelo {
  id: string
  flightId: number
  flightCode: string
  departureTime: string
  arrivalTime: string
  originAirportId: number
  destinationAirportId: number
  originAirport: {
    codeIATA: string
    city: { name: string }
    latitude: number
    longitude: number
  }
  destinationAirport: {
    codeIATA: string
    city: { name: string }
    latitude: number
    longitude: number
  }
  status: 'SCHEDULED' | 'IN_FLIGHT' | 'ARRIVED' | 'CANCELLED'
  assignedProducts: number
}

export interface RespuestaEstadoVuelos {
  success: boolean
  totalFlights: number
  flights: EstadoVuelo[]
  statistics: {
    totalCapacity: number
    totalUsedCapacity: number
    averageUtilization: number
  }
}

// ===== Servicio =====

export const servicioSimulacionDiaria = {
  
  ejecutarDiario: async (solicitud: SolicitudAlgoritmoDiario): Promise<RespuestaAlgoritmoDiario> => {
    const response = await fetch(`${API_BASE}/api/algoritmo/diario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        horaInicioSimulacion: solicitud.simulationStartTime,
        duracionSimulacionHoras: solicitud.simulationDurationHours,
        usarBaseDatos: solicitud.useDatabase,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.mensaje || `Error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      success: data.exitoso || false,
      message: data.mensaje || '',
      executionStartTime: data.horaInicio || '',
      executionEndTime: data.horaFin || '',
      executionTimeSeconds: data.tiempoEjecucionSegundos || 0,
      simulationStartTime: data.horaInicioSimulacion || '',
      simulationEndTime: data.horaFinSimulacion || '',
      totalOrders: data.totalPedidos || 0,
      assignedOrders: data.pedidosAsignados || 0,
      unassignedOrders: data.pedidosNoAsignados || 0,
      totalProducts: data.totalProductos || 0,
      assignedProducts: data.productosAsignados || 0,
      unassignedProducts: data.productosNoAsignados || 0,
      score: data.puntaje || 0,
      productRoutes: null,
    }
  },

  actualizarEstados: async (solicitud: SolicitudActualizarEstados): Promise<RespuestaActualizarEstados> => {
    const response = await fetch(`${API_BASE}/api/simulation/update-states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solicitud),
    })

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return response.json()
  },

  obtenerEstadoVuelos: async (): Promise<RespuestaEstadoVuelos> => {
    const response = await fetch(`${API_BASE}/api/query/flights/status`)
    
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    return response.json()
  },

  cargarParaSimulacionDiaria: async (fechaInicio: string): Promise<{
    success: boolean
    message: string
    statistics: {
      ordersLoaded: number
      ordersCreated: number
      ordersFiltered: number
      customersCreated: number
      parseErrors: number
      fileErrors: number
      durationSeconds: number
    }
    timeWindow: {
      startTime: string
      endTime: string
      durationMinutes: number
    }
  }> => {
    const response = await fetch(`${API_BASE}/api/datos/load-for-daily?startTime=${encodeURIComponent(fechaInicio)}`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Error cargando datos: ${response.statusText}`)
    }

    return response.json()
  },

  // LOGICA: Generar instancias de vuelo desde plantillas
  generarInstanciasVuelo: (
    vuelos: EstadoVuelo[],
    fechaInicio: Date,
    duracionHoras: number,
    aeropuertos: any[]
  ): InstanciaVuelo[] => {
    const instancias: InstanciaVuelo[] = []

    if (!vuelos || !Array.isArray(vuelos) || vuelos.length === 0) {
      console.warn('No hay vuelos para generar instancias')
      return instancias
    }

    if (!aeropuertos || !Array.isArray(aeropuertos) || aeropuertos.length === 0) {
      console.warn('No hay aeropuertos para generar instancias')
      return instancias
    }

    const fechaFin = new Date(fechaInicio.getTime() + duracionHoras * 60 * 60 * 1000)
    const duracionDias = Math.ceil(duracionHoras / 24)

    vuelos.forEach((vuelo) => {
      const frecuencia = vuelo.dailyFrequency || 1
      const intervaloHoras = 24 / frecuencia
      const duracionVueloMs = vuelo.transportTimeDays * 24 * 60 * 60 * 1000

      // Buscar coordenadas de aeropuertos
      const aeropuertoOrigen = aeropuertos.find(
        (a: any) => a.cityName === vuelo.originAirport.city.name
      )
      const aeropuertoDestino = aeropuertos.find(
        (a: any) => a.cityName === vuelo.destinationAirport.city.name
      )

      if (!aeropuertoOrigen || !aeropuertoDestino) return

      // Generar instancias para cada día
      for (let dia = 0; dia < duracionDias; dia++) {
        const inicioDia = new Date(fechaInicio.getTime() + dia * 24 * 60 * 60 * 1000)

        // Generar según frecuencia
        for (let i = 0; i < frecuencia; i++) {
          const horaSalida = new Date(
            inicioDia.getTime() + i * intervaloHoras * 60 * 60 * 1000
          )

          if (horaSalida >= fechaInicio && horaSalida < fechaFin) {
            const horaLlegada = new Date(horaSalida.getTime() + duracionVueloMs)

            instancias.push({
              id: `${vuelo.code}-D${dia}-F${i}-${horaSalida.getTime()}`,
              flightId: vuelo.id,
              flightCode: vuelo.code,
              departureTime: horaSalida.toISOString(),
              arrivalTime: horaLlegada.toISOString(),
              originAirportId: aeropuertoOrigen.id,
              destinationAirportId: aeropuertoDestino.id,
              originAirport: {
                codeIATA: aeropuertoOrigen.codeIATA,
                city: { name: aeropuertoOrigen.cityName },
                latitude: parseFloat(aeropuertoOrigen.latitude),
                longitude: parseFloat(aeropuertoOrigen.longitude),
              },
              destinationAirport: {
                codeIATA: aeropuertoDestino.codeIATA,
                city: { name: aeropuertoDestino.cityName },
                latitude: parseFloat(aeropuertoDestino.latitude),
                longitude: parseFloat(aeropuertoDestino.longitude),
              },
              status: 'SCHEDULED',
              assignedProducts: vuelo.assignedProducts || 0,
            })
          }
        }
      }
    })

    return instancias
  },

  // LOGICA: Rolling Window - agregar día siguiente y limpiar viejos
  agregarInstanciasDiaSiguiente: (
    vuelos: EstadoVuelo[],
    instanciasActuales: InstanciaVuelo[],
    fechaInicioSimulacion: Date,
    diaActual: number,
    aeropuertos: any[]
  ): InstanciaVuelo[] => {
    if (!vuelos || !Array.isArray(vuelos) || vuelos.length === 0) {
      console.warn('No hay vuelos para agregar instancias')
      return instanciasActuales || []
    }

    if (!instanciasActuales || !Array.isArray(instanciasActuales)) {
      console.warn('instanciasActuales inválidas')
      instanciasActuales = []
    }

    // 1. Calcular inicio del siguiente día
    const inicioDiaSiguiente = new Date(
      fechaInicioSimulacion.getTime() + (diaActual + 1) * 24 * 60 * 60 * 1000
    )

    // 2. Generar instancias para el día siguiente (24 horas)
    const nuevasInstancias = servicioSimulacionDiaria.generarInstanciasVuelo(
      vuelos,
      inicioDiaSiguiente,
      24,
      aeropuertos
    )

    // 3. Limpiar instancias antiguas (más de 1 día)
    const umbralLimpieza = new Date(
      fechaInicioSimulacion.getTime() + (diaActual - 1) * 24 * 60 * 60 * 1000
    )

    const instanciasLimpias = instanciasActuales.filter((instancia) => {
      const horaLlegada = new Date(instancia.arrivalTime)
      return horaLlegada > umbralLimpieza
    })

    console.log(
      `Rolling window: Limpiadas ${instanciasActuales.length - instanciasLimpias.length}, agregadas ${nuevasInstancias.length}`
    )

    // 4. Combinar
    return [...instanciasLimpias, ...nuevasInstancias]
  },

  cargarDatosBase: async (): Promise<{
    success: boolean;
    message: string;
    aeropuertos?: number;
    vuelos?: number;
  }> => {
    try {
      // 1. Cargar aeropuertos
      console.log('📍 Cargando aeropuertos...');
      const respAeropuertos = await fetch(`${API_BASE}/api/data-import/airports`, {
        method: 'POST',
      });
      
      if (!respAeropuertos.ok) {
        const error = await respAeropuertos.json();
        throw new Error(`Error cargando aeropuertos: ${error.message}`);
      }
      
      const dataAeropuertos = await respAeropuertos.json();
      console.log(`✅ Aeropuertos cargados: ${dataAeropuertos.count}`);
      
      // 2. Cargar vuelos
      console.log('✈️ Cargando vuelos...');
      const respVuelos = await fetch(`${API_BASE}/api/data-import/flights`, {
        method: 'POST',
      });
      
      if (!respVuelos.ok) {
        const error = await respVuelos.json();
        throw new Error(`Error cargando vuelos: ${error.message}`);
      }
      
      const dataVuelos = await respVuelos.json();
      console.log(`✅ Vuelos cargados: ${dataVuelos.count}`);
      
      return {
        success: true,
        message: 'Datos base cargados correctamente',
        aeropuertos: dataAeropuertos.count,
        vuelos: dataVuelos.count,
      };
    } catch (error) {
      console.error('❌ Error cargando datos base:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
}

