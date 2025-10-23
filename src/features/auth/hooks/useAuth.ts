/**
 * useAuth Hook
 * Hook personalizado para manejo de autenticación
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import type { LoginCredentials, RegisterCredentials, User, AuthError } from '@/types';
import { useCallback } from 'react';

// Keys para query cache
const AUTH_KEYS = {
  user: ['auth', 'user'] as const,
  token: 'auth_token',
  refreshToken: 'auth_refresh_token',
  rememberMe: 'auth_remember_me',
};

/**
 * Hook principal de autenticación
 */
export function useAuth() {
  const queryClient = useQueryClient();

  // Storage helpers
  const getStoredToken = useCallback((): string | null => {
    const rememberMe = localStorage.getItem(AUTH_KEYS.rememberMe) === 'true';
    const storage = rememberMe ? localStorage : sessionStorage;
    return storage.getItem(AUTH_KEYS.token);
  }, []);

  const setStoredToken = useCallback((token: string, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(AUTH_KEYS.token, token);
    localStorage.setItem(AUTH_KEYS.rememberMe, String(rememberMe));
  }, []);

  const clearStorage = useCallback(() => {
    [AUTH_KEYS.token, AUTH_KEYS.refreshToken, AUTH_KEYS.rememberMe].forEach((key) =>
      localStorage.removeItem(key)
    );
    sessionStorage.removeItem(AUTH_KEYS.token);
  }, []);

  // Query para obtener usuario actual
  const {
    data: user,
    isLoading: isLoadingUser,
    error: userError,
  } = useQuery<User | null, Error>({
    queryKey: AUTH_KEYS.user,
    queryFn: async () => {
      const token = getStoredToken();
      if (!token) return null;

      try {
        return await authService.getCurrentUser(token);
      } catch (error) {
        clearStorage();
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false,
  });

  // Mutation para login
  const loginMutation = useMutation<
    { user: User; token: string; refreshToken?: string },
    Error,
    LoginCredentials
  >({
    mutationFn: authService.login,
    onSuccess: (data, variables) => {
      setStoredToken(data.token, variables.rememberMe || false);

      if (data.refreshToken) {
        localStorage.setItem(AUTH_KEYS.refreshToken, data.refreshToken);
      }

      queryClient.setQueryData(AUTH_KEYS.user, data.user);
    },
    onError: (error) => {
      clearStorage();
      console.error('Error en login:', error);
    },
  });

  // Mutation para registro
  const registerMutation = useMutation<
    { user: User; token: string; refreshToken?: string },
    Error,
    RegisterCredentials
  >({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setStoredToken(data.token, false); // No recordar por defecto en registro

      if (data.refreshToken) {
        localStorage.setItem(AUTH_KEYS.refreshToken, data.refreshToken);
      }

      queryClient.setQueryData(AUTH_KEYS.user, data.user);
    },
    onError: (error) => {
      clearStorage();
      console.error('Error en registro:', error);
    },
  });

  // Mutation para logout
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      clearStorage();
      queryClient.setQueryData(AUTH_KEYS.user, null);
      queryClient.clear(); // Limpiar todo el cache
    },
  });

  // Funciones de autenticación
  const login = useCallback(
    (credentials: LoginCredentials) => loginMutation.mutateAsync(credentials),
    [loginMutation]
  );

  const register = useCallback(
    (credentials: RegisterCredentials) => registerMutation.mutateAsync(credentials),
    [registerMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Forzar logout local aunque falle el servidor
      clearStorage();
      queryClient.setQueryData(AUTH_KEYS.user, null);
      console.error('Error en logout:', error);
    }
  }, [logoutMutation, clearStorage, queryClient]);

  // Estado de autenticación
  const isAuthenticated = !!user && !!getStoredToken();
  const isLoading = isLoadingUser || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending;

  return {
    // Estado
    user,
    isAuthenticated,
    isLoading,
    error: (loginMutation.error || userError) as AuthError | null,

    // Acciones
    login,
    register,
    logout,

    // Estados de mutaciones
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}

