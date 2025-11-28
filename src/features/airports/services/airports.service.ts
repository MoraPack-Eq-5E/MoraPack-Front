/**
 * Airports Service
 * 
 * Servicio para comunicación con el backend de aeropuertos
 */

import type { Airport } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Obtiene todos los aeropuertos
 */
export async function fetchAirports(): Promise<Airport[]> {
  const response = await fetch(`${API_BASE_URL}/api/aeropuertos`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener aeropuertos: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Cambia el estado de un aeropuerto entre DISPONIBLE y NO_DISPONIBLE
 */
export async function toggleAirportStatus(id: number): Promise<Airport> {
  const url = `${API_BASE_URL}/api/aeropuertos/${id}/toggle`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Error al cambiar estado del aeropuerto: ${response.statusText}`);
  }
  
  return response.json();
}

