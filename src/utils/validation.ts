/**
 * Validation Utilities
 * Funciones para validar formularios
 */

export const validators = {
  /**
   * Valida formato de email
   */
  email: (value: string): string | undefined => {
    if (!value) {
      return 'El correo electrónico es requerido';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Ingresa un correo electrónico válido';
    }
    return undefined;
  },

  /**
   * Valida contraseña
   */
  password: (value: string): string | undefined => {
    if (!value) {
      return 'La contraseña es requerida';
    }
    if (value.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }
    return undefined;
  },

  /**
   * Valida campo requerido
   */
  required: (value: string, fieldName: string = 'Este campo'): string | undefined => {
    if (!value || value.trim() === '') {
      return `${fieldName} es requerido`;
    }
    return undefined;
  },
};

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Valida un objeto completo con un schema de validadores
 */
export function validateForm<T extends Record<string, any>>(
  values: T,
  schema: Partial<Record<keyof T, (value: any) => string | undefined>>
): ValidationErrors<T> {
  const errors: ValidationErrors<T> = {};

  for (const key in schema) {
    const validator = schema[key];
    if (validator) {
      const error = validator(values[key]);
      if (error) {
        errors[key] = error;
      }
    }
  }

  return errors;
}

