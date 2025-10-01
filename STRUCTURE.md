# 📐 Guía de Estructura del Proyecto

Esta guía detalla la arquitectura y organización del código del proyecto MoraPack Front.

## 🎯 Filosofía de la Estructura

El proyecto utiliza una **arquitectura híbrida** que combina:

1. **Feature-Based Architecture**: Cada funcionalidad principal vive en su propio módulo autocontenido
2. **Separation of Concerns**: Clara separación entre presentación, lógica de negocio y datos
3. **Scalability First**: Diseñado para crecer sin volverse caótico

## 📂 Explicación Detallada de Carpetas

### `/src/assets/`
Recursos estáticos de la aplicación.

- **`icons/`**: Iconos SVG personalizados o logos
- **`images/`**: Imágenes, ilustraciones, fotos

**Cuándo usar:**
- Archivos que se importan directamente en el código
- Recursos que necesitan procesamiento por Vite

**Cuándo NO usar:**
- Archivos estáticos que no cambian → usar `/public/`

---

### `/src/components/`
Componentes reutilizables sin lógica de negocio específica.

#### `/src/components/ui/`
Componentes de interfaz primitivos y reutilizables.

**Características:**
- Sin lógica de negocio
- Altamente reutilizables
- Bien tipados
- Basados en Radix UI cuando sea posible
- Estilizados con Tailwind CSS

**Ejemplos:**
```typescript
// ✅ Pertenece aquí
- Button
- Input
- Card
- Modal
- Dropdown
- Tooltip
- Badge
- Avatar

// ❌ NO pertenece aquí
- LoginForm (va en features/auth/components)
- ReportCard (va en features/reports/components)
```

#### `/src/components/layout/`
Componentes de estructura y navegación.

**Ejemplos:**
- Header
- Sidebar
- Footer
- Navigation
- MainLayout
- DashboardLayout

---

### `/src/features/`
**⭐ Corazón de la aplicación** - Módulos organizados por funcionalidad de negocio.

Cada feature es **autocontenido** y contiene:
- `components/`: Componentes específicos del feature
- `hooks/`: Custom hooks del feature
- `services/`: Llamadas a API relacionadas
- `types/`: Tipos específicos (opcional)
- `utils/`: Utilidades específicas (opcional)
- `README.md`: Documentación del feature

#### Features Actuales:

**`/auth/`** - Autenticación y autorización
```
auth/
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ProtectedRoute.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useUser.ts
└── services/
    └── auth.service.ts
```

**`/dashboard/`** - Dashboard principal
```
dashboard/
└── components/
    ├── StatsCard.tsx
    ├── QuickActions.tsx
    └── RecentActivity.tsx
```

**`/reports/`** - Sistema de reportes
```
reports/
└── components/
    ├── ReportSelector.tsx
    ├── ReportChart.tsx
    ├── ReportFilters.tsx
    └── ReportExport.tsx
```

**`/services/`** - Gestión de servicios
```
services/
└── components/
    ├── ServiceList.tsx
    ├── ServiceForm.tsx
    └── ServiceCard.tsx
```

**`/communities/`** - Gestión de comunidades
**`/memberships/`** - Gestión de membresías

**Reglas de Features:**
1. ✅ Cada feature es independiente
2. ✅ Un feature puede importar de `components/ui` o `lib`
3. ❌ Un feature NO debe importar de otro feature
4. ✅ Si necesitas compartir código entre features, muévelo a `hooks/` o `utils/`

---

### `/src/hooks/`
Custom hooks globales reutilizables.

**Ejemplos:**
```typescript
// useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T { ... }

// useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) { ... }

// useMediaQuery.ts
export function useMediaQuery(query: string): boolean { ... }

// useClickOutside.ts
export function useClickOutside(ref: RefObject, handler: () => void) { ... }
```

**Criterio:**
- Hook usado en 2+ features diferentes → aquí
- Hook específico de un feature → `features/[nombre]/hooks/`

---

### `/src/lib/`
Configuración y wrappers de librerías externas.

**Archivos comunes:**

```typescript
// query-client.ts - Config de TanStack Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 3,
    },
  },
});

// router.ts - Config de TanStack Router
export const router = createRouter({ ... });

// api.ts - Cliente HTTP
export const api = {
  get: (url: string) => fetch(`${API_BASE_URL}${url}`),
  post: (url: string, data: unknown) => fetch(`${API_BASE_URL}${url}`, { ... }),
};

// cn.ts - Utilidad para clases de Tailwind (ya creado)
export function cn(...inputs: ClassValue[]) { ... }
```

---

### `/src/pages/`
Componentes de página completos que representan rutas.

**Estructura:**
```typescript
// pages/dashboard.tsx
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/features/dashboard/components/stats-card';

export function DashboardPage() {
  return (
    <DashboardLayout>
      <h1>Dashboard</h1>
      <StatsCard />
    </DashboardLayout>
  );
}
```

**Responsabilidades:**
- Composición de componentes
- Layout de la página
- Gestión de estados de página (no de negocio)
- Manejo de rutas y navegación

---

### `/src/routes/`
Definición de rutas con TanStack Router.

**Ejemplo:**
```typescript
// routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '@/pages/dashboard';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  loader: async () => {
    // Prefetch data
  },
});
```

---

### `/src/services/`
Servicios para comunicación con APIs.

**Patrón recomendado:**
```typescript
// services/reports.service.ts
import { API_BASE_URL } from '@/constants';

export const reportsService = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/reports`);
    if (!response.ok) throw new Error('Failed to fetch reports');
    return response.json();
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/reports/${id}`);
    if (!response.ok) throw new Error('Failed to fetch report');
    return response.json();
  },

  create: async (data: CreateReportDTO) => {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create report');
    return response.json();
  },
};
```

---

### `/src/types/`
Definiciones de tipos e interfaces globales.

**Organización:**
```typescript
// types/index.ts
export * from './api';
export * from './ui';
export * from './utils';

// types/api.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Report {
  id: string;
  title: string;
  data: ReportData;
}

// types/ui.ts
export type Theme = 'light' | 'dark';
export type Size = 'sm' | 'md' | 'lg';
```

---

### `/src/utils/`
Funciones auxiliares puras.

**Ejemplos:**
```typescript
// utils/formatters.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-CO').format(new Date(date));
}

// utils/validators.ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// utils/performance.ts
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

---

### `/src/constants/`
Constantes y configuraciones globales.

Ya incluye:
- `API_BASE_URL`
- `APP_NAME`, `APP_VERSION`
- `PAGINATION_LIMIT`
- `MESSAGES` para errores y éxitos

---

## 🔄 Flujo de Datos Recomendado

```
User Action
    ↓
Component (UI)
    ↓
Hook (useQuery/useMutation)
    ↓
Service (API call)
    ↓
Backend API
    ↓
Response
    ↓
TanStack Query (cache)
    ↓
Component (render)
```

## 📝 Ejemplo Completo: Feature de Reportes

```
1. Usuario hace clic en "Ver Reportes"
   → pages/reports.tsx

2. Página usa hook personalizado
   → features/reports/hooks/useReports.ts

3. Hook usa TanStack Query con servicio
   → services/reports.service.ts

4. Servicio llama a la API
   → fetch(API_BASE_URL + '/reports')

5. Datos vuelven y se renderizan
   → features/reports/components/ReportList.tsx

6. Componente usa componentes UI
   → components/ui/Card.tsx
   → components/ui/Button.tsx
```

## ✅ Checklist para Agregar Código Nuevo

### Nuevo Componente UI
- [ ] ¿Es reutilizable en múltiples features? → `components/ui/`
- [ ] ¿Es parte de la estructura/navegación? → `components/layout/`
- [ ] ¿Es específico de un feature? → `features/[nombre]/components/`

### Nuevo Hook
- [ ] ¿Se usa en múltiples features? → `hooks/`
- [ ] ¿Es específico de un feature? → `features/[nombre]/hooks/`

### Nueva Función
- [ ] ¿Es una función pura/utilidad? → `utils/`
- [ ] ¿Es específica de un feature? → `features/[nombre]/utils/`

### Nueva Llamada a API
- [ ] ¿Es usada por múltiples features? → `services/`
- [ ] ¿Es específica de un feature? → `features/[nombre]/services/`

### Nuevo Tipo
- [ ] ¿Es usado globalmente? → `types/`
- [ ] ¿Es específico de un feature? → `features/[nombre]/types/`

## 🚀 Tips y Mejores Prácticas

### 1. Usa Barrel Exports
```typescript
// ✅ Bueno
// components/ui/index.ts
export { Button } from './button';
export { Input } from './input';

// Importar
import { Button, Input } from '@/components/ui';

// ❌ Malo
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
```

### 2. Coloca Archivos Cerca de Donde se Usan
```
// ✅ Específico del feature
features/reports/components/ReportChart.tsx

// ❌ Global sin razón
components/ReportChart.tsx
```

### 3. Evita Dependencias Circulares
```typescript
// ❌ Malo
// features/auth/utils.ts
import { something } from '@/features/reports/utils';

// ✅ Bueno - mueve código compartido
// utils/shared.ts
export function something() { ... }
```

### 4. Mantén Componentes Pequeños
Si un componente supera ~200 líneas, considera dividirlo.

### 5. Un Archivo, Un Propósito
Cada archivo debe tener una responsabilidad clara.

## 📚 Recursos Adicionales

- [React Best Practices 2025](https://react.dev/learn)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Router Docs](https://tanstack.com/router/latest)
- [Radix UI Docs](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

**¿Preguntas sobre dónde poner algo?** Pregúntate:
1. ¿Es reutilizable? → carpeta compartida
2. ¿Es específico? → dentro del feature
3. ¿Lo usarán otros features? → carpeta global
4. ¿Es configuración de librería? → `lib/`

