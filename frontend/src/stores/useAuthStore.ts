import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ── Tipos estrictos — espeja exactamente domain.User y domain.UserRole en Go ─
export type UserRole = 'admin' | 'operator' | 'director' | 'player';
export type UserStatus = 'active' | 'suspended' | 'pending_tutor_consent' | 'deleted';

/**
 * DTO público del usuario.
 * Coincide con domain.User en Go: NUNCA incluye password_hash,
 * email cifrado, ni material criptográfico.
 */
export interface User {
  id: string;
  full_name: string;   // ← Corrección: el backend retorna "full_name", no "name"
  is_adult: boolean;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

// ── Store (persiste en sessionStorage — se limpia al cerrar pestaña) ──────────
// NO usar localStorage: un JWT en localStorage es vulnerable a XSS.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user: User, token: string) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'usbi-auth',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
