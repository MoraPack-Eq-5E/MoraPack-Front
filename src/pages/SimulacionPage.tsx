/**
 * SimulacionPage - ACTUALIZADO
 * 
 * Página con flujo multi-paso para simulaciones:
 * 1. Carga de archivos (opcional)
 * 2. Configuración de parámetros del algoritmo
 * 3. Ejecución del algoritmo ALNS
 * 4. Visualización con player local (frontend)
 */

import { useState } from 'react';
import { MapView } from '@/features/map/components';
import { FileUploadSection } from '@/features/simulation/components/FileUploadSection';
import { iniciarSimulacion, SimulationPlayer, type ResultadoAlgoritmoDTO } from '@/services/simulation.service';
import type { EjecutarAlgoritmoRequest } from '@/services/algoritmo.service';

type SimulationStep = 'upload' | 'config' | 'running' | 'visualization';

export function SimulacionPage() {
  const [currentStep, setCurrentStep] = useState<SimulationStep>('upload');
  const [filesImported, setFilesImported] = useState(false);
  const [player, setPlayer] = useState<SimulationPlayer | null>(null);
  const [resultado, setResultado] = useState<ResultadoAlgoritmoDTO | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuración del algoritmo
  const [config, setConfig] = useState<EjecutarAlgoritmoRequest>({
    fuente: 'BASE_DE_DATOS',
    maxIteraciones: 500,
    temperaturaInicial: 10000.0,
    factorEnfriamiento: 0.995,
  });
  
  const handleFileImportSuccess = () => {
    setFilesImported(true);
    // Cuando se importan archivos, usar fuente ARCHIVOS
    setConfig({ ...config, fuente: 'BASE_DE_DATOS' });
  };
  
  const handleContinueToConfig = () => {
    setCurrentStep('config');
  };
  
  const handleSkipUpload = () => {
    setFilesImported(false);
    setConfig({ ...config, fuente: 'BASE_DE_DATOS' });
    setCurrentStep('config');
  };
  
  const handleStartSimulation = async () => {
    setIsStarting(true);
    setError(null);
    setCurrentStep('running');
    
    try {
      // Ejecutar algoritmo y obtener player
      const { resultado: res, player: newPlayer } = await iniciarSimulacion(config);
      
      setResultado(res);
      setPlayer(newPlayer);
      setCurrentStep('visualization');
      setIsStarting(false);
      
          console.log('Algoritmo ejecutado exitosamente:', {
            rutasProductos: res.rutasProductos.length,
            costoTotal: res.costoTotal,
            eventosSimulacion: res.lineaDeTiempo?.totalEventos || 0
          });
    } catch (err) {
      console.error('Error ejecutando algoritmo:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al ejecutar algoritmo');
      setIsStarting(false);
      setCurrentStep('config');
    }
  };
  
  const handleRestart = () => {
    // Limpiar player anterior
    if (player) {
      player.destroy();
    }
    
    setCurrentStep('upload');
    setFilesImported(false);
    setPlayer(null);
    setResultado(null);
    setError(null);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Step indicator */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <StepIndicator
            number={1}
            title="Archivos"
            isActive={currentStep === 'upload'}
            isCompleted={currentStep !== 'upload'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full bg-blue-600 transition-all ${
              currentStep !== 'upload' ? 'w-full' : 'w-0'
            }`} />
          </div>
          
          <StepIndicator
            number={2}
            title="Configuración"
            isActive={currentStep === 'config'}
            isCompleted={currentStep === 'running' || currentStep === 'visualization'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full bg-blue-600 transition-all ${
              currentStep === 'running' || currentStep === 'visualization' ? 'w-full' : 'w-0'
            }`} />
          </div>
          
          <StepIndicator
            number={3}
            title="Ejecución"
            isActive={currentStep === 'running'}
            isCompleted={currentStep === 'visualization'}
          />
          <div className="flex-1 h-1 bg-gray-200 mx-4">
            <div className={`h-full bg-blue-600 transition-all ${
              currentStep === 'visualization' ? 'w-full' : 'w-0'
            }`} />
          </div>
          
          <StepIndicator
            number={4}
            title="Visualización"
            isActive={currentStep === 'visualization'}
            isCompleted={false}
          />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {currentStep === 'upload' && (
          <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Paso 1: Cargar archivos de datos (opcional)
            </h2>
            
            <FileUploadSection onValidationSuccess={handleFileImportSuccess} />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSkipUpload}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Omitir y usar datos del sistema
              </button>
              
              {filesImported && (
                <button
                  onClick={handleContinueToConfig}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Continuar con archivos importados
                </button>
              )}
            </div>
          </div>
        )}
        
        {currentStep === 'config' && (
          <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Paso 2: Configurar simulación
            </h2>
            
            {filesImported && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Los archivos han sido importados a la base de datos
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fuente de datos
                </label>
                <select
                  value={config.fuente}
                  onChange={(e) => setConfig({ ...config, fuente: e.target.value as 'ARCHIVOS' | 'BASE_DE_DATOS' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BASE_DE_DATOS">Base de datos</option>
                  <option value="ARCHIVOS">Archivos (data/)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de iteraciones ALNS
                </label>
                <input
                  type="number"
                  value={config.maxIteraciones}
                  onChange={(e) => setConfig({ ...config, maxIteraciones: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={10000}
                />
                <p className="text-xs text-gray-500 mt-1">Recomendado: 100-1000 iteraciones</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperatura inicial
                </label>
                <input
                  type="number"
                  value={config.temperaturaInicial}
                  onChange={(e) => setConfig({ ...config, temperaturaInicial: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={1000}
                  max={100000}
                  step={1000}
                />
                <p className="text-xs text-gray-500 mt-1">Recomendado: 10000</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Factor de enfriamiento
                </label>
                <input
                  type="number"
                  value={config.factorEnfriamiento}
                  onChange={(e) => setConfig({ ...config, factorEnfriamiento: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={0.9}
                  max={0.999}
                  step={0.001}
                />
                <p className="text-xs text-gray-500 mt-1">Recomendado: 0.995</p>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Volver
              </button>
              
              <button
                onClick={handleStartSimulation}
                disabled={isStarting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 font-medium"
              >
                {isStarting ? 'Iniciando...' : 'Iniciar simulación'}
              </button>
            </div>
          </div>
        )}
        
        {currentStep === 'running' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ejecutando algoritmo ALNS...
              </h2>
              <p className="text-gray-600 mb-4">
                Calculando rutas óptimas. Esto puede tomar algunos segundos.
              </p>
              <p className="text-sm text-gray-500">
                Configuración: {config.maxIteraciones} iteraciones, temp. inicial {config.temperaturaInicial}
              </p>
            </div>
          </div>
        )}
        
        {currentStep === 'visualization' && player !== null && resultado !== null && (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Visualización de Simulación
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {resultado.rutasProductos.length} productos con rutas | Costo total: ${resultado.costoTotal?.toFixed(2) || 0} | 
                    {resultado.lineaDeTiempo?.totalEventos || 0} eventos
                  </p>
                </div>
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  Nueva simulación
                </button>
              </div>
            </div>
            <div className="flex-1">
              <MapView player={player} resultado={resultado} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
}

function StepIndicator({ number, title, isActive, isCompleted }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
        isCompleted 
          ? 'bg-green-600 text-white'
          : isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-600'
      }`}>
        {isCompleted ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`text-sm font-medium mt-2 ${
        isActive ? 'text-blue-600' : 'text-gray-600'
      }`}>
        {title}
      </span>
    </div>
  );
}
