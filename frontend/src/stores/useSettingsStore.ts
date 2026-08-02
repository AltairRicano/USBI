import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ColorBlindFilter = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type TextScale = 'normal' | 'large' | 'larger';

const TEXT_SCALE_CLASSES = ['text-scale-large', 'text-scale-larger'];

interface SettingsState {
  colorBlindFilter: ColorBlindFilter;
  setColorBlindFilter: (filter: ColorBlindFilter) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  /** Mutes SnakeLadderScene's dice-roll AudioContext sound (audit C7). */
  muteGameSounds: boolean;
  setMuteGameSounds: (muted: boolean) => void;
  /**
   * Explicit override on top of the OS-level `prefers-reduced-motion` media
   * query (which index.css honors automatically regardless of this flag) —
   * for users who want reduced motion but whose OS/browser doesn't expose
   * the preference easily (audit C7).
   */
  reduceMotion: boolean;
  setReduceMotion: (reduce: boolean) => void;
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
}

export function applyDocumentClasses(state: Pick<SettingsState, 'colorBlindFilter' | 'theme' | 'reduceMotion' | 'textScale'>) {
  const html = document.documentElement;

  html.classList.toggle('dark', state.theme === 'dark');

  html.classList.remove('deuteranopia', 'protanopia', 'tritanopia');
  if (state.colorBlindFilter !== 'none') {
    html.classList.add(state.colorBlindFilter);
  }

  html.classList.toggle('reduce-motion', state.reduceMotion);

  html.classList.remove(...TEXT_SCALE_CLASSES);
  if (state.textScale === 'large') html.classList.add('text-scale-large');
  if (state.textScale === 'larger') html.classList.add('text-scale-larger');
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      colorBlindFilter: 'none',
      theme: 'light',
      muteGameSounds: false,
      reduceMotion: false,
      textScale: 'normal',
      setColorBlindFilter: (filter: ColorBlindFilter) => {
        set({ colorBlindFilter: filter });
        applyDocumentClasses(get());
      },
      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        applyDocumentClasses(get());
      },
      setMuteGameSounds: (muted: boolean) => set({ muteGameSounds: muted }),
      setReduceMotion: (reduce: boolean) => {
        set({ reduceMotion: reduce });
        applyDocumentClasses(get());
      },
      setTextScale: (scale: TextScale) => {
        set({ textScale: scale });
        applyDocumentClasses(get());
      },
    }),
    {
      name: 'usbi-settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Al recargar la página, restaurar las clases en el HTML.
        if (state) {
          applyDocumentClasses(state);
        }
      }
    }
  )
);
