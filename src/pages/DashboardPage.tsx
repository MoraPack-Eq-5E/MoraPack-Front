/**
 * DashboardPage
 * 
 * Página principal del dashboard con métricas, análisis operativo, 
 * logística de vuelos y alertas.
 * 
 * El layout (TopBar y Sidebar) es manejado por el Layout Route (_authenticated).
 */

import { useState } from 'react';
import {
  DashboardHeader,
  MetricsSection,
  OperationalAnalysisSection,
  FlightLogisticsSection,
  AlertsSection,
} from '@/features/dashboard/components';
import {
  useDashboardMetrics,
  useDeliveryChartData,
  useCapacityData,
  useFlightSchedule,
  useAlerts,
  useSedes,
} from '@/features/dashboard/hooks';

export function DashboardPage() {
  const [selectedSede, setSelectedSede] = useState('lima');

  // Hooks para obtener datos
  const { metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: deliveryData, isLoading: deliveryLoading } = useDeliveryChartData();
  const { data: capacityData, isLoading: capacityLoading } = useCapacityData();
  const { flights, isLoading: flightsLoading } = useFlightSchedule();
  const { alerts, isLoading: alertsLoading } = useAlerts();
  const { sedes, isLoading: sedesLoading } = useSedes();

  const isLoading =
    metricsLoading ||
    deliveryLoading ||
    capacityLoading ||
    flightsLoading ||
    alertsLoading ||
    sedesLoading;

  if (isLoading) {
    return (
      <div className="py-4">
        <div className="px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="px-8">
        {/* Header con selector de sede */}
        <DashboardHeader
          selectedSede={selectedSede}
          onSedeChange={setSelectedSede}
          sedes={sedes}
        />

        {/* Métricas principales */}
        {metrics && <MetricsSection metrics={metrics} />}

        {/* Análisis operativo - Gráficos */}
        {deliveryData.length > 0 && capacityData && (
          <OperationalAnalysisSection
            deliveryData={deliveryData}
            capacityData={capacityData}
          />
        )}

        {/* Logística de plan de vuelos */}
        {flights.length > 0 && <FlightLogisticsSection flights={flights} />}

        {/* Alertas */}
        {alerts.length > 0 && <AlertsSection alerts={alerts} />}
      </div>
    </div>
  );
}

