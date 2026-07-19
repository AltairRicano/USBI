import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ColorBlindFilter = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

interface SettingsState {
  colorBlindFilter: ColorBlindFilter;
  setColorBlindFilter: (filter: ColorBlindFilter) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorBlindFilter: 'none',
      setColorBlindFilter: (filter: ColorBlindFilter) => {
        set({ colorBlindFilter: filter });
        // Aplicar la clase al documento globalmente
        const html = document.documentElement;
        html.classList.remove('deuteranopia', 'protanopia', 'tritanopia');
        if (filter !== 'none') {
          html.classList.add(filter);
        }
      },
    }),
    {
      name: 'usbi-settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, restaurar la clase en el HTML
        if (state && state.colorBlindFilter !== 'none') {
          document.documentElement.classList.add(state.colorBlindFilter);
        }
      }
    }
  )
);
