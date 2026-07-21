import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ColorBlindFilter = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

interface SettingsState {
  colorBlindFilter: ColorBlindFilter;
  setColorBlindFilter: (filter: ColorBlindFilter) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorBlindFilter: 'none',
      theme: 'light',
      setColorBlindFilter: (filter: ColorBlindFilter) => {
        set({ colorBlindFilter: filter });
        // Aplicar la clase al documento globalmente
        const html = document.documentElement;
        html.classList.remove('deuteranopia', 'protanopia', 'tritanopia');
        if (filter !== 'none') {
          html.classList.add(filter);
        }
      },
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        const html = document.documentElement;
        if (theme === 'dark') {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
      },
    }),
    {
      name: 'usbi-settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, restaurar la clase en el HTML
        if (state) {
          if (state.colorBlindFilter !== 'none') {
            document.documentElement.classList.add(state.colorBlindFilter);
          }
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      }
    }
  )
);
