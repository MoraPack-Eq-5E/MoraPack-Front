/**
 * LoginForm Component
 * Formulario de inicio de sesión
 */

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Button, Input, Label, Checkbox } from '@/components/ui';
import { AUTH_MESSAGES } from '@/constants';
import { validators, type ValidationErrors } from '@/utils';
import type { LoginCredentials } from '@/types';
import { useAuth } from '../hooks/useAuth';
import { LoginFormHeader } from './LoginFormHeader';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { login, isLoggingIn, loginError } = useAuth();

  // Estado del formulario
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<ValidationErrors<LoginCredentials>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Validar campo individual
  const validateField = (field: keyof LoginCredentials, value: unknown): string | undefined => {
    if (field === 'email') return validators.email(value as string);
    if (field === 'password') return validators.password(value as string);
    return undefined;
  };

  // Validar todo el formulario
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors<LoginCredentials> = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };

    const filteredErrors = Object.entries(newErrors).reduce(
      (acc, [key, value]) => {
        if (value) acc[key as keyof LoginCredentials] = value;
        return acc;
      },
      {} as ValidationErrors<LoginCredentials>
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  // Manejar cambio en inputs
  const handleChange = (field: keyof LoginCredentials) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar error al escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Manejar blur - solo valida si ya se intentó hacer submit
  const handleBlur = (field: keyof LoginCredentials) => () => {
    if (!hasSubmitted) return;

    const error = validateField(field, formData[field]);
    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // Manejar submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasSubmitted(true);

    if (!validateForm()) return;

    try {
      await login(formData);
      onSuccess?.();
    } catch (error) {
      // El error ya se maneja en useAuth
      console.error('Error en login:', error);
    }
  };

  return (
    <div className="w-full">
      <LoginFormHeader />

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Email */}
        <div>
          <Label htmlFor="email" className="mb-2 block">{AUTH_MESSAGES.LOGIN.EMAIL_LABEL}</Label>
          <Input
            id="email"
            type="email"
            placeholder={AUTH_MESSAGES.LOGIN.EMAIL_PLACEHOLDER}
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={errors.email}
            disabled={isLoggingIn}
            autoComplete="email"
          />
        </div>

        {/* Contraseña */}
        <div>
          <Label htmlFor="password" className="mb-2 block">{AUTH_MESSAGES.LOGIN.PASSWORD_LABEL}</Label>
          <Input
            id="password"
            type="password"
            placeholder={AUTH_MESSAGES.LOGIN.PASSWORD_PLACEHOLDER}
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            error={errors.password}
            disabled={isLoggingIn}
            autoComplete="current-password"
          />
        </div>

        {/* Recuérdame */}
        <div className="flex items-center">
          <Checkbox
            id="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange('rememberMe')}
            disabled={isLoggingIn}
            label={AUTH_MESSAGES.LOGIN.REMEMBER_ME}
          />
        </div>

        {/* Error general */}
        {loginError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              {loginError.message || AUTH_MESSAGES.LOGIN.INVALID_CREDENTIALS}
            </p>
          </div>
        )}

        {/* Botón de submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoggingIn}
          disabled={isLoggingIn}
        >
          {AUTH_MESSAGES.LOGIN.SUBMIT_BUTTON}
        </Button>

        {/* Link de registro */}
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={onRegisterClick}
            disabled={isLoggingIn}
            className="text-[#0066CC]"
          >
            {AUTH_MESSAGES.LOGIN.REGISTER_LINK}
          </Button>
        </div>
      </form>
    </div>
  );
}

