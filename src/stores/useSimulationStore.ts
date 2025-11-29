import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type ModoSimulacion = 'semanal' | 'diaria'

export const VENTANA_REFRESH_DIARIA_MS = 10 * 60 * 1000  // 10 minutos
export const BUFFER_ALGORITMO_MS = 2 * 60 * 1000         // 2 minutos

interface SimulationStore {
  // Configuración
  fechaInicioSimulacion: Date | null
  simulacionConfigurada: boolean
  modoSimulacion: ModoSimulacion
  
  // Estado simulación diaria (timestamps para persistencia)
  diariaEjecutandose: boolean
  diariaTiempoActual: number | null
  diariaVelocidad: number
  ultimaEjecucionAlgoritmo: number | null
  proximaEjecucionAlgoritmo: number | null
  
  // Actions
  setFechaInicioSimulacion: (fecha: Date) => void
  setModoSimulacion: (modo: ModoSimulacion) => void
  limpiarConfiguracion: () => void
  tieneConfiguracionValida: () => boolean
  esModoDiario: () => boolean
  
  // Actions simulación diaria
  iniciarSimulacionDiaria: (fechaInicio: Date, velocidad: number) => void
  actualizarTiempoDiario: (tiempo: Date | ((prev: number | null) => Date | null)) => void
  setVelocidadDiaria: (velocidad: number) => void
  detenerSimulacionDiaria: () => void
  setUltimaEjecucionAlgoritmo: (tiempo: Date) => void
  setProximaEjecucionAlgoritmo: (tiempo: Date | null) => void
  
  // Lógica ventana 10 minutos
  estaOrdenEnVentanaActual: (tiempoOrden: Date) => boolean
  activarRefreshSiNecesario: (tiempoOrden: Date) => boolean
}

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      fechaInicioSimulacion: null,
      simulacionConfigurada: false,
      modoSimulacion: 'semanal',

      diariaEjecutandose: false,
      diariaTiempoActual: null,
      diariaVelocidad: 1,
      ultimaEjecucionAlgoritmo: null,
      proximaEjecucionAlgoritmo: null,

      setFechaInicioSimulacion: (fecha: Date) => {
        set({
          fechaInicioSimulacion: fecha,
          simulacionConfigurada: true,
        })
      },

      setModoSimulacion: (modo: ModoSimulacion) => {
        set({ modoSimulacion: modo })
      },

      limpiarConfiguracion: () => {
        set({
          fechaInicioSimulacion: null,
          simulacionConfigurada: false,
          modoSimulacion: 'semanal',
          diariaEjecutandose: false,
          diariaTiempoActual: null,
          ultimaEjecucionAlgoritmo: null,
          proximaEjecucionAlgoritmo: null,
        })
      },

      tieneConfiguracionValida: () => {
        const state = get()
        return state.simulacionConfigurada && state.fechaInicioSimulacion !== null
      },

      esModoDiario: () => {
        return get().modoSimulacion === 'diaria'
      },

      iniciarSimulacionDiaria: (fechaInicio: Date, velocidad: number) => {
        const proximaEjecucion = new Date(fechaInicio.getTime() + VENTANA_REFRESH_DIARIA_MS - BUFFER_ALGORITMO_MS)
        set({
          diariaEjecutandose: true,
          diariaTiempoActual: fechaInicio.getTime(),
          diariaVelocidad: velocidad,
          ultimaEjecucionAlgoritmo: fechaInicio.getTime(),
          proximaEjecucionAlgoritmo: proximaEjecucion.getTime(),
        })
      },

      actualizarTiempoDiario: (tiempo: Date | ((prev: number | null) => Date | null)) => {
        if (typeof tiempo === 'function') {
          const tiempoActual = get().diariaTiempoActual
          const nuevoTiempo = tiempo(tiempoActual)
          set({ diariaTiempoActual: nuevoTiempo ? nuevoTiempo.getTime() : null })
        } else {
          set({ diariaTiempoActual: tiempo.getTime() })
        }
      },

      setVelocidadDiaria: (velocidad: number) => {
        set({ diariaVelocidad: velocidad })
      },

      detenerSimulacionDiaria: () => {
        set({
          diariaEjecutandose: false,
          diariaTiempoActual: null,
          ultimaEjecucionAlgoritmo: null,
          proximaEjecucionAlgoritmo: null,
        })
      },

      setUltimaEjecucionAlgoritmo: (tiempo: Date) => {
        set({ ultimaEjecucionAlgoritmo: tiempo.getTime() })
      },

      setProximaEjecucionAlgoritmo: (tiempo: Date | null) => {
        set({ proximaEjecucionAlgoritmo: tiempo ? tiempo.getTime() : null })
      },

      estaOrdenEnVentanaActual: (tiempoOrden: Date) => {
        const state = get()
        if (!state.diariaEjecutandose || !state.ultimaEjecucionAlgoritmo) {
          return false
        }

        const ultimaEjecucion = new Date(state.ultimaEjecucionAlgoritmo)
        const inicioVentana = ultimaEjecucion
        const finVentana = new Date(ultimaEjecucion.getTime() + VENTANA_REFRESH_DIARIA_MS)

        return tiempoOrden >= inicioVentana && tiempoOrden <= finVentana
      },

      activarRefreshSiNecesario: (tiempoOrden: Date) => {
        const state = get()
        if (!state.diariaEjecutandose || !state.diariaTiempoActual) {
          return false
        }

        if (state.estaOrdenEnVentanaActual(tiempoOrden)) {
          const tiempoActual = new Date(state.diariaTiempoActual)
          const proximaEjecucion = new Date(tiempoActual.getTime() + BUFFER_ALGORITMO_MS)
          set({ proximaEjecucionAlgoritmo: proximaEjecucion.getTime() })
          return true
        }

        return false
      },
    }),
    {
      name: 'morapack-simulation-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.fechaInicioSimulacion) {
          state.fechaInicioSimulacion = new Date(state.fechaInicioSimulacion)
        }

        if (state && !state.modoSimulacion) {
          state.modoSimulacion = 'semanal'
        }
      },
    },
  ),
)

