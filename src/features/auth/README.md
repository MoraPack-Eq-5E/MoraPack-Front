# Feature: Autenticación (Auth)

Este módulo maneja todo lo relacionado con autenticación y gestión de sesiones de usuario.

## 📁 Estructura

```
auth/
├── components/
│   ├── AuthLayout.tsx      # Layout 60/40 para páginas de auth
│   ├── LoginForm.tsx        # Formulario de login con validaciones
│   └── index.ts             # Barrel exports
├── hooks/
│   ├── useAuth.ts           # Hook principal de autenticación
│   └── index.ts             # Barrel exports
├── services/
│   ├── auth.service.ts      # Servicios de API para auth
│   └── index.ts             # Barrel exports
└── README.md                # Este archivo
```

## 🎯 TODOs

Pendientes para integración completa:

- [ ] Conectar con API real del backend
- [ ] Implementar refresh token automático
- [ ] Agregar página de registro
- [ ] Agregar "Olvidé mi contraseña"
- [ ] Implementar autenticación con redes sociales (opcional)
- [ ] Agregar tests unitarios e integración
