/**
 * FileUploadPedidosDiaADia
 *
 * Componente especializado para cargar SOLO archivos de PEDIDOS
 * en el modo "En Vivo" (día a día).
 *
 * Usa el mismo patrón que SimulationPage pero simplificado para solo pedidos.
 */

import { useState, useRef, type DragEvent } from 'react';
import { useFileUploadDiaADia } from '@/hooks/useFileUploadDiaADia';
import { ValidationResultsDiaADia } from './ValidationResultsDiaADia';
import { toast } from '@/components/ui';

interface FileUploadPedidosDiaADiaProps {
  onValidationSuccess?: () => void;
  onClear?: () => void;
}

function FileInputCard({
  file,
  onFileSelect,
  onFileRemove,
}: {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onFileRemove: () => void;
}) {
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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.txt')
    );

    if (droppedFiles.length > 0) {
      onFileSelect(droppedFiles[0]); // Solo el primer archivo
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      onFileSelect(selectedFiles[0]); // Solo el primer archivo
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : file
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 hover:border-gray-400 bg-white'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className={`w-12 h-12 ${
              file ? 'text-green-500' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            📦 Archivo de Pedidos
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Arrastra y suelta aquí tu archivo Excel, CSV o TXT de pedidos
          </p>

          {file ? (
            <div className="space-y-2 mb-3">
              <div className="text-sm font-medium text-gray-700">
                Archivo seleccionado:
              </div>
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={onFileRemove}
                  className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                  title="Eliminar archivo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={handleClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            {file ? 'Cambiar archivo' : 'Seleccionar archivo'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.csv,.txt"
            onChange={handleFileInputChange}
          />
        </div>
      </div>
    </div>
  );
}

export function FileUploadPedidosDiaADia({
  onValidationSuccess,
  onClear,
}: FileUploadPedidosDiaADiaProps) {
  const upload = useFileUploadDiaADia();

  const handleCargar = async () => {
    if (upload.totalFiles === 0) {
      toast.warning('Archivo faltante', 'Debes seleccionar un archivo de pedidos');
      return;
    }

    const result = await upload.uploadPedidos();

    if (result?.success) {
      toast.success(
        '✓ Carga completada',
        `${result.orders || 0} pedidos cargados exitosamente`
      );
      onValidationSuccess?.();
    } else {
      toast.error(
        '✕ Error en carga',
        result?.message || 'Error al cargar archivo'
      );
    }
  };

  const handleLimpiar = () => {
    upload.clearAll();
    onClear?.();
    toast.info('Limpiado', 'Archivo y resultados eliminados');
  };

  return (
    <div className="space-y-4">
      {/* Card de carga de archivo */}
      <FileInputCard
        file={upload.state.pedidos.file}
        onFileSelect={upload.setPedidosFiles}
        onFileRemove={() => upload.setPedidosFiles(null)}
      />

      {/* Botones de acción */}
      <div className="flex gap-3">
        <button
          onClick={handleCargar}
          disabled={upload.totalFiles === 0 || upload.isUploading}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {upload.isUploading ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Cargando a BD...
            </>
          ) : (
            'Cargar a Base de Datos'
          )}
        </button>

        <button
          onClick={handleLimpiar}
          disabled={upload.isUploading}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Limpiar todo
        </button>
      </div>

      {/* Resultados */}
      <ValidationResultsDiaADia
        pedidosResult={upload.state.pedidos.result}
        pedidosError={upload.state.pedidos.error}
      />
    </div>
  );
}

