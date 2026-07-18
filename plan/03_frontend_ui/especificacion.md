# Fase 3: Core del Frontend y Sistema de Diseño (UI/UX) - Especificación Accionable

## 1. Inicialización y Arquitectura
- [ ] INICIA el proyecto frontend empleando Vite + React 18 + TypeScript.
- [ ] CONFIGURA la estructura de directorios en `src/`:
  - [ ] `components/ui/` (componentes base compartidos).
  - [ ] `features/` (lógica agrupada por dominio: `auth/`, `games/`, `dashboard/`).
  - [ ] `hooks/` (lógica reutilizable y sincronización).
  - [ ] `lib/` (configuraciones de clientes: Tauri, SQLite local, Axios).
  - [ ] `stores/` (manejo de estado global con Zustand).
  - [ ] `styles/` (hojas de estilo y directivas de Tailwind).
- [ ] IMPLEMENTA Tauri + SQLite como base local para el Frontend.
- [ ] IGNORA cualquier tecnología heredada (Electron o PouchDB).
- [ ] GARANTIZA que el Frontend interactúa de forma remota con el Backend en PostgreSQL respetando la arquitectura de integración.

## 2. Sistema de Diseño y TailwindCSS
- [ ] IMPLEMENTA la configuración estricta de TailwindCSS para forzar la paleta institucional (USBI).
- [ ] APLICA la directiva base de Tailwind en `index.css`.
- [ ] UTILIZA el siguiente Boilerplate en `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#006b3f', foreground: '#ffffff' }, // Verde USBI
        secondary: { DEFAULT: '#003865', foreground: '#ffffff' }, // Azul UV
        background: '#f8fafc',
        accent: { DEFAULT: '#f59e0b', hover: '#d97706' } // Dorado/Naranja
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        game: ['Fredoka One', 'cursive']
      },
      minHeight: {
        'touch': '44px' // Accesibilidad motriz (área mínima)
      },
      minWidth: {
        'touch': '44px' // Accesibilidad motriz (área mínima)
      }
    },
  },
  plugins: [],
} satisfies Config
```

## 3. Componentes Base (UI Kit)
- [ ] CREA el componente `Button` garantizando un área mínima de 44x44 píxeles para accesibilidad motriz.
- [ ] CREA el componente `Input` integrando iconos a la izquierda/derecha y estados de error explícitos.
- [ ] CREA el componente `Card` definiendo bordes amigables de juego (`rounded-xl` o `rounded-2xl`) y sombras (`shadow-lg`).
- [ ] UTILIZA el siguiente Boilerplate en `src/components/ui/Button.tsx`:

```tsx
import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50",
          "min-h-touch min-w-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          {
            'bg-primary text-white hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-white hover:bg-secondary/90': variant === 'secondary',
            'border-2 border-primary text-primary hover:bg-primary hover:text-white': variant === 'outline',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'hover:bg-gray-100 text-gray-700': variant === 'ghost',
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-4 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

## 4. Estado Global (Zustand) y Sincronización
- [ ] CONFIGURA `Zustand` (`src/stores/useAuthStore.ts`) para almacenar la sesión (JWT, ID, Rol).
- [ ] INCLUYE la Definición Exacta de la interfaz y la State Machine para el tipado estricto del estado global:

```typescript
export interface User {
  id: string;
  name: string;
  role: 'admin' | 'operator' | 'director' | 'player';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}
```

- [ ] INICIALIZA `tauri-plugin-sql` para crear un caché en SQLite del lado del cliente (Frontend).
- [ ] IMPLEMENTA un worker o interval para sincronizar datos locales en segundo plano hacia PostgreSQL en el Backend vía Axios (Ver Especificación de Sincronización Offline).

## 5. Contratos API (JSON Schemas)
- [ ] VALIDA las respuestas de autenticación en el cliente y servidor usando el siguiente esquema exacto (excluyendo roles de terapeutas):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "UserSessionResponse",
  "type": "object",
  "properties": {
    "token": { "type": "string" },
    "user": {
      "type": "object",
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "name": { "type": "string" },
        "role": { "type": "string", "enum": ["admin", "operator", "director", "player"] }
      },
      "required": ["id", "name", "role"]
    }
  },
  "required": ["token", "user"]
}
```

## 6. Accesibilidad (WCAG 2.1 AA)
- [ ] VINCULA de manera explícita cada `<input>` a un `<label>` utilizando `htmlFor` e `id` o proporciona `aria-label`.
- [ ] VERIFICA el ratio de contraste entre fondo blanco y verde institucional (`#006b3f`).
- [ ] HABILITA controles de navegación por teclado (`tabIndex`) en todos los Canvas de juegos y menús interactivos.
- [ ] INSTALA Y CONFIGURA `eslint-plugin-jsx-a11y` para detener la compilación de CI/CD ante infracciones.
- [ ] IMPLEMENTA filtros daltónicos activables mediante variables CSS y el estado global, alterando la paleta si el usuario lo requiere.

## 7. Anexos Técnicos: Motor de Juegos e Integración Frontend
- [ ] ENCAPSULA los juegos en componentes aislados de React.
- [ ] EJECUTA la liberación de memoria en el desmontaje del componente (Phaser Canvas).
- [ ] EMPLEA el siguiente Boilerplate Crítico para la Limpieza de Memoria en Phaser:

```tsx
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

interface GameCanvasProps {
  config: Phaser.Types.Core.GameConfig;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ config }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const gameInstance = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    // INICIALIZACIÓN: Crear instancia del juego de Phaser en el div montado
    gameInstance.current = new Phaser.Game({
      ...config,
      parent: gameRef.current,
    });

    // LIMPIEZA DE MEMORIA (CRÍTICO): Evita memory leaks de audios y texturas
    return () => {
      if (gameInstance.current) {
        // destroy(removeCanvas, noReturn) -> true, false elimina el canvas y libera memoria
        gameInstance.current.destroy(true, false);
        gameInstance.current = null;
      }
    };
  }, [config]);

  return (
    <div 
      ref={gameRef} 
      className="w-full h-full min-h-[600px] rounded-xl overflow-hidden shadow-lg border-2 border-primary" 
      aria-label="Canvas interactivo del juego"
    />
  );
};
```
