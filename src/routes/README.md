# Routes

Configuración de rutas de TanStack Router con arquitectura de Layout Routes.

## Estructura

```
routes/
├── __root.tsx                  # Ruta raíz (Outlet principal)
├── index.tsx                   # Login (/) - Sin layout
├── _authenticated.tsx          # Layout para rutas autenticadas (TopBar + Sidebar)
└── _authenticated/             # Rutas hijas con layout autenticado
    ├── dashboard.tsx           # /dashboard
    ├── en-vivo.tsx            # /en-vivo
    └── simulacion.tsx         # /simulacion
```

## Layout Routes (Archivos con `_`)

Los archivos que empiezan con `_` son **Layout Routes**:
- No tienen su propia URL
- Wrappean las rutas hijas con un layout común
- Evitan duplicación de código (DRY)

### Ejemplo: `_authenticated.tsx`

```tsx
// Este layout incluye TopBar y Sidebar
function AuthenticatedLayout() {
  return (
    <>
      <TopBar />
      <Sidebar />
      <main>
        <Outlet /> {/* Aquí se renderizan las páginas hijas */}
      </main>
    </>
  );
}
```

## Convenciones

### ✅ Páginas dentro de layouts

Las páginas deben ser **solo contenido**, sin repetir TopBar/Sidebar:

```tsx
// ✅ CORRECTO
export function DashboardPage() {
  return <div>Contenido del dashboard</div>;
}

// ❌ INCORRECTO
export function DashboardPage() {
  return (
    <>
      <TopBar />      {/* NO - El layout ya lo incluye */}
      <Sidebar />     {/* NO - El layout ya lo incluye */}
      <div>Contenido</div>
    </>
  );
}
```

### Rutas sin layout

Rutas como `/` (login) están fuera de `_authenticated/` y no tienen layout.

## Agregar nueva ruta autenticada

1. Crear archivo en `_authenticated/mi-ruta.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { MiPage } from '@/pages';

export const Route = createFileRoute('/_authenticated/mi-ruta')({
  component: MiPage,
});
```

2. La página debe ser solo contenido (sin layout):

```tsx
export function MiPage() {
  return <div>Mi contenido</div>;
}
```

3. TanStack Router regenerará automáticamente el árbol de rutas.

## Rutas principales

- `/` - Login (sin layout)
- `/dashboard` - Dashboard principal
- `/en-vivo` - Mapa en modo tiempo real
- `/simulacion` - Mapa en modo simulación

## Beneficios de Layout Routes

- ✅ **DRY** - Layout definido una sola vez
- ✅ **Mantenible** - Cambios al layout en un solo lugar
- ✅ **Performance** - Layout no se re-renderiza entre páginas
- ✅ **Escalable** - Fácil agregar múltiples layouts
- ✅ **Type-safe** - TypeScript infiere las rutas automáticamente
