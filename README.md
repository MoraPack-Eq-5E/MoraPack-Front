# MoraPack Front

Panel de administración frontend para el proyecto MoraPack, construido con tecnologías modernas de React.

> 🚀 **[¿Primera vez aquí? Lee la Guía de Inicio Rápido →](./QUICK_START.md)**

## 🚀 Stack Tecnológico

Este proyecto utiliza las siguientes tecnologías:

- **[React 19](https://react.dev/)** - Biblioteca de UI
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático
- **[Vite](https://vitejs.dev/)** - Build tool y dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework de CSS utility-first
- **[Radix UI](https://www.radix-ui.com/)** - Componentes accesibles y sin estilos
  - `@radix-ui/react-dialog` - Modales y diálogos
  - `@radix-ui/react-dropdown-menu` - Menús desplegables
  - `@radix-ui/react-tooltip` - Tooltips
- **[TanStack Query](https://tanstack.com/query)** - Manejo de estado asíncrono y caché
- **[TanStack Router](https://tanstack.com/router)** - Enrutamiento type-safe
- **[Lucide React](https://lucide.dev/)** - Iconos modernos
- **[ESLint](https://eslint.org/)** - Linting de código

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **pnpm** (gestor de paquetes)

Para instalar pnpm globalmente:

```bash
npm install -g pnpm
```

## 🛠️ Instalación

1. Clona el repositorio:

```bash
git clone <url-del-repositorio>
cd MoraPack-Front
```

2. Instala las dependencias:

```bash
pnpm install
```

## 🏃‍♂️ Comandos Disponibles

### Modo Desarrollo

Inicia el servidor de desarrollo con hot-reload:

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:5173`

### Build de Producción

Compila el proyecto para producción:

```bash
pnpm build
```

Los archivos compilados se generarán en la carpeta `dist/`

### Preview de Producción

Previsualiza el build de producción localmente:

```bash
pnpm preview
```

### Linting

Ejecuta ESLint para verificar la calidad del código:

```bash
pnpm lint
```

## 📁 Estructura del Proyecto

El proyecto sigue una arquitectura **feature-based** combinada con separación por capas, optimizada para escalabilidad y mantenibilidad.

> 📘 **Para una guía detallada sobre la estructura del proyecto, consulta [STRUCTURE.md](./STRUCTURE.md)**

```
MoraPack-Front/
├── public/                      # Archivos estáticos públicos
│   └── vite.svg
│
├── src/
│   ├── assets/                  # Recursos estáticos
│   │   ├── icons/              # Iconos personalizados
│   │   └── images/             # Imágenes y multimedia
│   │
│   ├── components/              # Componentes reutilizables
│   │   ├── ui/                 # Componentes UI base (Button, Input, Card, etc.)
│   │   └── layout/             # Componentes de estructura (Header, Sidebar, Footer)
│   │
│   ├── features/                # Módulos por funcionalidad (feature-based)
│   │   ├── auth/               # Autenticación
│   │   │   ├── components/    # Componentes específicos de auth
│   │   │   ├── hooks/         # Hooks de auth (useAuth, useUser)
│   │   │   └── services/      # API calls de auth
│   │   │
│   │   ├── dashboard/          # Dashboard principal
│   │   │   └── components/    # Widgets y componentes del dashboard
│   │   │
│   │   ├── reports/            # Sistema de reportes
│   │   │   └── components/    # Gráficos, filtros, exportación
│   │   │
│   │   ├── services/           # Gestión de servicios
│   │   │   └── components/    # CRUD de servicios
│   │   │
│   │   ├── communities/        # Gestión de comunidades
│   │   │   └── components/    # CRUD de comunidades
│   │   │
│   │   └── memberships/        # Gestión de membresías
│   │       └── components/    # CRUD de membresías
│   │
│   ├── hooks/                   # Custom hooks globales
│   │   └── index.ts            # (useDebounce, useLocalStorage, etc.)
│   │
│   ├── lib/                     # Configuración de librerías
│   │   ├── cn.ts               # Utilidad para clases de Tailwind
│   │   ├── query-client.ts     # Config de TanStack Query (pendiente)
│   │   └── router.ts           # Config de TanStack Router (pendiente)
│   │
│   ├── pages/                   # Páginas/vistas principales
│   │   └── index.ts            # Barrel exports
│   │
│   ├── routes/                  # Definición de rutas (TanStack Router)
│   │   └── README.md           # Guía de rutas
│   │
│   ├── services/                # Servicios de API
│   │   └── README.md           # Guía de servicios
│   │
│   ├── types/                   # Tipos e interfaces TypeScript
│   │   └── index.ts            # Definiciones globales
│   │
│   ├── utils/                   # Funciones auxiliares
│   │   └── index.ts            # (formatters, validators, etc.)
│   │
│   ├── constants/               # Constantes de la aplicación
│   │   └── index.ts            # URLs, mensajes, configuraciones
│   │
│   ├── App.tsx                  # Componente raíz
│   ├── App.css                  # Estilos del componente raíz
│   ├── main.tsx                 # Punto de entrada
│   ├── index.css                # Estilos globales + Tailwind
│   └── vite-env.d.ts            # Tipos de variables de entorno
│
├── .env.example                 # Template de variables de entorno
├── .gitignore                   # Archivos ignorados por Git
├── eslint.config.js             # Configuración de ESLint
├── index.html                   # Template HTML
├── package.json                 # Dependencias y scripts
├── pnpm-lock.yaml               # Lockfile de pnpm
├── tsconfig.json                # Config base de TypeScript
├── tsconfig.app.json            # Config de TypeScript para la app
├── tsconfig.node.json           # Config de TypeScript para Node
├── vite.config.ts               # Configuración de Vite
└── README.md                    # Este archivo
```

### 🏗️ Arquitectura del Proyecto

#### **Feature-Based Architecture**

Cada feature/módulo (`features/*`) contiene todo lo relacionado con esa funcionalidad:
- ✅ Componentes específicos
- ✅ Hooks personalizados
- ✅ Servicios de API
- ✅ Tipos relacionados
- ✅ Tests (cuando se agreguen)

**Ventajas:**
- Código organizado por dominio de negocio
- Fácil de escalar y mantener
- Evita dependencias circulares
- Facilita la colaboración en equipo

#### **Separación de Capas**

1. **Presentación** (`components/`, `pages/`): UI y lógica de presentación
2. **Lógica de Negocio** (`features/`, `hooks/`): Reglas y casos de uso
3. **Datos** (`services/`, `lib/`): Comunicación con APIs
4. **Utilidades** (`utils/`, `constants/`): Funciones auxiliares

## 🚦 Variables de Entorno

El proyecto usa variables de entorno para configuración. Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Variables disponibles:
- `VITE_API_BASE_URL`: URL base de la API backend
- `VITE_APP_NAME`: Nombre de la aplicación
- `VITE_APP_VERSION`: Versión de la aplicación

## 📖 Guía de Uso de la Estructura

### Crear un Nuevo Feature

1. Crea la carpeta del feature en `src/features/mi-feature/`
2. Agrega las subcarpetas necesarias: `components/`, `hooks/`, `services/`
3. Crea un `README.md` explicando el feature

Ejemplo:
```
src/features/mi-feature/
├── components/
│   ├── MiFeatureList.tsx
│   └── MiFeatureForm.tsx
├── hooks/
│   └── useMiFeature.ts
├── services/
│   └── mi-feature.service.ts
└── README.md
```

### Crear un Componente UI

Los componentes en `src/components/ui/` deben ser:
- **Reutilizables**: Usables en cualquier parte del proyecto
- **Sin estado de negocio**: Solo manejan UI
- **Bien tipados**: Props claras con TypeScript
- **Accesibles**: Usar Radix UI cuando sea posible

Ejemplo con Radix UI y Tailwind:
```typescript
// src/components/ui/button.tsx
import { cn } from '@/lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-md font-medium transition-colors',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        className
      )}
      {...props}
    />
  );
}
```

### Usar TanStack Query

Crea servicios en `src/services/` y úsalos con TanStack Query:

```typescript
// src/services/reports.service.ts
export const reportsService = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/reports`);
    return response.json();
  },
};

// src/features/reports/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: reportsService.getAll,
  });
}
```

### Path Aliases

El proyecto está configurado con path aliases para imports limpios:

```typescript
// ❌ Evitar imports relativos complejos
import { Button } from '../../../components/ui/button';

// ✅ Usar path alias '@/'
import { Button } from '@/components/ui/button';
```

Para configurar los aliases, actualiza `tsconfig.app.json` y `vite.config.ts`:

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```typescript
// vite.config.ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## 🎨 Estilos y UI

### Tailwind CSS

El proyecto utiliza Tailwind CSS 4.x. Los estilos se configuran en `src/index.css`.

### Utilidad `cn()`

Usa la función `cn()` de `src/lib/cn.ts` para combinar clases de Tailwind de forma segura:

```typescript
import { cn } from '@/lib/cn';

<div className={cn(
  'base-class',
  condition && 'conditional-class',
  anotherCondition ? 'class-a' : 'class-b',
  props.className
)} />
```

### Radix UI

Los componentes de Radix UI proporcionan:
- Accesibilidad (ARIA) de forma predeterminada
- Flexibilidad total para estilizar con Tailwind
- Comportamiento robusto y probado

Componentes disponibles:
- **Dialog**: Para modales y diálogos
- **Dropdown Menu**: Para menús contextuales
- **Tooltip**: Para información adicional en hover

## 🔄 Gestión de Estado

### TanStack Query

Maneja el estado del servidor (fetching, caching, sincronización):

```typescript
import { useQuery } from '@tanstack/react-query';

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
  });
}
```

### TanStack Query Devtools

En desarrollo, las devtools están disponibles para inspeccionar queries y mutaciones.

## 🗺️ Enrutamiento

El proyecto usa **TanStack Router** para enrutamiento type-safe con inferencia de tipos completa.

### TanStack Router Devtools

En desarrollo, las devtools del router están disponibles para inspeccionar rutas y navegación.

## 📦 Gestión de Dependencias

Este proyecto usa **pnpm** como gestor de paquetes por sus ventajas:

- ✅ Instalación más rápida que npm/yarn
- ✅ Ahorro de espacio en disco (almacenamiento compartido)
- ✅ Gestión estricta de dependencias

### Agregar Dependencias

```bash
# Dependencia de producción
pnpm add <paquete>

# Dependencia de desarrollo
pnpm add -D <paquete>
```

### Actualizar Dependencias

```bash
# Actualizar todas las dependencias
pnpm update

# Actualizar una dependencia específica
pnpm update <paquete>
```

## 🧹 Calidad de Código

### ESLint

El proyecto está configurado con:
- Reglas recomendadas de ESLint
- Plugin de React Hooks
- Plugin de React Refresh
- TypeScript ESLint

Para mantener la calidad del código, ejecuta el linter antes de hacer commit:

```bash
pnpm lint
```

## 🔧 Configuración de TypeScript

El proyecto usa TypeScript 5.8 con configuraciones separadas:

- **`tsconfig.json`**: Configuración base
- **`tsconfig.app.json`**: Para el código de la aplicación
- **`tsconfig.node.json`**: Para archivos de configuración (Vite, etc.)

## 📚 Referencias del Proyecto

El proyecto incluye una interfaz de administración con secciones para:
- Dashboard de reportes
- Gestión de servicios
- Gestión de comunidades
- Gestión de membresías
- Visualizaciones con gráficos y métricas

Para más detalles sobre el diseño visual, consulta las referencias proporcionadas en la documentación del proyecto.

## 🤝 Contribución

1. Crea una nueva rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
2. Realiza tus cambios y haz commit: `git commit -m 'Agrega nueva funcionalidad'`
3. Asegúrate de que el código pase el linter: `pnpm lint`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es publico y parte del curso DP1 - Universidad, período 25-2.

---

