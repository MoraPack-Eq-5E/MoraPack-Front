/**
 * SimulacionPage
 * 
 * Página con flujo multi-paso para simulaciones:
 * 1. Carga de archivos (opcional)
 * 2. Configuración de parámetros
 * 3. Ejecución de simulación
 * 4. Visualización en tiempo real
 */

import { useState } from 'react';
import { MapView } from '@/features/map/components';
import { FileUploadSection } from '@/features/simulation/components/FileUploadSection';
import { startSimulation, startVisualization, getSimulationState } from '@/services/simulation.service';
import type { StartSimulationRequest } from '@/types/simulation.types';

type SimulationStep = 'upload' | 'config' | 'running' | 'visualization';

export function SimulacionPage() {
  const [currentStep, setCurrentStep] = useState<SimulationStep>('upload');
  const [uploadSessionId, setUploadSessionId] = useState<string | undefined>();
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuración de la simulación
  const [config, setConfig] = useState<StartSimulationRequest>({
    diasSimulacion: 7,
    iteracionesAlns: 500,
    tiempoLimiteSegundos: 5400, // 90 minutos
    habilitarUnitizacion: true,
    modoDebug: false,
    factorAceleracion: 100,
  });
  
  const handleFileValidationSuccess = (sessionId: string) => {
    setUploadSessionId(sessionId);
  };
  
  const handleContinueToConfig = () => {
    setCurrentStep('config');
  };
  
  const handleSkipUpload = () => {
    setUploadSessionId(undefined);
    setCurrentStep('config');
  };
  
  const handleStartSimulation = async () => {
    setIsStarting(true);
    setError(null);
    
    try {
      const request: StartSimulationRequest = {
        ...config,
        uploadSessionId,
      };
      
      const response = await startSimulation(request);
      setSimulationId(response.simulacionId);
      setCurrentStep('running');
      
      // Polling para verificar cuando termina
      pollSimulationStatus(response.simulacionId);
    } catch (err) {
      console.error('Error starting simulation:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsStarting(false);
    }
  };
  
  const pollSimulationStatus = async (simId: number) => {
    const checkStatus = async () => {
      try {
        const state = await getSimulationState(simId);
        
        if (state.estado === 'COMPLETADA') {
          // Simulación completada, iniciar visualización
          await startVisualization(simId);
          setCurrentStep('visualization');
          setIsStarting(false);
        } else if (state.estado === 'ERROR') {
          setError('La simulación terminó con error');
          setIsStarting(false);
        } else {
          // Seguir polling
          setTimeout(checkStatus, 5000); // Cada 5 segundos
        }
      } catch (err) {
        console.error('Error checking simulation status:', err);
        setTimeout(checkStatus, 5000);
      }
    };
    
    checkStatus();
  };
  
  const handleRestart = () => {
    setCurrentStep('upload');
    setUploadSessionId(undefined);
    setSimulationId(null);
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
            
            <FileUploadSection onValidationSuccess={handleFileValidationSuccess} />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSkipUpload}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Omitir y usar datos del sistema
              </button>
              
              {uploadSessionId && (
                <button
                  onClick={handleContinueToConfig}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Continuar con archivos validados
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
            
            {uploadSessionId && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✓ Se usarán los archivos validados para esta simulación
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Días de simulación
                </label>
                <input
                  type="number"
                  value={config.diasSimulacion}
                  onChange={(e) => setConfig({ ...config, diasSimulacion: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={30}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Iteraciones ALNS
                </label>
                <input
                  type="number"
                  value={config.iteracionesAlns}
                  onChange={(e) => setConfig({ ...config, iteracionesAlns: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={1}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo límite (segundos)
                </label>
                <input
                  type="number"
                  value={config.tiempoLimiteSegundos}
                  onChange={(e) => setConfig({ ...config, tiempoLimiteSegundos: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min={0}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="unitizacion"
                  checked={config.habilitarUnitizacion}
                  onChange={(e) => setConfig({ ...config, habilitarUnitizacion: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="unitizacion" className="text-sm text-gray-700">
                  Habilitar unitización de productos
                </label>
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
              <p className="text-gray-600">
                Esto puede tomar varios minutos. La visualización comenzará automáticamente cuando termine.
              </p>
            </div>
          </div>
        )}
        
        {currentStep === 'visualization' && simulationId !== null && (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Visualización en Tiempo Real
              </h2>
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
              >
                Nueva simulación
              </button>
            </div>
            <div className="flex-1">
              <MapView simulationId={simulationId} />
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
