/**
 * LiveSimulationInfo
 *
 * Panel de información para la vista En Vivo
 * Muestra: Tiempo actual, Vuelos activos y Pedidos entregados
 */

interface LiveSimulationInfoProps {
  currentTime: string;
  activeFlights: number;
  deliveredOrders: number;
}

export function LiveSimulationInfo({
  currentTime,
  activeFlights,
  deliveredOrders,
}: LiveSimulationInfoProps) {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-200 px-6 py-4 min-w-[400px]">
      <div className="grid grid-cols-3 gap-6">
        {/* Tiempo */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Tiempo
          </div>
          <div className="text-lg font-bold text-blue-700 font-mono">
            {currentTime}
          </div>
        </div>

        {/* Vuelos Activos */}
        <div className="flex flex-col items-center border-x border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Vuelos Activos
          </div>
          <div className="text-2xl font-bold text-teal-600">
            {activeFlights}
          </div>
        </div>

        {/* Pedidos Entregados */}
        <div className="flex flex-col items-center">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Pedidos Entregados
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {deliveredOrders}
          </div>
        </div>
      </div>
    </div>
  );
}

