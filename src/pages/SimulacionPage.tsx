/**
 * SimulacionPage
 * 
 * Página que muestra el mapa de vuelos en modo simulación.
 * Conecta con el backend en modo "simulation" para visualizar escenarios de prueba.
 * 
 * El layout (TopBar y Sidebar) es manejado por el Layout Route (_authenticated).
 */

import { MapView } from '@/features/map/components';

export function SimulacionPage() {
  return <MapView mode="simulation" />;
}

