const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Almacen {
  id: number;
  nombre: string;
  capacidadMaxima: number;
  capacidadUsada: number;
  esAlmacenPrincipal: boolean;
}

export interface EstadisticasAlmacenes {
  totalAlmacenes: number;
  capacidadTotalMaxima: number;
  capacidadTotalUsada: number;
  capacidadDisponible: number;
  porcentajeUsoPromedio: number;
}

export const almacenService = {
  listar: async (): Promise<Almacen[]> => {
    const response = await fetch(`${API_BASE}/api/almacenes`);
    if (!response.ok) {
      throw new Error(`Error obteniendo almacenes: ${response.statusText}`);
    }
    return response.json();
  },

  obtenerPorId: async (id: number): Promise<Almacen> => {
    const response = await fetch(`${API_BASE}/api/almacenes/${id}`);
    if (!response.ok) {
      throw new Error(`Error obteniendo almacén ${id}: ${response.statusText}`);
    }
    return response.json();
  },

  obtenerPorAeropuerto: async (aeropuertoId: number): Promise<Almacen | null> => {
    const response = await fetch(`${API_BASE}/api/almacenes?aeropuertoId=${aeropuertoId}`);
    if (!response.ok) {
      console.warn(`No se encontró almacén para aeropuerto ${aeropuertoId}`);
      return null;
    }
    
    const data = await response.json();
    
    // Si la respuesta es un objeto con message, no hay almacén
    if (data.message) {
      return null;
    }
    
    return data;
  },

  listarPrincipales: async (): Promise<Almacen[]> => {
    const response = await fetch(`${API_BASE}/api/almacenes?principal=true`);
    if (!response.ok) {
      throw new Error(`Error obteniendo almacenes principales: ${response.statusText}`);
    }
    return response.json();
  },

  obtenerEstadisticas: async (): Promise<EstadisticasAlmacenes> => {
    const response = await fetch(`${API_BASE}/api/almacenes/estadisticas`);
    if (!response.ok) {
      throw new Error(`Error obteniendo estadísticas: ${response.statusText}`);
    }
    return response.json();
  },

  crear: async (almacen: Omit<Almacen, 'id'>): Promise<Almacen> => {
    const response = await fetch(`${API_BASE}/api/almacenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(almacen),
    });
    if (!response.ok) {
      throw new Error(`Error creando almacén: ${response.statusText}`);
    }
    return response.json();
  },

  actualizar: async (id: number, almacen: Partial<Almacen>): Promise<Almacen> => {
    const response = await fetch(`${API_BASE}/api/almacenes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(almacen),
    });
    if (!response.ok) {
      throw new Error(`Error actualizando almacén ${id}: ${response.statusText}`);
    }
    return response.json();
  },
};

