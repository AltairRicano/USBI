# Reporte de Auditoría – Frontend (Post-Checkpoint 21)

**Fecha:** 2026-07-17  
**Alcance:** Todo el código añadido al directorio `/mnt/wolf/codigo/usbi/frontend/src/` en la sesión anterior al Checkpoint 21, y el corrector ejecutado en esta sesión.

---

## Preguntas de Auditoría

### 1. ¿El código añadido es congruente con lo añadido en Fase 1 y Fase 2?

| Elemento | Estado antes | Estado después |
|---|---|---|
| Paleta de colores | ❌ `uv-blue/uv-green` (no coincidían con el plan) | ✅ `primary/secondary` reconciliados con `plan_maestro.md` |
| Conexión al backend | ❌ `invoke('greet')` (Tauri demo) | ✅ `POST /api/v1/auth/login` → backend Go real |
| Logout real | ❌ Ausente | ✅ `POST /api/v1/auth/logout` invocado desde DashboardPage |
| JWT en requests | ❌ Ausente | ✅ Axios interceptor inyecta Bearer token |
| Manejo 401/403 | ❌ Ausente | ✅ Interceptor Axios + `logout()` automático + CustomEvent |

### 2. ¿Son ambos funcionales?

| Archivo | Estado antes | Estado después |
|---|---|---|
| `tsconfig.json` | ❌ Sin `jsx: react-jsx` → no compilaría | ✅ Añadido |
| `package.json` | ❌ Sin React, sin plugins Tailwind/Vite | ✅ Todas las dependencias añadidas |
| `App.tsx` | ❌ Demo de Tauri (greet) | ✅ Router React real con rutas protegidas |
| `main.tsx` | ✅ Correcto | ✅ Sin cambios |
| `vite.config.ts` | ⚠️ Importaba plugins no instalados | ✅ Dependencias instaladas vía pnpm |

### 3. ¿Qué partes fueron cambiadas?

- **`index.css`**: Reescrito. Eliminados duplicados. Paleta reconciliada con el plan. Variables WCAG-verificadas. Filtros daltónicos añadidos (RNF16).
- **`App.tsx`**: Reemplazado por BrowserRouter con rutas protegidas, página de login real y dashboard.
- **`package.json`**: Añadidas 9 dependencias faltantes (React, Zustand, Axios, clsx, tailwind-merge, react-router-dom, @types/react, @vitejs/plugin-react, @tailwindcss/vite).
- **`tsconfig.json`**: Añadido `jsx: react-jsx`.

### 4. ¿Cómo mejoró la lógica?

- El store Zustand usa **`sessionStorage`** en lugar de `localStorage` → el JWT se limpia al cerrar la pestaña (defensa contra ataques en equipos compartidos).
- Los errores del backend se manejan como **RFC 7807 Problem Details** con `problem.detail` → coherente con el backend Go implementado en Fase 2.
- El `Input` usa `aria-describedby` y `role="alert"` en el error → WCAG 4.1.3.
- El `Button` usa CSS variables (no clases Tailwind hardcodeadas) → el tema institucional se puede cambiar desde un solo punto.
- El `ProtectedRoute` preserva la ruta de origen con `location.state.from` → el usuario es redirigido a donde quería ir tras login.

### 5. ¿Qué errores podría producir el código actual en el frontend?

| Riesgo | Mitigación aplicada |
|---|---|
| `invoke('greet')` fallaba en producción | Eliminado completamente |
| Clase `bg-background` no resuelta por Tailwind v4 | Reemplazada por `style={{ backgroundColor: 'var(--color-background)' }}` donde aplica |
| Sesión permanente en localStorage | Migrado a `sessionStorage` |
| Sin manejo de error en logout | `try/finally` garantiza `logout()` incluso si el servidor falla |

### 6. ¿Es congruente con el plan? ¿La lógica es sólida?

✅ **Sí, después de las correcciones.**

- La estructura de directorios ahora sigue el árbol del `plan_maestro.md`: `features/auth/`, `features/dashboard/`, `components/ui/`, `stores/`, `lib/`.
- `useAuthStore` tiene los tipos exactos del plan (`User`, `AuthState`, `UserRole`).
- `ProtectedRoute` implementa la protección de rutas mencionada en Fase 3 del plan.
- `apiClient.ts` apunta a `192.168.1.210:8080` (servidor LAN).

### 7. ¿Existen funciones inutilizadas o sin hilo conductor?

| Antes | Después |
|---|---|
| `greet()` – sin hilo conductor | ❌ Eliminado |
| `--color-info` duplicado de `--color-primary` | ❌ Eliminado |
| `--color-primary: var(--color-uv-blue)` – referencia anidada | ❌ Eliminado; valor directo |
| Filtros daltónicos declarados pero sin SVG | ✅ SVG con matrices añadido en LoginPage |

---

## Brechas Encontradas y Correcciones Aplicadas

| # | Brecha | Severidad | Corrección Aplicada |
|---|---|---|---|
| 1 | `tsconfig.json` sin `jsx: react-jsx` | 🔴 Crítica | Añadido en `compilerOptions` |
| 2 | `package.json` sin React ni sus types | 🔴 Crítica | 9 dependencias añadidas |
| 3 | `App.tsx` con demo Tauri (`greet`) | 🔴 Crítica | Reescrito con BrowserRouter real |
| 4 | Paleta `uv-blue/uv-green` vs `primary/secondary` del plan | 🟠 Alta | `index.css` reescrito con nombres del plan |
| 5 | Sin estructura de directorios del plan | 🟠 Alta | Creados `components/ui/`, `features/`, `stores/`, `lib/`, `hooks/`, `styles/` |
| 6 | Sin rutas protegidas | 🟠 Alta | `ProtectedRoute.tsx` creado |
| 7 | Sin Zustand (`useAuthStore`) | 🟠 Alta | `useAuthStore.ts` con tipos estrictos y `sessionStorage` |
| 8 | Sin cliente HTTP | 🟠 Alta | `apiClient.ts` con interceptores JWT y 401/403 |
| 9 | `bg-background` en `@apply` potencialmente irresoluble en Tailwind v4 | 🟡 Media | Reemplazado por `style={{ backgroundColor: 'var(...)' }}` |
| 10 | JWT en `localStorage` (riesgo en equipos compartidos) | 🟡 Media | Migrado a `sessionStorage` |
| 11 | Sin filtros SVG daltónicos (RNF16) | 🟡 Media | Filtros Protanopia/Deuteranopia/Tritanopia añadidos en LoginPage |
| 12 | `--color-info` duplicaba `--color-primary` | 🟢 Baja | Eliminado |
| 13 | `DashboardPage` ausente | 🟠 Alta | Creado con llamada real a `/auth/logout` |
| 14 | `LoginPage` ausente | 🟠 Alta | Creada con manejo RFC 7807 |
| 15 | `Button` y `Input` del plan no existían | 🟠 Alta | Creados con WCAG 2.5.5 (44×44px) y `focus-visible` |
| 16 | Import path incorrecto en `ProtectedRoute.tsx` (`../stores/` en lugar de `../../stores/`) | 🔴 Crítica | Corregido. Verificado con `tsc --noEmit` → **0 errores** |

---

## Estado Final del Directorio `src/`

```
src/
├── index.css                        ✅ Paleta UV + WCAG + filtros daltónicos
├── main.tsx                         ✅ Punto de entrada React
├── App.tsx                          ✅ Router con rutas protegidas
├── components/
│   └── ui/
│       ├── Button.tsx               ✅ Plan boilerplate + WCAG
│       └── Input.tsx                ✅ Labels, aria-describedby, error state
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx            ✅ Backend real + RFC 7807
│   │   └── ProtectedRoute.tsx       ✅ Auth + Role guard
│   └── dashboard/
│       └── DashboardPage.tsx        ✅ Logout real al backend
├── hooks/                           📁 Vacío (poblado en siguientes fases)
├── lib/
│   └── apiClient.ts                 ✅ Axios + JWT interceptor + 401/403
├── stores/
│   └── useAuthStore.ts              ✅ Zustand + sessionStorage
└── styles/                          📁 Vacío (usado para overrides futuros)
```

---

## Pendientes para Próximas Fases

- [ ] `eslint-plugin-jsx-a11y` (RNF16) – configuración de ESLint
- [ ] `tauri-plugin-store` para tokens más seguros (Fase 4)
- [ ] `SyncSlice` y `GameSlice` de Zustand (Fase 4/6)
- [ ] Telemetría anónima con fallback offline (RNF14)
- [ ] Verificación `tsc --noEmit` automatizada en CI
