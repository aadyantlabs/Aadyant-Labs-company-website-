import { create } from "zustand";
import { HOME_THEME, THEMES, type Mode, type Palette, type ThemeKey } from "./themes";

type ThemeStore = {
  mode: Mode;
  active: ThemeKey;
  setActive: (t: ThemeKey) => void;
};

export const useTheme = create<ThemeStore>((set) => ({
  mode: "journey",
  active: HOME_THEME,
  setActive: (active) => set({ active }),
}));

/** The palette on screen right now (mid-fade values included). Mutated by GSAP, read every frame by the 3D scene. */
export const live: Palette = { ...THEMES[HOME_THEME] };

/** Particle hero state, tweened by GSAP (Intro, hero scroll) and read every frame by the shader.
 *  logo: 0 = "A" monogram, 1 = scene shapes · morph: 0 browser → 1 phone → 2 3D object · scatter: 1 = ambient field · burst: 0..1 explosion */
export const hero = {
  logo: typeof document !== "undefined" && document.documentElement.classList.contains("intro") ? 0 : 1,
  morph: 0,
  scatter: 0,
  burst: 0,
  ready: false,
};
