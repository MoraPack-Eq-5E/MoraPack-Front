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
    if (value.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return 'La contraseña debe contener al menos una letra minúscula';
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return 'La contraseña debe contener al menos una letra mayúscula';
    }
    if (!/(?=.*\d)/.test(value)) {
      return 'La contraseña debe contener al menos un número';
    }
    return undefined;
  },

  /**
   * Valida nombre completo
   */
  name: (value: string): string | undefined => {
    if (!value) {
      return 'El nombre es requerido';
    }
    if (value.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }
    if (value.trim().length > 50) {
      return 'El nombre no puede tener más de 50 caracteres';
    }
    return undefined;
  },

  /**
   * Valida número de teléfono
   */
  phone: (value: string): string | undefined => {
    if (!value) {
      return 'El teléfono es requerido';
    }
    // Remover espacios, guiones y paréntesis para validar
    const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return 'Ingresa un número de teléfono válido';
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

