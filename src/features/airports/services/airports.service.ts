/**
 * Airports Service
 * 
 * Servicio para comunicación con el backend de aeropuertos
 */

import type { Airport } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Obtiene todos los aeropuertos
 */
export async function fetchAirports(): Promise<Airport[]> {
  const response = await fetch(`${API_BASE_URL}/aeropuertos`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener aeropuertos: ${response.statusText}`);
  }
  
  return response.json();
}

