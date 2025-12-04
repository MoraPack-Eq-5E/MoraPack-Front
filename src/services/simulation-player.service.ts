/**
 * Servicio para REPRODUCIR la simulación en el frontend
 * usando la línea de tiempo generada por el backend
 */

import type { 
  EventoLineaDeTiempoVueloDTO, 
  LineaDeTiempoSimulacionDTO 
} from './algoritmo.service';

export interface SimulationState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: Date;
  speedMultiplier: number;
  progress: number; // 0-100
  currentEventIndex: number;
  activeFlights: ActiveFlightState[];
  completedEvents: EventoLineaDeTiempoVueloDTO[];
}

export interface ActiveFlightState {
  eventId: string;
  flightId: number;
  flightCode: string;
  originCode: string;
  destinationCode: string;
  departureTime: Date;
  arrivalTime: Date;
  currentProgress: number; // 0-1
  productIds: number[]; // Productos transportados (antes packageIds)
  orderIds: number[];
  // Coordenadas para interpolación en el frontend
  originLat?: number;
  originLon?: number;
  destLat?: number;
  destLon?: number;
  // Capacidad del vuelo
  capacityUsed?: number;
  capacityMax?: number;
  cost?: number;
  windowIndex?: number;
  windowIndexes?: number[];
}

export class SimulationPlayer {
  private timeline: LineaDeTiempoSimulacionDTO | null = null;
  private state: SimulationState;
  private intervalId: number | null = null;
  private startRealTime: number = 0;
  private pausedAt: number = 0;
  private listeners: Set<(state: SimulationState) => void> = new Set();
  private airportCoords: Map<string, {lat: number, lon: number}> = new Map();

  constructor(airports?: Array<{codigoIATA: string, latitud: number, longitud: number}>) {
    // Preprocesar aeropuertos para búsqueda O(1)
    if (airports) {
      airports.forEach(airport => {
        // Asegurar que las coordenadas sean números (pueden venir como strings del backend)
        const lat = typeof airport.latitud === 'number' ? airport.latitud : parseFloat(String(airport.latitud));
        const lon = typeof airport.longitud === 'number' ? airport.longitud : parseFloat(String(airport.longitud));
        
        // Solo guardar si son válidos
        if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
          this.airportCoords.set(airport.codigoIATA, { lat, lon });
        } else {
          console.warn(`⚠️ Aeropuerto ${airport.codigoIATA} tiene coordenadas inválidas: lat=${airport.latitud}, lon=${airport.longitud}`);
        }
      });
    }
    this.state = {
      isPlaying: false,
      isPaused: false,
      currentTime: new Date(),
      speedMultiplier: 1,
      progress: 0,
      currentEventIndex: 0,
      activeFlights: [],
      completedEvents: [],
    };
  }

  /**
   * Carga una línea de tiempo para simular
   */
  loadTimeline(timeline: LineaDeTiempoSimulacionDTO): void {
    this.timeline = timeline;
    this.state.currentTime = new Date(timeline.horaInicioSimulacion);
    this.state.progress = 0;
    this.state.currentEventIndex = 0;
    this.state.activeFlights = [];
    this.state.completedEvents = [];
    
    // Debug: Calcular duración para verificar
    const startTime = new Date(timeline.horaInicioSimulacion).getTime();
    const endTime = new Date(timeline.horaFinSimulacion).getTime();
    const totalDuration = endTime - startTime;
    const durationMinutes = totalDuration / 1000 / 60;
    
    console.log('🎬 Timeline cargada:', {
      eventos: timeline.eventos?.length || 0,
      totalEventos: timeline.totalEventos,
      inicio: timeline.horaInicioSimulacion,
      fin: timeline.horaFinSimulacion,
      duracionMinutos: durationMinutes,
      duracionHoras: durationMinutes / 60,
      primerEvento: timeline.eventos?.[0],
      ultimoEvento: timeline.eventos?.[timeline.eventos?.length - 1],
    });
    
    if (totalDuration <= 0) {
      console.error('❌ ERROR: Duración del timeline es 0 o negativa!', {
        startTime,
        endTime,
        totalDuration,
      });
    }
    
    this.notifyListeners();
  }

  /**
   * Inicia la reproducción
   */
  play(): void {
    if (!this.timeline) {
      console.error('❌ No hay timeline cargada');
      return;
    }
    
    if (this.state.isPlaying) {
      console.warn('⚠️ Ya está en reproducción');
      return;
    }

    console.log('▶️ Iniciando reproducción...');
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.startRealTime = Date.now() - (this.pausedAt || 0);

    // Ajustar intervalo según velocidad (más rápido = menos actualizaciones para mejor performance)
    const updateInterval = this.state.speedMultiplier > 1000 ? 50 : 100;
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, updateInterval);

    this.notifyListeners();
  }

  /**
   * Pausa la reproducción
   */
  pause(): void {
    if (!this.state.isPlaying) return;

    this.state.isPaused = true;
    this.state.isPlaying = false;
    this.pausedAt = Date.now() - this.startRealTime;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.notifyListeners();
  }

  /**
   * Detiene completamente la reproducción
   */
  stop(): void {
    this.pause();
    this.state.currentTime = this.timeline ? new Date(this.timeline.horaInicioSimulacion) : new Date();
    this.state.progress = 0;
    this.state.currentEventIndex = 0;
    this.state.activeFlights = [];
    this.state.completedEvents = [];
    this.pausedAt = 0;
    this.notifyListeners();
  }

  /**
   * Cambia la velocidad de reproducción
   */
  setSpeed(multiplier: number): void {
    if (multiplier < 0.5 || multiplier > 100000) {
      throw new Error('Speed multiplier must be between 0.5 and 100000');
    }
    this.state.speedMultiplier = multiplier;
    console.log(`⚡ Velocidad cambiada a ${multiplier}x`);
    this.notifyListeners();
  }

  /**
   * Salta a un punto específico de la simulación
   */
  seekToProgress(progress: number): void {
    if (!this.timeline) return;

    const startTime = new Date(this.timeline.horaInicioSimulacion).getTime();
    const endTime = new Date(this.timeline.horaFinSimulacion).getTime();
    const totalDuration = endTime - startTime;
    
    const newTime = startTime + (totalDuration * progress / 100);
    this.state.currentTime = new Date(newTime);
    this.state.progress = progress;

    // Recalcular eventos completados y vuelos activos
    this.updateEventsAndFlights();
    this.notifyListeners();
  }

  /**
   * Tick de la simulación (llamado cada 100ms)
   */
  private tick(): void {
    if (!this.timeline) return;

    const startTime = new Date(this.timeline.horaInicioSimulacion).getTime();
    const endTime = new Date(this.timeline.horaFinSimulacion).getTime();
    const totalDuration = endTime - startTime;

    // Calcular tiempo simulado (con multiplicador de velocidad)
    const elapsedRealTime = (Date.now() - this.startRealTime) * this.state.speedMultiplier;
    const newSimulatedTime = startTime + elapsedRealTime;

    // Actualizar tiempo y progreso
    this.state.currentTime = new Date(Math.min(newSimulatedTime, endTime));
    this.state.progress = ((newSimulatedTime - startTime) / totalDuration) * 100;

    // Log cada segundo
    if (Math.floor(this.state.progress) % 10 === 0) {
      console.log('⏱️ Progreso:', this.state.progress.toFixed(1), '%', 
                  'Vuelos activos:', this.state.activeFlights.length,
                  'Eventos:', this.state.completedEvents.length);
    }

    // Procesar eventos y actualizar vuelos activos
    this.updateEventsAndFlights();

    // Si llegamos al final, detener
    if (this.state.progress >= 100) {
      console.log('✅ Simulación completada');
      this.stop();
    }

    this.notifyListeners();
  }

  /**
   * Actualiza eventos completados y vuelos activos según el tiempo actual
   */
  private updateEventsAndFlights(): void {
    if (!this.timeline) return;
    if (!this.timeline.eventos || this.timeline.eventos.length === 0) {
      console.warn('⚠️ No hay eventos en el timeline');
      return;
    }

    const currentTimeMs = this.state.currentTime.getTime();
    const newActiveFlights: ActiveFlightState[] = [];
    const newCompletedEvents: EventoLineaDeTiempoVueloDTO[] = [];

    // Debug: Log del primer evento para verificar formato
    if (this.state.completedEvents.length === 0) {
      const primerEvento = this.timeline.eventos[0];
      console.log('🔍 Debug primer evento:', {
        horaEvento: primerEvento.horaEvento,
        horaEventoParsed: new Date(primerEvento.horaEvento),
        horaEventoMs: new Date(primerEvento.horaEvento).getTime(),
        currentTimeMs,
        diferencia: new Date(primerEvento.horaEvento).getTime() - currentTimeMs,
      });
    }

    // Procesar eventos hasta el tiempo actual
    for (const evento of this.timeline.eventos) {
      const eventoTime = new Date(evento.horaEvento).getTime();

      if (eventoTime <= currentTimeMs) {
        // Evento ya ocurrió
        if (!this.state.completedEvents.find(e => e.idEvento === evento.idEvento)) {
          newCompletedEvents.push(evento);
        }

        // Si es salida, agregar vuelo activo
        if (evento.tipoEvento === 'DEPARTURE' && evento.idVuelo) {
          // Buscar evento de llegada correspondiente
          const arrivalEvent = this.timeline.eventos.find(
            e => e.tipoEvento === 'ARRIVAL' && 
                 e.idVuelo === evento.idVuelo &&
                 e.idEvento.includes(evento.idEvento.split('-')[1]) // Mismo grupo
          );

          if (arrivalEvent) {
            const arrivalTime = new Date(arrivalEvent.horaEvento).getTime();
            
            // Si aún no llegó, está en vuelo
            if (currentTimeMs < arrivalTime) {
              const departureTime = eventoTime;
              const flightDuration = arrivalTime - departureTime;
              const elapsed = currentTimeMs - departureTime;
              const progress = elapsed / flightDuration;

              // Obtener coordenadas de aeropuertos
              const originCoords = this.airportCoords.get(evento.ciudadOrigen || '');
              const destCoords = this.airportCoords.get(evento.ciudadDestino || '');
              
              newActiveFlights.push({
                eventId: evento.idEvento,
                flightId: evento.idVuelo,
                flightCode: evento.codigoVuelo || `FLT-${evento.idVuelo}`,
                originCode: evento.ciudadOrigen || '',
                destinationCode: evento.ciudadDestino || '',
                departureTime: new Date(departureTime),
                arrivalTime: new Date(arrivalTime),
                currentProgress: Math.min(progress, 1),
                productIds: evento.idProducto ? [evento.idProducto] : [], // Cambiado de packageIds
                orderIds: evento.idPedido ? [evento.idPedido] : [],
                // Agregar coordenadas para interpolación
                originLat: originCoords?.lat,
                originLon: originCoords?.lon,
                destLat: destCoords?.lat,
                destLon: destCoords?.lon,
              });
            }
          }
        }
      }
    }

    this.state.activeFlights = newActiveFlights;
    this.state.completedEvents = [...this.state.completedEvents, ...newCompletedEvents];
  }

  /**
   * Suscribirse a cambios de estado
   */
  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifica a todos los listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Obtiene el estado actual
   */
  getState(): SimulationState {
    return { ...this.state };
  }

  /**
   * Limpia recursos
   */
  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

