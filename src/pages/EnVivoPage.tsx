/**
 * EnVivoPage
 * 
 * Página que muestra el mapa de vuelos en tiempo real.
 * Conecta con el backend en modo "live" para obtener datos actualizados.
 * 
 * El layout (TopBar y Sidebar) es manejado por el Layout Route (_authenticated).
 */

import { MapView } from '@/features/map/components';

export function EnVivoPage() {
  return (
    <div className="h-full">
      <MapView mode="live" />
    </div>
  );
}

