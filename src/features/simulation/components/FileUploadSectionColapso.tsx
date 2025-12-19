import { useState, useRef, type DragEvent } from 'react';
import { ValidationResults } from './ValidationResults';
import { useFileUploadColapso } from '../hooks/useFileUploadColapso';
import { SimulationFileType } from '@/types/fileUpload.types';
import { AlertCircle, FileText, Trash2, CheckCircle2, Upload, X, FileUp } from 'lucide-react';

interface FileUploadSectionColapsoProps {
  onValidationSuccess: (sessionId: string) => void;
  onValidationError?: (error: string) => void;
}

// --- SUB-COMPONENTE INTERNO: TARJETA DE CARGA (Para no importar del original) ---
interface FileInputCardProps {
  title: string;
  description: string;
  file?: File;
  files?: File[];
  onFileSelect: (file: File | File[]) => void;
  onFileRemove: () => void;
  onFileRemoveByIndex?: (index: number) => void;
  acceptMultiple?: boolean;
}
// --- COMPONENTE PRINCIPAL ---
export function FileUploadSectionColapso({ 
  onValidationSuccess, 
  onValidationError 
}: FileUploadSectionColapsoProps) {
    // Usamos el hook que ya tiene la lógica de archivos y validación
  const {
    filesState,
    clientErrors,
    addFile,
    removeFile,
    validateAll,
    clearAll,
    hasFiles,
    isValidated
  } = useFileUploadColapso();

  // CORRECCIÓN: Usar un estado real para mensajes
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  // Wrappers que limpian el mensaje de 'limpieza' cuando el usuario realiza acciones
  const handleAddFile = (file: File | File[], type: SimulationFileType) => {
      setClearMessage(null);
      addFile(file, type);
   };
  // CORRECCIÓN: Implementar los wrappers de eliminación
  const handleRemoveFileWrapper = (type: SimulationFileType) => {
    removeFile(type);
  };
  const handleRemoveFileByIndexWrapper = (index: number) => {
    removeFile(SimulationFileType.PEDIDOS, index);
  };

  const handleValidate = async () => {
    // 1. Ejecutamos la validación (esto sube los archivos al Back)
    const response = await validateAll() as { success: boolean; message?: string; sessionId?: string | null };
    // 2. Si el back responde con éxito y nos da un sessionId
    if (response && response.success && response.sessionId) {
      // ✅ PASO CLAVE: Pasamos el ticket (ID) al padre
      onValidationSuccess(response.sessionId); 
    } else if (onValidationError && !response?.success) {
      onValidationError(response?.message || 'Error en la validación de archivos');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PANEL DE PEDIDOS: Admite múltiples archivos .txt */}
        <FileInputCard
            title="Pedidos"
            description="pedidos.txt (múltiples archivos permitidos)"
            files={filesState.pedidos as unknown as File[]}
            onFileSelect={(file) => handleAddFile(file, SimulationFileType.PEDIDOS)}
            onFileRemove={() => handleRemoveFileWrapper(SimulationFileType.PEDIDOS)}
            onFileRemoveByIndex={handleRemoveFileByIndexWrapper}
            acceptMultiple={true}
        />

        {/* PANEL DE CANCELACIONES: Opcional */}
        <FileInputCard
            title="Cancelaciones (opcional)"
            description="cancelaciones.txt"
            // CORRECCIÓN: Acceso directo al objeto File
            file={filesState.cancelaciones as unknown as File}
            onFileSelect={(file) => handleAddFile(file, SimulationFileType.CANCELACIONES)}
            onFileRemove={() => handleRemoveFileWrapper(SimulationFileType.CANCELACIONES)}
        />
      </div>

      {/* ERRORES DE CLIENTE (TAMAÑO/TIPO) */}
      {clientErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex items-center gap-2 text-red-800 font-bold mb-1">
            <AlertCircle size={18} />
            <span>Errores detectados en archivos:</span>
          </div>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
            {clientErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* ACCIONES */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="text-sm text-gray-500 italic flex items-center gap-2">
          {hasFiles ? (
            <><CheckCircle2 className="text-green-500" size={16}/> Archivos listos para validación volátil</>
          ) : (
            "No se han seleccionado archivos todavía"
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {hasFiles && (
            <button
              onClick={clearAll}
              className="flex-1 sm:flex-none px-4 py-2 text-gray-400 hover:text-red-600 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} /> Borrar
            </button>
          )}
          
          {hasFiles && !isValidated && (
            <button
              onClick={handleValidate}
              disabled={filesState.isValidating}
              className="flex-1 sm:flex-none px-10 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-100 transition-all disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {filesState.isValidating ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Validando...</>
              ) : (
                'Confirmar y Continuar'
              )}
            </button>
          )}

          {isValidated && (
            <div className="px-6 py-3 bg-green-50 text-green-700 font-bold rounded-xl border border-green-200 flex items-center gap-2">
              <CheckCircle2 size={20} /> Listos para el paso 2
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE RESULTADOS DE VALIDACIÓN (Si el servidor responde con errores específicos) */}
      {filesState.validationResponse && (
        <ValidationResults 
          validationResponse={filesState.validationResponse} 
        />
      )}
    </div>
  );
}
function FileInputCard({
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

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFileSelect(acceptMultiple ? droppedFiles : droppedFiles[0]);
    }
  };

  return (
    <div 
      className={`relative p-6 rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <FileUp className={isDragging ? 'text-red-500' : 'text-gray-400'} size={24} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>

        {/* LISTA DE ARCHIVOS SELECCIONADOS */}
        <div className="flex-1 space-y-2 mb-4">
          {acceptMultiple && files && files.length > 0 ? (
            <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 mb-1">
                  <span className="text-xs font-medium truncate max-w-[180px]">{f?.name || 'Archivo sin nombre'}</span>
                  <button onClick={() => onFileRemoveByIndex?.(idx)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : file ? (
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
              <span className="text-sm font-medium truncate">{file.name}</span>
              <button onClick={onFileRemove} className="text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="py-8 text-center">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Click para subir o arrastra aquí
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={acceptMultiple}
          onChange={(e) => {
            if (e.target.files?.length) {
              const selectedFiles = Array.from(e.target.files);
              onFileSelect(acceptMultiple ? selectedFiles : selectedFiles[0]);
            }
          }}
        />
      </div>
    </div>
  );
}