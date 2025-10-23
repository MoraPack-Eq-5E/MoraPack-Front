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
  REGISTER: {
    TITLE: 'Crear Cuenta',
    SUBTITLE: 'Únete a MoraPack',
    NAME_LABEL: 'Nombre Completo',
    NAME_PLACEHOLDER: 'Tu nombre completo',
    EMAIL_LABEL: 'Correo Electrónico',
    EMAIL_PLACEHOLDER: 'usuario@ejemplo.com',
    PHONE_LABEL: 'Número de Teléfono',
    PHONE_PLACEHOLDER: '+51 990509059',
    PASSWORD_LABEL: 'Contraseña',
    PASSWORD_PLACEHOLDER: '••••••••',
    CONFIRM_PASSWORD_LABEL: 'Confirmar Contraseña',
    CONFIRM_PASSWORD_PLACEHOLDER: '••••••••',
    ACCEPT_TERMS: 'Acepto los términos y condiciones',
    SUBMIT_BUTTON: 'Crear Cuenta',
    LOGIN_LINK: '¿Ya tienes cuenta? Iniciar Sesión',
    SUCCESS: 'Cuenta creada exitosamente',
    ERROR: 'Error al crear la cuenta',
    REGISTRATION_ERROR: 'Error al crear la cuenta',
  },
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'Este campo es requerido',
  INVALID_EMAIL: 'Ingresa un correo electrónico válido',
  MIN_PASSWORD_LENGTH: 'La contraseña debe tener al menos 8 caracteres',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden',
} as const;