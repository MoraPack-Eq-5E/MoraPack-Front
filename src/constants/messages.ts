/**
 * Application Messages
 * Mensajes y constantes de texto de la aplicación
 */

export const AUTH_MESSAGES = {
  LOGIN: {
    TITLE: 'Iniciar Sesión',
    SUBTITLE: 'Bienvenido a MoraPack',
    EMAIL_LABEL: 'Correo Electrónico',
    EMAIL_PLACEHOLDER: 'usuario@ejemplo.com',
    PASSWORD_LABEL: 'Contraseña',
    PASSWORD_PLACEHOLDER: '••••••••',
    REMEMBER_ME: 'Recuérdame',
    SUBMIT_BUTTON: 'Iniciar Sesión',
    REGISTER_LINK: 'Registrarse',
    SUCCESS: 'Inicio de sesión exitoso',
    ERROR: 'Error al iniciar sesión',
    INVALID_CREDENTIALS: 'Correo o contraseña incorrectos',
  },
  LOGOUT: {
    SUCCESS: 'Sesión cerrada exitosamente',
  },
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo es requerido',
  INVALID_EMAIL: 'Ingresa un correo electrónico válido',
  MIN_PASSWORD_LENGTH: 'La contraseña debe tener al menos 6 caracteres',
} as const;

