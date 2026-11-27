import { ImageResponse } from "next/og";
import { THEMES, type ThemeKey } from "./themes";

export const ogSize = { width: 1200, height: 630 };

/** Shared share-preview card: theme colours, an eyebrow, a big title and the wordmark. */
export function ogImage({ theme, eyebrow, title }: { theme: ThemeKey; eyebrow: string; title: string }) {
  const t = THEMES[theme];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: t.bg, color: t.fg }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: t.accent, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: -3, maxWidth: 950 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26 }}>
          <span style={{ letterSpacing: 10, fontWeight: 800 }}>AADYANT LABS</span>
          <span style={{ width: 140, height: 10, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`, borderRadius: 10 }} />
        </div>
      </div>
    ),
    ogSize,
  );
}
