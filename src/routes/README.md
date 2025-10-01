# Routes

Configuración de rutas de TanStack Router.

## Estructura

Cada archivo de ruta debe seguir la convención de TanStack Router:

```typescript
// routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});
```

## Rutas principales

- `/` - Home/Landing
- `/dashboard` - Dashboard principal
- `/reports` - Reportes
- `/services` - Gestión de servicios
- `/communities` - Gestión de comunidades
- `/memberships` - Gestión de membresías

