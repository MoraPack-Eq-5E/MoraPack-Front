/**
 * EnVivoPage
 * 
 * Página de visualización en tiempo real
 * Muestra la última simulación activa
 */

export function EnVivoPage() {
  // TODO: esto solo es un placeholder, falta implementar  
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Vista en Vivo
        </h1>
        <p className="text-gray-600 mb-4">
          Próximamente: visualización en tiempo real de simulaciones activas
        </p>
        <p className="text-sm text-gray-500">
          Esta página mostrará simulaciones en ejecución con MapView + SimulationPlayer
        </p>
      </div>
    </div>
  );
}

export default EnVivoPage;

