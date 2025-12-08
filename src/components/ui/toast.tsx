/**
 * Toast - Sistema de notificaciones elegante
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

function Toast({ message, description, type = 'info', duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Duración de la animación de salida
  };

  useEffect(() => {
    // Animación de entrada
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-cerrar después de la duración
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);


  // Estilos por tipo
  const typeStyles = {
    success: {
      bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      icon: '✓',
      iconBg: 'bg-white/20',
      text: 'text-white',
    },
    error: {
      bg: 'bg-gradient-to-r from-rose-500 to-red-500',
      icon: '✕',
      iconBg: 'bg-white/20',
      text: 'text-white',
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
      icon: '⚠',
      iconBg: 'bg-white/20',
      text: 'text-white',
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
      icon: 'ℹ',
      iconBg: 'bg-white/20',
      text: 'text-white',
    },
  };

  const style = typeStyles[type];

  return (
    <div
      className={`
        fixed top-6 right-6 z-[9999] 
        max-w-md w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className={`
          ${style.bg} ${style.text}
          rounded-2xl shadow-2xl
          p-4 pr-12
          relative overflow-hidden
          backdrop-blur-sm
        `}
      >
        {/* Efecto de brillo animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

        <div className="relative flex items-start gap-4">
          {/* Icono */}
          <div className={`${style.iconBg} rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 text-xl font-bold`}>
            {style.icon}
          </div>

          {/* Contenido */}
          <div className="flex-1 pt-1">
            <h4 className="font-semibold text-base mb-1">{message}</h4>
            {description && (
              <p className="text-sm opacity-95">{description}</p>
            )}
          </div>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          aria-label="Cerrar"
        >
          <span className="text-sm">✕</span>
        </button>

        {/* Barra de progreso */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div
            className="h-full bg-white/60 transition-all ease-linear"
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Función helper para mostrar toasts
let toastContainer: HTMLDivElement | null = null;
let toastRoot: ReturnType<typeof createRoot> | null = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
    toastRoot = createRoot(toastContainer);
  }
  return { container: toastContainer, root: toastRoot! };
}

export function showToast(
  message: string,
  options?: {
    description?: string;
    type?: ToastType;
    duration?: number;
  }
) {
  const { root } = getToastContainer();

  const handleClose = () => {
    root.render(null);
  };

  root.render(
    <Toast
      message={message}
      description={options?.description}
      type={options?.type || 'info'}
      duration={options?.duration || 4000}
      onClose={handleClose}
    />
  );
}

// Helpers específicos
export const toast = {
  success: (message: string, description?: string) =>
    showToast(message, { description, type: 'success' }),
  error: (message: string, description?: string) =>
    showToast(message, { description, type: 'error' }),
  warning: (message: string, description?: string) =>
    showToast(message, { description, type: 'warning' }),
  info: (message: string, description?: string) =>
    showToast(message, { description, type: 'info' }),
};

