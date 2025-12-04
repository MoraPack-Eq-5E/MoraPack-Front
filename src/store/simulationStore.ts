/**
 * Simulation Store - Zustand
 * 
 * Store global para mantener el estado de la simulación activa.
 * Permite que la simulación continúe ejecutándose en background
 * cuando el usuario navega a otras páginas.
 */

import { create } from 'zustand';
import type { AlgoritmoResponse, ResultadoColapsoDTO } from '@/services/algoritmoSemanal.service';
import type { CargaDatosResponse, EstadoDatosResponse } from '@/services/cargaDatos.service';

export type SimulationStep = 'load-data' | 'config' | 'running' | 'results';
export type ModoSimulacion = 'SEMANAL' | 'COLAPSO';
export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days';

interface AlgoritmoConfig {
  horaInicioSimulacion: string;
  duracionSimulacionDias: number;
  usarBaseDatos: boolean;
  maxIteraciones: number;
  tasaDestruccion: number;
  habilitarUnitizacion: boolean;
}

interface SimulationState {
  // === Estado de pasos ===
  currentStep: SimulationStep;
  modoSimulacion: ModoSimulacion;
  
  // === Estado de carga de datos ===
  dataCargada: boolean;
  resultadoCarga: CargaDatosResponse | null;
  estadoDatos: EstadoDatosResponse | null;
  
  // === Estado del algoritmo ===
  resultadoAlgoritmo: AlgoritmoResponse | ResultadoColapsoDTO | null;
  isLoading: boolean;
  error: string | null;
  
  // === Configuración ===
  config: AlgoritmoConfig;
  
  // === Estado de reproducción de la simulación ===
  isPlaying: boolean;
  currentSimTime: number; // segundos desde inicio
  timeUnit: TimeUnit;
  
  // === Referencia al interval (no se persiste, se recrea) ===
  _intervalId: ReturnType<typeof setInterval> | null;
}

interface SimulationActions {
  // === Acciones de pasos ===
  setCurrentStep: (step: SimulationStep) => void;
  setModoSimulacion: (modo: ModoSimulacion) => void;
  
  // === Acciones de carga de datos ===
  setDataCargada: (cargada: boolean) => void;
  setResultadoCarga: (resultado: CargaDatosResponse | null) => void;
  setEstadoDatos: (estado: EstadoDatosResponse | null) => void;
  
  // === Acciones del algoritmo ===
  setResultadoAlgoritmo: (resultado: AlgoritmoResponse | ResultadoColapsoDTO | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // === Acciones de configuración ===
  setConfig: (config: Partial<AlgoritmoConfig>) => void;
  
  // === Acciones de reproducción ===
  play: () => void;
  pause: () => void;
  reset: () => void;
  seek: (seconds: number) => void;
  setTimeUnit: (unit: TimeUnit) => void;
  setCurrentSimTime: (time: number) => void;
  
  // === Acciones de cleanup ===
  resetSimulation: () => void;
  
  // === Helpers ===
  getTotalDurationSeconds: () => number;
  getPlaybackSpeed: () => number;
}

const initialConfig: AlgoritmoConfig = {
  horaInicioSimulacion: '2025-01-02T00:00:00',
  duracionSimulacionDias: 7,
  usarBaseDatos: true,
  maxIteraciones: 1000,
  tasaDestruccion: 0.3,
  habilitarUnitizacion: true,
};

const initialState: SimulationState = {
  currentStep: 'load-data',
  modoSimulacion: 'SEMANAL',
  dataCargada: false,
  resultadoCarga: null,
  estadoDatos: null,
  resultadoAlgoritmo: null,
  isLoading: false,
  error: null,
  config: initialConfig,
  isPlaying: false,
  currentSimTime: 0,
  timeUnit: 'hours',
  _intervalId: null,
};

function getSecondsPerRealSecond(timeUnit: TimeUnit): number {
  switch (timeUnit) {
    case 'seconds': return 1;
    case 'minutes': return 60;
    case 'hours': return 3600;
    case 'days': return 86400;
  }
}

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  ...initialState,
  
  // === Acciones de pasos ===
  setCurrentStep: (step) => set({ currentStep: step }),
  setModoSimulacion: (modo) => set({ modoSimulacion: modo }),
  
  // === Acciones de carga de datos ===
  setDataCargada: (cargada) => set({ dataCargada: cargada }),
  setResultadoCarga: (resultado) => set({ resultadoCarga: resultado }),
  setEstadoDatos: (estado) => set({ estadoDatos: estado }),
  
  // === Acciones del algoritmo ===
  setResultadoAlgoritmo: (resultado) => set({ resultadoAlgoritmo: resultado }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error: error }),
  
  // === Acciones de configuración ===
  setConfig: (newConfig) => set((state) => ({
    config: { ...state.config, ...newConfig }
  })),
  
  // === Acciones de reproducción ===
  play: () => {
    const state = get();
    
    // Si ya está reproduciendo, no hacer nada
    if (state.isPlaying) return;
    
    // Si llegamos al final, reiniciar
    const totalDuration = state.getTotalDurationSeconds();
    if (state.currentSimTime >= totalDuration) {
      set({ currentSimTime: 0 });
    }
    
    // Limpiar interval anterior si existe
    if (state._intervalId) {
      clearInterval(state._intervalId);
    }
    
    // Crear nuevo interval
    const intervalId = setInterval(() => {
      const currentState = get();
      const playbackSpeed = currentState.getPlaybackSpeed();
      const totalDurationSec = currentState.getTotalDurationSeconds();
      
      const newTime = currentState.currentSimTime + playbackSpeed / 5;
      
      if (newTime >= totalDurationSec) {
        // Llegamos al final
        set({ 
          currentSimTime: totalDurationSec,
          isPlaying: false 
        });
        if (currentState._intervalId) {
          clearInterval(currentState._intervalId);
          set({ _intervalId: null });
        }
      } else {
        set({ currentSimTime: newTime });
      }
    }, 200);
    
    set({ isPlaying: true, _intervalId: intervalId });
  },
  
  pause: () => {
    const state = get();
    if (state._intervalId) {
      clearInterval(state._intervalId);
    }
    set({ isPlaying: false, _intervalId: null });
  },
  
  reset: () => {
    const state = get();
    if (state._intervalId) {
      clearInterval(state._intervalId);
    }
    set({ 
      isPlaying: false, 
      currentSimTime: 0,
      _intervalId: null 
    });
  },
  
  seek: (seconds) => {
    const totalDuration = get().getTotalDurationSeconds();
    set({ currentSimTime: Math.max(0, Math.min(totalDuration, seconds)) });
  },
  
  setTimeUnit: (unit) => set({ timeUnit: unit }),
  
  setCurrentSimTime: (time) => set({ currentSimTime: time }),
  
  // === Acciones de cleanup ===
  resetSimulation: () => {
    const state = get();
    if (state._intervalId) {
      clearInterval(state._intervalId);
    }
    set({
      ...initialState,
      config: state.config, // Mantener la configuración
    });
  },
  
  // === Helpers ===
  getTotalDurationSeconds: () => {
    const state = get();
    const timeline = (state.resultadoAlgoritmo as AlgoritmoResponse)?.lineaDeTiempo;
    
    if (!timeline) return 0;
    
    // 1) Si viene duracionTotalMinutos > 0 desde el back, úsalo
    if (timeline.duracionTotalMinutos && timeline.duracionTotalMinutos > 0) {
      return timeline.duracionTotalMinutos * 60;
    }
    
    // 2) Si tenemos horaInicioSimulacion y horaFinSimulacion, úsalas
    if (timeline.horaInicioSimulacion && timeline.horaFinSimulacion) {
      const start = new Date(timeline.horaInicioSimulacion);
      const end = new Date(timeline.horaFinSimulacion);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        return diffMs / 1000;
      }
    }
    
    // 3) Fallback: calcular desde las horas de los eventos
    if (timeline.eventos && timeline.eventos.length > 0) {
      const times = timeline.eventos.map(e => new Date(e.horaEvento).getTime());
      const min = Math.min(...times);
      const max = Math.max(...times);
      if (max > min) {
        return (max - min) / 1000;
      }
    }
    
    // 4) Último recurso: 1h por defecto
    return 3600;
  },
  
  getPlaybackSpeed: () => {
    return getSecondsPerRealSecond(get().timeUnit);
  },
}));

// Selector para obtener el progreso como porcentaje
export const selectProgressPercent = (state: SimulationState & SimulationActions) => {
  const totalDuration = state.getTotalDurationSeconds();
  return totalDuration > 0 ? (state.currentSimTime / totalDuration) * 100 : 0;
};

// Selector para obtener la fecha/hora actual de la simulación
export const selectCurrentSimDateTime = (state: SimulationState & SimulationActions) => {
  const timeline = (state.resultadoAlgoritmo as AlgoritmoResponse)?.lineaDeTiempo;
  if (!timeline) return new Date();
  
  const startTime = new Date(timeline.horaInicioSimulacion);
  return new Date(startTime.getTime() + state.currentSimTime * 1000);
};

// Selector para verificar si hay una simulación activa con resultados
export const selectHasActiveSimulation = (state: SimulationState) => {
  return state.resultadoAlgoritmo !== null && state.currentStep === 'results';
};

