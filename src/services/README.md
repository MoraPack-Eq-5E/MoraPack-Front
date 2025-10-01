# Services

Servicios y funciones para comunicación con APIs.

## Estructura

Organiza los servicios por dominio:

```
services/
├── api-client.ts      # Cliente HTTP base
├── auth.service.ts    # Endpoints de autenticación
├── reports.service.ts # Endpoints de reportes
└── ...
```

## Ejemplo

```typescript
// services/reports.service.ts
export const reportsService = {
  getAll: () => fetch('/api/reports'),
  getById: (id: string) => fetch(`/api/reports/${id}`),
  create: (data: Report) => fetch('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
};
```

