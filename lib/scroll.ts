import type Lenis from "lenis";

let lenis: Lenis | null = null;
export const setLenis = (l: Lenis | null) => (lenis = l);

/** Smooth-scroll to a section id, below the fixed header. Falls back to native scrolling (reduced motion). */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -80 });
  else el.scrollIntoView({ behavior: "auto" });
}

/** Jump to the top instantly (new page), keeping Lenis in sync with the window. */
export function resetScroll() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();
