/**
 * RegisterForm Component
 * Formulario de registro de usuario
 */

import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Button, Input, Label, Checkbox } from '@/components/ui';
import { AUTH_MESSAGES } from '@/constants';
import { validators, type ValidationErrors } from '@/utils';
import type { RegisterCredentials } from '@/types';
import { useAuth } from '../hooks/useAuth';
import { RegisterFormHeader } from './RegisterFormHeader';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function RegisterForm({ onSuccess, onLoginClick }: RegisterFormProps) {
  const { register, isRegistering, registerError } = useAuth();

  // Estado del formulario
  const [formData, setFormData] = useState<RegisterCredentials>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<ValidationErrors<RegisterCredentials>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Validar campo individual
  const validateField = (field: keyof RegisterCredentials, value: unknown): string | undefined => {
    switch (field) {
      case 'name':
        return validators.name(value as string);
      case 'email':
        return validators.email(value as string);
      case 'phone':
        return validators.phone(value as string);
      case 'password':
        return validators.password(value as string);
      case 'confirmPassword': {
        const confirmPassword = value as string;
        if (!confirmPassword) {
          return 'Confirma tu contraseña';
        }
        if (formData.password !== confirmPassword) {
          return 'Las contraseñas no coinciden';
        }
        return undefined;
      }
      case 'acceptTerms':
        return (value as boolean) ? undefined : 'Debes aceptar los términos y condiciones';
      default:
        return undefined;
    }
  };

  // Validar todo el formulario
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors<RegisterCredentials> = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      phone: validateField('phone', formData.phone),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword),
      acceptTerms: validateField('acceptTerms', formData.acceptTerms),
    };

    const filteredErrors = Object.entries(newErrors).reduce(
      (acc, [key, value]) => {
        if (value) acc[key as keyof RegisterCredentials] = value;
        return acc;
      },
      {} as ValidationErrors<RegisterCredentials>
    );

    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  };

  // Manejar cambio en inputs
  const handleChange = (field: keyof RegisterCredentials) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = field === 'acceptTerms' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Limpiar error al escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Manejar blur - solo valida si ya se intentó hacer submit
  const handleBlur = (field: keyof RegisterCredentials) => () => {
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
      await register(formData);
      onSuccess?.();
    } catch (error) {
      // El error ya se maneja en useAuth
      console.error('Error en registro:', error);
    }
  };

  return (
    <div className="w-full">
      <RegisterFormHeader />

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {/* Nombre */}
        <div>
          <Label htmlFor="name" className="mb-2 block">{AUTH_MESSAGES.REGISTER.NAME_LABEL}</Label>
          <Input
            id="name"
            type="text"
            placeholder={AUTH_MESSAGES.REGISTER.NAME_PLACEHOLDER}
            value={formData.name}
            onChange={handleChange('name')}
            onBlur={handleBlur('name')}
            error={errors.name}
            disabled={isRegistering}
            autoComplete="name"
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="mb-2 block">{AUTH_MESSAGES.REGISTER.EMAIL_LABEL}</Label>
          <Input
            id="email"
            type="email"
            placeholder={AUTH_MESSAGES.REGISTER.EMAIL_PLACEHOLDER}
            value={formData.email}
            onChange={handleChange('email')}
            onBlur={handleBlur('email')}
            error={errors.email}
            disabled={isRegistering}
            autoComplete="email"
          />
        </div>

        {/* Teléfono */}
        <div>
          <Label htmlFor="phone" className="mb-2 block">{AUTH_MESSAGES.REGISTER.PHONE_LABEL}</Label>
          <Input
            id="phone"
            type="tel"
            placeholder={AUTH_MESSAGES.REGISTER.PHONE_PLACEHOLDER}
            value={formData.phone}
            onChange={handleChange('phone')}
            onBlur={handleBlur('phone')}
            error={errors.phone}
            disabled={isRegistering}
            autoComplete="tel"
          />
        </div>

        {/* Contraseña */}
        <div>
          <Label htmlFor="password" className="mb-2 block">{AUTH_MESSAGES.REGISTER.PASSWORD_LABEL}</Label>
          <Input
            id="password"
            type="password"
            placeholder={AUTH_MESSAGES.REGISTER.PASSWORD_PLACEHOLDER}
            value={formData.password}
            onChange={handleChange('password')}
            onBlur={handleBlur('password')}
            error={errors.password}
            disabled={isRegistering}
            autoComplete="new-password"
          />
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <Label htmlFor="confirmPassword" className="mb-2 block">{AUTH_MESSAGES.REGISTER.CONFIRM_PASSWORD_LABEL}</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder={AUTH_MESSAGES.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            onBlur={handleBlur('confirmPassword')}
            error={errors.confirmPassword}
            disabled={isRegistering}
            autoComplete="new-password"
          />
        </div>

        {/* Aceptar términos */}
        <div className="flex items-start">
          <Checkbox
            id="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange('acceptTerms')}
            disabled={isRegistering}
            label={AUTH_MESSAGES.REGISTER.ACCEPT_TERMS}
          />
        </div>

        {/* Error general */}
        {registerError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              {registerError.message || AUTH_MESSAGES.REGISTER.REGISTRATION_ERROR}
            </p>
          </div>
        )}

        {/* Botón de submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isRegistering}
          disabled={isRegistering}
        >
          {AUTH_MESSAGES.REGISTER.SUBMIT_BUTTON}
        </Button>

        {/* Link de login */}
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={onLoginClick}
            disabled={isRegistering}
            className="text-[#0066CC]"
          >
            {AUTH_MESSAGES.REGISTER.LOGIN_LINK}
          </Button>
        </div>
      </form>
    </div>
  );
}
