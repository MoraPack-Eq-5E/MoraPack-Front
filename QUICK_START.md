# 🚀 Inicio Rápido - MoraPack Front

## ⚡ Setup Inicial (5 minutos)

### 1. Instalar Dependencias
```bash
pnpm install
```

### 2. Configurar Variables de Entorno
```bash
# Windows PowerShell
Copy-Item .env.example .env

# Unix/Mac/Git Bash
cp .env.example .env
```

Edita `.env` con tus valores:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. Iniciar Servidor de Desarrollo
```bash
pnpm dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 📝 Comandos Esenciales

```bash
pnpm dev        # Iniciar desarrollo
pnpm build      # Build de producción
pnpm preview    # Preview del build
pnpm lint       # Verificar código
```

---

## 🎯 Primeros Pasos en el Código

### 1. Crear tu Primer Componente UI

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

```typescript
// src/components/ui/index.ts
export { Button } from './button';
```

### 2. Usar el Componente

```typescript
// src/App.tsx
import { Button } from '@/components/ui';

function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">MoraPack Admin</h1>
      <Button variant="primary" onClick={() => alert('¡Hola!')}>
        Click Me
      </Button>
    </div>
  );
}

export default App;
```

### 3. Crear un Feature Completo

#### Paso 1: Servicio
```typescript
// src/services/users.service.ts
import { API_BASE_URL } from '@/constants';

export const usersService = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/users`);
    return response.json();
  },
};
```

#### Paso 2: Hook con TanStack Query
```typescript
// src/features/users/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersService.getAll,
  });
}
```

#### Paso 3: Componente
```typescript
// src/features/users/components/UserList.tsx
import { useUsers } from '../hooks/useUsers';
import { Button } from '@/components/ui';

export function UserList() {
  const { data: users, isLoading } = useUsers();

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-4">
      {users?.map((user: any) => (
        <div key={user.id} className="p-4 border rounded-lg">
          <h3 className="font-bold">{user.name}</h3>
          <p className="text-gray-600">{user.email}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Paso 4: Página
```typescript
// src/pages/users.tsx
import { UserList } from '@/features/users/components/UserList';

export function UsersPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Usuarios</h1>
      <UserList />
    </div>
  );
}
```

---

## 🎨 Trabajar con Tailwind CSS

### Clases Comunes

```typescript
// Layout
className="flex items-center justify-between"
className="grid grid-cols-3 gap-4"
className="container mx-auto px-4"

// Espaciado
className="p-4 m-2"        // padding y margin
className="space-y-4"      // espacio vertical entre hijos
className="gap-4"          // espacio en grids/flex

// Tipografía
className="text-2xl font-bold text-gray-900"
className="text-sm text-gray-600"

// Colores
className="bg-blue-600 text-white"
className="border border-gray-300"

// Interactividad
className="hover:bg-blue-700 transition-colors"
className="cursor-pointer"

// Responsive
className="sm:text-lg md:text-xl lg:text-2xl"
```

### Usar la Función `cn()`

```typescript
import { cn } from '@/lib/cn';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  props.className  // Permite override externo
)} />
```

---

## 🔍 Usar Radix UI

### Ejemplo: Dialog

```bash
# Ya está instalado, pero si necesitas otro componente:
pnpm add @radix-ui/react-dialog
```

```typescript
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/cn';

export function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Abrir Modal
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "bg-white rounded-lg p-6 shadow-lg max-w-md w-full"
        )}>
          <Dialog.Title className="text-xl font-bold mb-4">
            Título del Modal
          </Dialog.Title>
          
          <Dialog.Description className="text-gray-600 mb-4">
            Contenido del modal aquí
          </Dialog.Description>
          
          <Dialog.Close asChild>
            <button className="px-4 py-2 bg-gray-200 rounded">
              Cerrar
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## 🎯 Convenciones de Código

### Nombres de Archivos
- Componentes: `PascalCase.tsx` → `Button.tsx`, `UserList.tsx`
- Hooks: `camelCase.ts` → `useAuth.ts`, `useUsers.ts`
- Services: `kebab-case.service.ts` → `auth.service.ts`
- Utils: `kebab-case.ts` → `format-date.ts`

### Imports
```typescript
// ✅ Usar path alias
import { Button } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ❌ Evitar paths relativos largos
import { Button } from '../../../components/ui/button';
```

### Exports
```typescript
// ✅ Named exports (preferido)
export function Button() { ... }
export const API_URL = '...';

// ✅ Default export para páginas
export default function HomePage() { ... }
```

---

## 🐛 Debugging

### TanStack Query Devtools

Ya están habilitadas en desarrollo. Busca el botón flotante en la esquina inferior.

### TanStack Router Devtools

Ya están habilitadas en desarrollo.

### Console Logs

```typescript
console.log('data:', data);
console.error('error:', error);
console.table(arrayData);  // Muy útil para arrays
```

---

## 📚 Siguientes Pasos

1. ✅ Lee [README.md](./README.md) para entender el proyecto completo
2. ✅ Consulta [STRUCTURE.md](./STRUCTURE.md) para arquitectura detallada
3. ✅ Revisa los archivos en `src/features/` para ver READMEs de cada módulo
4. ✅ Explora las constantes en `src/constants/`
5. ✅ Familiarízate con los hooks en `src/hooks/`

---

## ❓ FAQs

### ¿Dónde pongo mi nuevo componente?
- ¿Es reutilizable en todo el proyecto? → `src/components/ui/`
- ¿Es de navegación/estructura? → `src/components/layout/`
- ¿Es específico de una funcionalidad? → `src/features/[nombre]/components/`

### ¿Cómo uso iconos?
```typescript
import { Home, User, Settings } from 'lucide-react';

<Home className="w-5 h-5" />
<User size={20} color="blue" />
<Settings />
```

### ¿Cómo cambio la URL de la API?
Edita el archivo `.env`:
```env
VITE_API_BASE_URL=https://tu-api.com/api
```

### ¿Cómo agrego una nueva dependencia?
```bash
pnpm add nombre-del-paquete        # Dependencia
pnpm add -D nombre-del-paquete     # Dev dependency
```

---

## 🆘 ¿Necesitas Ayuda?

1. Revisa la documentación completa en [README.md](./README.md)
2. Consulta la guía de estructura en [STRUCTURE.md](./STRUCTURE.md)
3. Busca ejemplos en `src/features/`
4. Pregunta al equipo 😊

---

**¡Feliz Coding! 🚀**

