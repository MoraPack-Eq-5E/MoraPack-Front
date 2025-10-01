# Feature: Authentication

Esta carpeta contiene todo lo relacionado con autenticación y autorización.

## Estructura

- **components/**: Componentes específicos de auth (LoginForm, RegisterForm, etc.)
- **hooks/**: Custom hooks para auth (useAuth, useUser, etc.)
- **services/**: Servicios de API para login, logout, registro, etc.

## Ejemplo de uso

```typescript
import { useAuth } from '@/features/auth/hooks/useAuth';
import { LoginForm } from '@/features/auth/components/LoginForm';
```

