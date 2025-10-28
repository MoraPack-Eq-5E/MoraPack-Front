/**
 * MapView Component
 * 
 * Visualización en tiempo real de vuelos desde el backend
 * 
 * @param simulationId - ID de la simulación activa en el backend
 */

import { useState, useEffect, useMemo } from 'react';
import { MapCanvas, FlightMarker, FlightRoute, AirportMarker, StatsCard, LoadingOverlay, OccupancyLegend, SimulationCompleteModal, SimulationControls, EventFeed } from '@/features/map/components';
import { useLiveFlights, useMapStats, useAirportsForMap, useSimulationEvents } from '@/features/map/hooks';
import type { Vuelo, Aeropuerto } from '@/types/map.types';

interface MapViewProps {
  simulationId: number | null;
}

const POLLING_INTERVAL = 2000; // 2 segundos

export function MapView({ simulationId }: MapViewProps) {
  const { airports, isLoading: airportsLoading } = useAirportsForMap();
  const { flights, status, loadingStatus, error } = useLiveFlights(simulationId, POLLING_INTERVAL);
  const stats = useMapStats(flights);
  
  // Hook para gestionar eventos de simulación
  const { filteredEvents } = useSimulationEvents(status?.recentEvents, {
    maxEvents: 50,
    autoScroll: true,
    enableFilters: false,
  });
  
  // Estado para el vuelo seleccionado (para mostrar su ruta)
  const [selectedFlight, setSelectedFlight] = useState<Vuelo | null>(null);
  
  // Estado para el aeropuerto seleccionado (para mostrar todas sus rutas)
  const [selectedAirport, setSelectedAirport] = useState<Aeropuerto | null>(null);
  
  // Estado para el modal de simulación completada
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completedSimulationData, setCompletedSimulationData] = useState<any>(null);
  
  // Detectar cuando la simulación termina
  useEffect(() => {
    if (status?.status === 'COMPLETED' && !showCompleteModal) {
      setCompletedSimulationData(status);
      setShowCompleteModal(true);
    }
  }, [status?.status, showCompleteModal]);
  
  const handleFlightClick = (vuelo: Vuelo) => {
    // Deseleccionar aeropuerto si estaba seleccionado
    setSelectedAirport(null);
    
    // Si clickean el mismo vuelo, deseleccionar
    if (selectedFlight?.id === vuelo.id) {
      setSelectedFlight(null);
    } else {
      setSelectedFlight(vuelo);
    }
  };
  
  const handleAirportClick = (airport: Aeropuerto) => {
    // Deseleccionar vuelo si estaba seleccionado
    setSelectedFlight(null);
    
    // Si clickean el mismo aeropuerto, deseleccionar
    if (selectedAirport?.id === airport.id) {
      setSelectedAirport(null);
    } else {
      setSelectedAirport(airport);
    }
  };
  
  // Filtrar vuelos que salen o llegan al aeropuerto seleccionado
  const airportFlights = useMemo(() => {
    if (!selectedAirport) return [];
    
    return flights.filter(
      (flight) =>
        flight.codigoOrigen === selectedAirport.codigo ||
        flight.codigoDestino === selectedAirport.codigo
    );
  }, [selectedAirport, flights]);

  // Cargando aeropuertos
  if (airportsLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Cargando aeropuertos...</p>
        </div>
      </div>
    );
  }

  // Sin simulación activa
  if (!simulationId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No hay simulación activa
          </h2>
          <p className="text-gray-500">
            Inicia una simulación para ver vuelos en tiempo real
          </p>
        </div>
      </div>
    );
  }

  // Error de conexión
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">
            Error de conexión
          </h2>
          <p className="text-red-600">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Loading Overlay - Muestra el progreso de carga */}
      <LoadingOverlay
        status={loadingStatus}
        message={
          loadingStatus === 'loading-visualization'
            ? 'Esto puede tomar unos segundos...'
            : undefined
        }
      />

      <MapCanvas className="h-full w-full">
        {/* Aeropuertos */}
        {airports.map((airport) => (
          <AirportMarker 
            key={airport.id} 
            airport={airport}
            onClick={handleAirportClick}
            isSelected={selectedAirport?.id === airport.id}
          />
        ))}
        
        {/* Línea de ruta del vuelo seleccionado */}
        {selectedFlight && (
          <FlightRoute vuelo={selectedFlight} />
        )}
        
        {/* Líneas de rutas del aeropuerto seleccionado */}
        {selectedAirport && airportFlights.map((flight) => (
          <FlightRoute key={flight.id} vuelo={flight} />
        ))}
        
        {/* Vuelos en tiempo real */}
        {flights.map((flight) => (
          <FlightMarker 
            key={flight.id} 
            vuelo={flight}
            onClick={handleFlightClick}
          />
        ))}
        
        {/* Stats card con datos reales */}
        <StatsCard
          flightsInAir={stats.total}
          slaPct={status?.metrics.slaCompliancePercentage || 0}
          warehousePct={status?.metrics.averageWarehouseOccupancy || 0}
          now={status?.currentSimulatedTime || new Date().toISOString()}
        />
      </MapCanvas>
      
      {/* Panel derecho: Controles + Eventos */}
      {loadingStatus === 'ready' && simulationId && status && (
        <div className="absolute top-4 right-4 z-[1000] w-[340px] flex flex-col gap-4">
          {/* Controles de simulación */}
          <SimulationControls
            simulationId={simulationId}
            currentStatus={status.status}
            currentSpeed={status.timeScale || 112}
            onStatusChange={() => {
              // El hook useLiveFlights ya hace polling automático
              // No necesitamos hacer nada extra aquí
            }}
          />
          
          {/* Feed de eventos en tiempo real */}
          <EventFeed
            events={filteredEvents}
            maxHeight="400px"
            enableSearch={false}
          />
        </div>
      )}
      
      {/* Leyenda de colores de ocupación */}
      {loadingStatus === 'ready' && <OccupancyLegend />}
      
      {/* Indicador de vuelo seleccionado */}
      {selectedFlight && loadingStatus === 'ready' && (
        <div className="absolute bottom-24 left-4 bg-white rounded-lg shadow-lg px-4 py-2 border border-gray-200 z-[1000]">
          <div className="text-sm font-medium text-gray-700">
            Ruta: {selectedFlight.codigo}
          </div>
          <div className="text-xs text-gray-500">
            {selectedFlight.ciudadOrigen} → {selectedFlight.ciudadDestino}
          </div>
          <button
            onClick={() => setSelectedFlight(null)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            Ocultar ruta
          </button>
        </div>
      )}
      
      {/* Indicador de aeropuerto seleccionado */}
      {selectedAirport && loadingStatus === 'ready' && (
        <div className="absolute bottom-24 left-4 bg-white rounded-lg shadow-lg px-4 py-3 border border-gray-200 z-[1000]">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-lg font-bold text-gray-900">
              {selectedAirport.codigo}
            </div>
            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
              selectedAirport.estado === 'DISPONIBLE' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {selectedAirport.estado === 'DISPONIBLE' ? 'Activo' : 'Inactivo'}
            </div>
          </div>
          <div className="text-xs text-gray-600 mb-1">
            {selectedAirport.pais}
          </div>
          <div className="text-sm font-medium text-blue-600 mb-2">
            {airportFlights.length} vuelos conectados
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Ocupación: {selectedAirport.cantActual}/{selectedAirport.capMaxAlmacen} paquetes
          </div>
          <button
            onClick={() => setSelectedAirport(null)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            Ocultar rutas
          </button>
        </div>
      )}
      
      {/* Modal de simulación completada */}
      {completedSimulationData && (
        <SimulationCompleteModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          simulationData={completedSimulationData}
        />
      )}
    </div>
  );
}

