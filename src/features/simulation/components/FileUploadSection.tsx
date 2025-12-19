import { useState, useRef, type DragEvent } from 'react';
import { ValidationResults } from './ValidationResults';
import { useFileUpload } from '../hooks/useFileUpload';
import { SimulationFileType } from '@/types/fileUpload.types';

interface FileInputCardProps {
  title: string;
  description: string;
  file?: File;
  files?: File[];  // Para soportar múltiples archivos (pedidos)
  onFileSelect: (file: File | File[]) => void;
  onFileRemove: () => void;
  onFileRemoveByIndex?: (index: number) => void;
  acceptMultiple?: boolean;
}

export default function FileInputCard({
  title,
  description,
  file,
  files,
  onFileSelect,
  onFileRemove,
  onFileRemoveByIndex,
  acceptMultiple = false,
}: FileInputCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFileSelect(droppedFiles[0]);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      // Si hay múltiples archivos, pasar array; si no, un archivo solo
      if (selectedFiles.length > 1) {
        onFileSelect(Array.from(selectedFiles));
      } else {
        onFileSelect(selectedFiles[0]);
      }
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className={`border-2 border-dashed rounded-lg p-4 transition-colors overflow-hidden ${
      isDragging
        ? 'border-blue-500 bg-blue-50'
        : file || (files && files.length > 0)
        ? 'border-green-500 bg-green-50'
        : 'border-gray-300 hover:border-gray-400'
    }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className={`w-8 h-8 ${file || (files && files.length > 0) ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-gray-900 mb-1 text-sm">{title}</h3>
          <p className="text-xs text-gray-600 mb-2 truncate">{description}</p>
          
          {files && files.length > 0 ? (
            <div className="space-y-2 overflow-hidden">
              <div className="text-xs font-medium text-gray-700">
                {files.length} archivo{files.length !== 1 ? 's' : ''} seleccionado{files.length !== 1 ? 's' : ''}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((f, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-green-200">
                    <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-gray-700 truncate flex-1 min-w-0" title={f.name}>
                      {f.name}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                      ({(f.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                    <button
                      onClick={() => onFileRemoveByIndex?.(index)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                      title="Eliminar archivo"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={onFileRemove}
                className="text-xs text-red-600 hover:text-red-700 underline"
              >
                Eliminar todos
              </button>
            </div>
          ) : file ? (
            <div className="flex items-center gap-2 bg-white rounded px-2 py-1.5 border border-green-200 overflow-hidden">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-gray-700 truncate flex-1 min-w-0" title={file.name}>
                {file.name}
              </span>
              <span className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
              <button
                onClick={onFileRemove}
                className="text-red-500 hover:text-red-700 flex-shrink-0"
                title="Eliminar archivo"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleClick}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Seleccionar archivo{acceptMultiple ? 's' : ''} .txt
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            multiple={acceptMultiple}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}

interface FileUploadSectionProps {
  onValidationSuccess: (sessionId: string,files?: File[]) => void;
  onValidationError?: (error: string) => void;
  horaInicio?: string;
  horaFin?: string;
  modoSimulacion: string;
  onClear?: () => void; // callback que indica que la BD y el estado local fueron limpiados
  onUseExistingData?: () => void;
  showUseExistingOption?: boolean;
}

export function FileUploadSection(props: FileUploadSectionProps) {
  const { onValidationSuccess, onValidationError, horaInicio, horaFin, modoSimulacion } = props;
  
  // Usar hook local (más rápido que el store global)
  const {
    filesState,
    clientErrors,
    hasFiles,
    isValidated,
    addFile,
    removeFile,
    removeFileByIndex,
    validateFiles,
    clearAll,
  } = useFileUpload();
  
  // Wrappers que limpian el mensaje de 'limpieza' cuando el usuario realiza acciones
  const handleAddFile = (file: File | File[], type: SimulationFileType) => {
    setClearMessage(null);
    addFile(file, type);
  };

  const handleRemoveFileWrapper = (type: SimulationFileType) => {
    setClearMessage(null);
    removeFile(type);
  };

  const handleRemoveFileByIndexWrapper = (index: number) => {
    setClearMessage(null);
    removeFileByIndex(index);
  };

  const handleValidate = async () => {
      const response = await validateAll() as { success: boolean; message?: string; sessionId?: string | null };
      
      // Verificamos que response no sea null y que sea exitoso
      if (response && response.success && response.sessionId) {
      // Pasamos el sessionId y los archivos de pedidos que están en el estado
      onValidationSuccess(response.sessionId, filesState.pedidos?.map(p => p.file)); 
    } else {
      // Si falló, el hook useFileUpload ya maneja los errores en validationResponse
      if (onValidationError && !response?.success) {
        onValidationError(response?.message || 'Error en la validación de archivos');
      }
    }
  };

  // Nuevo estado local para controlar la acción de limpiar
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  const handleClearAll = async () => {
    setIsClearing(true);
    setClearMessage(null);
    try {
      const res = await clearAll();
      if (res && res.success) {
        setClearMessage('Se limpió toda la información subida.');
        // Notificar al componente padre para que limpie su estado (resultadoCarga, dataCargada, etc.)
        props.onClear?.();
      } else {
        setClearMessage(res?.message || 'No se pudo limpiar la información.');
      }
    } catch (error) {
      setClearMessage(error instanceof Error ? error.message : 'Error desconocido al limpiar.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">
              Tienes dos opciones:
            </p>
            <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
              <li><strong>Usar datos de BD:</strong> Ejecuta con los datos ya cargados en el sistema</li>
              <li><strong>Subir archivos:</strong> Importa nuevos datos desde archivos .txt</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FileInputCard
          title="Aeropuertos"
          description="aeropuertosinfo.txt"
          file={filesState.aeropuertos?.file}
          onFileSelect={(file) => handleAddFile(file, SimulationFileType.AEROPUERTOS)}
          onFileRemove={() => handleRemoveFileWrapper(SimulationFileType.AEROPUERTOS)}
        />
        
        <FileInputCard
          title="Vuelos"
          description="vuelos.txt"
          file={filesState.vuelos?.file}
          onFileSelect={(file) => handleAddFile(file, SimulationFileType.VUELOS)}
          onFileRemove={() => handleRemoveFileWrapper(SimulationFileType.VUELOS)}
        />
        
        <FileInputCard
          title="Pedidos"
          description="pedidos.txt (múltiples archivos permitidos)"
          files={filesState.pedidos?.map(p => p.file)}
          onFileSelect={(file) => handleAddFile(file, SimulationFileType.PEDIDOS)}
          onFileRemove={() => handleRemoveFileWrapper(SimulationFileType.PEDIDOS)}
          onFileRemoveByIndex={handleRemoveFileByIndexWrapper}
          acceptMultiple={true}
        />
      </div>
      <FileInputCard
          title="Cancelaciones (opcional)"
          description="cancelaciones.txt"
          file={filesState.cancelaciones?.file}
          onFileSelect={(file) => handleAddFile(file, SimulationFileType.CANCELACIONES)}
          onFileRemove={() => handleRemoveFileWrapper(SimulationFileType.CANCELACIONES)}
      />
      
      {clientErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-800 mb-2">Errores de validación</h4>
          <ul className="space-y-1">
            {clientErrors.map((error, idx) => (
              <li key={idx} className="text-sm text-red-700">• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {filesState.validationResponse && (
        <ValidationResults validationResponse={filesState.validationResponse} />
      )}
      
      {/* Indicador simple de importación en progreso */}
      {filesState.isValidating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <p className="text-sm font-medium text-blue-900">Importando archivos...</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3">
        {/* Botón para usar datos de BD (siempre visible si no hay archivos subidos) */}
        {!hasFiles && !isValidated && (
          <button
            onClick={() => onValidationSuccess('database')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Usar datos existentes en BD
          </button>
        )}
        
        {hasFiles && !isValidated && (
          <button
            onClick={handleValidate}
            disabled={filesState.isValidating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {filesState.isValidating ? 'Importando...' : 'Importar archivos a BD'}
          </button>
        )}
        
        {hasFiles && (
          <button
            onClick={handleClearAll}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            disabled={isClearing}
          >
            {isClearing ? 'Limpiando...' : 'Limpiar todo'}
          </button>
        )}
      </div>

      {clearMessage && (
        <div className={`mt-3 p-3 rounded-lg ${clearMessage.includes('No se pudo') || clearMessage.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {clearMessage}
        </div>
      )}
    </div>
  );
}
const validateAll = async () => {
  try {
    const result = await useValidateFiles();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido durante la validación';
    onValidationError?.(errorMessage);
    return {
      success: false,
      message: errorMessage,
      sessionId: null,
    };
  }
};
function useValidateFiles() {
  const { filesState } = useFileUpload();

  return async () => {
    try {
      const formData = new FormData();
      
      if (filesState.aeropuertos?.file) {
        formData.append('aeropuertos', filesState.aeropuertos.file);
      }
      if (filesState.vuelos?.file) {
        formData.append('vuelos', filesState.vuelos.file);
      }
      if (filesState.pedidos && filesState.pedidos.length > 0) {
        filesState.pedidos.forEach((pedido, index) => {
          formData.append(`pedidos_${index}`, pedido.file);
        });
      }
      if (filesState.cancelaciones?.file) {
        formData.append('cancelaciones', filesState.cancelaciones.file);
      }

      const response = await fetch('/api/simulation/validate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error en la validación del servidor');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };
}
function onValidationError(errorMessage: string) {
  // Aquí puedes manejar el error de validación, por ejemplo, mostrando un mensaje en la interfaz de usuario
  console.error("Error de validación:", errorMessage);
  // Puedes también actualizar el estado local o llamar a un callback para notificar al componente padre
  setClearMessage(errorMessage);
}

function setClearMessage(errorMessage: string) {
  throw new Error('Function not implemented.');
}

