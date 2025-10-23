/**
 * Auth Service
 * Servicios para autenticación y gestión de sesiones
 */

import type { LoginCredentials, AuthResponse } from '@/types';
import { API_BASE_URL } from '@/constants'; // Descomentar cuando se conecte al backend

/**
 * Servicio de autenticación
 */
export const authService = {
  /**
   * Inicia sesión con credenciales
   * @param credentials - Email y contraseña del usuario
   * @returns Respuesta con usuario y token
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // TODO: Reemplazar con llamada real al backend cuando esté disponible
    // const response = await fetch(`${API_BASE_URL}/auth/login`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     email: credentials.email,
    //     password: credentials.password,
    //   }),
    // });
    //
    // if (!response.ok) {
    //   const error = await response.json();
    //   throw new Error(error.message || 'Error al iniciar sesión');
    // }
    //
    // return response.json();

    // Mock temporal para desarrollo
    /*return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simula validación de credenciales
        if (credentials.email && credentials.password) {
          resolve({
            user: {
              id: '1',
              email: credentials.email,
              name: 'Usuario Demo',
              role: 'admin',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            token: 'mock-jwt-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
          });
        } else {
          reject(new Error('Credenciales inválidas'));
        }
      }, 1000); // Simula latencia de red
    });*/
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(err || 'Error al iniciar sesión');
    }

    return res.json();
  },

  /**
   * Cierra sesión del usuario
   */
  logout: async (): Promise<void> => {
    // TODO: Reemplazar con llamada real al backend cuando esté disponible
    // await fetch(`${API_BASE_URL}/auth/logout`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //   },
    // });

    // Mock temporal
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  },

  /**
   * Obtiene el usuario actual desde el token
   */
  getCurrentUser: async (token: string): Promise<AuthResponse['user']> => {
    // TODO: Reemplazar con llamada real al backend cuando esté disponible
    // const response = await fetch(`${API_BASE_URL}/auth/me`, {
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //   },
    // });
    //
    // if (!response.ok) {
    //   throw new Error('No autorizado');
    // }
    //
    // return response.json();

    // Mock temporal
    /*return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (token) {
          resolve({
            id: '1',
            email: 'usuario@ejemplo.com',
            name: 'Usuario Demo',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          reject(new Error('Token inválido'));
        }
      }, 500);
    });*/
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('No autorizado');

    const me = await res.json(); // { email_: string }
    return {
      id: 'me',
      email: me.email_ ?? '',
      name: 'Usuario',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Refresca el token de acceso
   */
  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    // TODO: Reemplazar con llamada real al backend cuando esté disponible
    // const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ refreshToken }),
    // });
    //
    // if (!response.ok) {
    //   throw new Error('No se pudo refrescar el token');
    // }
    //
    // return response.json();

    // Mock temporal - simula validación del token
    console.log('Refreshing token:', refreshToken);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'new-mock-jwt-token-' + Date.now(),
        });
      }, 500);
    });
  },
};

