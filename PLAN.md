# Aadyant Labs Website: Build Plan

Status: **draft for sign-off** · Written 2026-11-26 · Moodboard and theme prototype: [design/moodboard.html](design/moodboard.html) ([live](https://claude.ai/artifact/Ef64V6J3RR2RVNFTWpyEPG))

---

## 1. Decisions (settled in the grilling rounds)

| Area | Decision |
|---|---|
| Company | Aadyant Labs, a new studio. This site is its first point of contact and the main proof of its skill. |
| Name meaning | Ādyanta means "beginning and end". The line is "From first idea to final pixel". |
| Audience | A general web studio. Resorts & hospitality, new businesses, event organizers and others are clients, not the site's identity *(changed 2026-11-27)* |
| Goal | Enquiries through WhatsApp and the contact form first, then email and Cal.com |
| Offers | Websites & landing pages · Web apps & dashboards *(changed 2026-11-27)* |
| What to show off | Frontend design, animation, colour, theming |
| Pages | An immersive home page plus lighter inner pages. One 3D canvas stays mounted across all pages, so moving between pages feels continuous. |
| Look | Futuristic, in three themes: **Solar Luxe** (the brand base), **Deep Space**, **Night Bloom** |
| Theme system | No light/dark mode. Instead, a **Journey** mode where the theme changes by section, or a lock to one theme. Journey is the default. |
| Fonts | One set across all themes: Syne (headlines), Manrope (text), JetBrains Mono (labels and data) |
| Theme change | A timed fade (~0.45–1s, with that theme's easing) when a section reaches mid-screen. Not tied to scroll position. |
| Motion per theme | Deep Space: quick and precise · Solar: slow and glowing · Night Bloom: bouncy |
| Scrolling | Free smooth scrolling (Lenis) with scroll-linked animation. Snap scenes at most once. |
| Effects | At most 5 signature effects (§5). Everything else uses subtle reveals. |
| Concept work | 3 fictional projects, each clearly labelled "Concept" |
| Sound | None in v1 |
| Language | English |
| Hosting | Vercel |
| Minimum standards | Reduced-motion version, lighter phone version, all text readable by screen readers, fast load (LCP ≈ 2.5s is a target, not a hard rule) |

---

## 2. Brand

- **Logo:** a geometric "A" monogram, drawn as a point cloud so the loading-screen particles can form it, plus the wordmark "AADYANT LABS" in Syne 800 with wide letter spacing. Both are delivered as SVG, with the point cloud as JSON.
- **Voice:** confident, plain and warm, with short sentences. No jargon for non-technical clients. Technical terms stay in the *How we build* section.
- **Themes:** the tokens are the source of truth, and they match the moodboard.

| Token | Solar Luxe | Deep Space | Night Bloom |
|---|---|---|---|
| `bg` | `#0D0A09` | `#05070B` | `#0C0A24` |
| `surface` | `#17110E` | `#0C1118` | `#161236` |
| `line` | `#2E221B` | `#1C2A36` | `#2A2560` |
| `fg` | `#F4E9DC` | `#E6F1F7` | `#EEEBFF` |
| `muted` | `#A8968A` | `#7F93A3` | `#9C97C9` |
| `accent` | `#FFB547` | `#22E4FF` | `#C8FF3D` |
| `accent2` | `#FF6A4D` | `#FF3D71` | `#8C6BFF` |
| ease / duration | `power3.inOut` / 1.0s | `expo.out` / 0.45s | `back.out(1.4)` / 0.6s |
| particle style | soft round dots, additive glow | small squares, fast, HUD lines | squares, springy |

All three themes are dark with light text, so contrast passes WCAG AA even halfway through a fade. Check each pair with a contrast tool in Phase 1.

---

## 3. Tech stack (versions checked on npm, 2026-11-26)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16.4** (App Router) + **React 19.3** + TypeScript | Routing, image handling and server rendering for search engines. Its root layout lets the 3D canvas persist across pages. |
| 3D | **three r187** + **@react-three/fiber 9.8** + **@react-three/drei 10.7** | The standard React 3D stack. drei provides helpers such as surface sampling and preloading. |
| Renderer | **WebGL 2** for v1 | The post-processing ecosystem is still WebGL-only. WebGPU is a later upgrade (three r187 falls back automatically). |
| Post-processing | **@react-three/postprocessing 3.2**, bloom only, and only where it pays off | The Solar glow |
| Animation | **GSAP 3.15** (ScrollTrigger, SplitText, Flip, MotionPath, Observer) + **@gsap/react 2.1** | Free for commercial use since 2025, including SplitText. The Webflow licence restriction applies only to no-code animation tools, not to us. |
| Smooth scroll | **Lenis 1.3** | Industry default, pairs with ScrollTrigger |
| Styles | **Tailwind CSS 4.3** | Theme values are CSS variables we can change at runtime. Do **not** use `@theme inline`, because it stops runtime switching. |
| State | **zustand 5** (already pulled in by R3F) | Shared theme and transition state between the page and the 3D canvas |
| Content | **@next/mdx 16.4** | Concept project pages written as MDX. No CMS. |
| Contact | Next **server action** + **Resend 6.40** (env vars in `.env.example`) | The form sends an email, and it still works with JavaScript off. Spam protection is a hidden honeypot field plus server-side checks. *(Changed from a route handler in Phase 2.)* |
| Analytics | Vercel Analytics + Speed Insights | No cookies, so no cookie banner |
| Not used | `next-themes`, CSS scroll-driven animations, Framer Motion | next-themes has reported React 19 / Next 16 problems and is built for light/dark. CSS scroll timelines have uncertain Firefox support and can't drive the 3D. Framer Motion would duplicate GSAP. |

---

## 4. Architecture

```
app/
  layout.tsx            ← <html>, fonts, pre-paint theme script, <Experience/> (persistent canvas), <Nav/>
  page.tsx              ← home (sections below)
  work/[slug]/page.tsx  ← concept projects (MDX)
  contact/page.tsx
  actions.ts            ← contact server action (Resend)
components/
  Experience.tsx        ← fixed full-screen R3F <Canvas frameloop="never">, scene router
  scene/ParticleHero.tsx, scene/Loader.tsx, scene/Ambient.tsx
  ThemeController.tsx   ← Journey/locked logic, writes CSS vars + 3D colours
  ThemeToggle.tsx       ← radiogroup in the nav
  TransitionLink.tsx    ← animates out → router.push → animates in
  fx/ Scramble, Magnetic, Cursor, InkMenu, CurvedPath
lib/
  themes.ts             ← the token table in §2, the single source of truth
  loop.ts               ← one animation loop: gsap.ticker drives Lenis + R3F advance()
  store.ts              ← zustand: mode, activeTheme, themeState, transition
content/work/*.mdx
public/models/*.glb (Draco), public/points/*.bin (precomputed particle targets)
```

### 4.1 One animation loop
`gsap.ticker` is the only animation loop. Every tick it calls `lenis.raf(time)`, ScrollTrigger reads Lenis's scroll position, and R3F renders through `advance(time)` with `frameloop="never"`. This avoids three competing loops, a pitfall several of the reference builds warned about.

### 4.2 Theme engine (proven in the moodboard prototype)
- `themes.ts` holds every token and the easing for each theme.
- **Before first paint:** a ~15-line inline script in `<head>` reads `localStorage["adyant-theme-mode"]` and sets `data-mode` and `data-theme` on `<html>`, so the wrong theme never flashes. Reduced-motion users with no saved choice start locked on Solar.
- **CSS:** Tailwind's `@theme` maps `--color-bg` and the rest to `var(--t-bg)` and so on. Static `[data-theme="solar|deep|bloom"]` blocks give correct colours with no JavaScript.
- **Journey mode:** every home section has `data-theme-section="deep"` (or another theme). One ScrollTrigger per section, with `start: "top 55%"` and `end: "bottom 55%"`. On entering a section, GSAP fades a shared `themeState` object to that theme's tokens, using that theme's easing and duration. On each update it writes the CSS variables on `<html>`, and the particle shaders copy the same values into their colour inputs, so the page and the 3D always match.
- **Locked mode:** the ScrollTriggers ignore section changes, and the theme fades once to the chosen one.
- **Inner pages** declare one theme (each concept project uses the theme that suits it). In Journey mode, page transitions fade to that theme.

### 4.3 Persistent canvas and page transitions
`<Experience/>` lives in the root layout, so it never unmounts. `TransitionLink` plays the outgoing animation (the scene morphs or the camera moves), then `router.push`, then the incoming animation. The 3D scene reads the current route from the store. Next's experimental view transitions are not needed.

### 4.4 Particle hero

> **As built (Phase 3):** the shapes are generated in code from simple primitives in `lib/shapes.ts`, with fixed seeds so they look the same on every load and tests in `lib/shapes.test.ts`. No model files or build step were needed. A model file would only be worth it for a shape too detailed to build that way. One particle system covers the whole page: the "A" for the intro, then resort, storefront and stage across the hero, belief and services sections, then a dim ambient field everywhere else. Particles dim as you scroll past the hero so section text stays readable. The cursor ring is decoration only, and the normal cursor stays visible.
- Three target shapes (**browser window**, **phone**, **3D object**) plus the **"A"** logo. Each is sampled from a low-poly model with `MeshSurfaceSampler` **at build time** into `.bin` files, so phones never do the sampling work. Models come from Blender or CC0 sources (Kenney, Poly Pizza), with credits recorded.
- A single `THREE.Points` with a custom shader. Each target shape is stored per particle, and the shader blends between them using a progress value tied to scroll in the hero. Theme colours come from `themeState`.
- 18–24k particles on desktop, 5–7k on phones. Device pixel ratio capped at 2 on desktop and 1.5 on phones. The cursor pushes particles away on desktop only.

---

## 5. Signature effects (cap: 5)

1. **Text that unscrambles into place:** eyebrows and labels (from the moodboard)
2. **Magnetic buttons:** primary CTAs, desktop only
3. ~~Custom cursor~~ *(removed 2026-11-27 after the taste-skill audit: custom cursors are dated and hurt accessibility. The particle cursor push remains.)*
4. **Shader menu opening:** an ink-bleed effect that opens the full-screen menu and contact panel (technique from the Codrops 3D-world case study)
5. **Curved scroll path:** a marker travels along the *Process* curve. The curve is rebuilt from the real element positions on every resize (the Codrops curved-path article).

Everything else uses SplitText line reveals, small parallax, and Flip transitions for the work cards.

---

## 6. Home page

| # | Section | Journey theme | Content | Motion |
|---|---|---|---|---|
| 0 | Loading screen | Solar | Particles form the "A", then burst into the hero | At most ~2s. First visit only, skipped for reduced motion |
| 1 | Hero | Solar | "We build websites people remember" plus a sentence and CTA | Particles reshape from browser window to phone to 3D object (website, app, interactive) as you scroll, unscrambling eyebrow |
| 2 | What we believe | Solar | 2–3 lines of belief, built on the "beginning and end" meaning | SplitText line reveal |
| 3 | Services | Solar | Three offers, one per audience | Cards with Flip on hover or focus, magnetic CTA |
| 4 | Concept work | Night Bloom | Pulseboard · Nook & Brew · Monsoon Sessions, each labelled "Concept" | Sideways scroll (the one pinned section), each card opens with its own transition |
| 5 | How we work | Deep Space | Discover → Design → Build → Launch | Curved scroll path (effect 5) |
| 6 | What we build with | Deep Space | Interactive skills showcase: live mini-demos of theming, motion and 3D, not a wall of logos | HUD details, number readouts that count up |
| 7 | Contact | Solar | WhatsApp, form, email, Cal.com | Ink menu (effect 4), magnetic CTA |

The nav holds the wordmark, the theme toggle (Journey / Deep / Solar / Bloom, with a coloured dot for the current theme) and the menu button that opens the ink menu.

---

## 7. Concept projects (fictional, clearly labelled)

| Project | Audience | Theme | Shows |
|---|---|---|---|
| **Pulseboard** | Web app | Solar | KPI tiles with period comparison, revenue chart (hover, keyboard, table view), filterable orders table |
| **Nook & Brew** | New business | Deep Space | Launch page, brand identity, menu, signup |
| **Monsoon Sessions** | Organizer | Night Bloom | Lineup, schedule, registration and ticket flow mock-up |

Each concept is a single MDX page with a hero, the problem, the design decisions, and the interactive pieces.

---

## 8. Phones, accessibility, performance

**Phones:** the same journey and the same 3D hero with fewer particles. No custom cursor, magnetic effect or cursor push. Lenis uses native touch scrolling.

**Accessibility**
- All copy is real HTML text. The canvas has `aria-hidden`, and every visual has a text equivalent.
- `prefers-reduced-motion`: locked on Solar, no Lenis, no loading screen, a still hero frame, and instant theme changes.
- The theme toggle is a proper radiogroup with keyboard support and a visible focus state.
- No information is shown only through motion or colour.

**Performance budget**
- Initial JavaScript under ~250 KB (gzipped), not counting the 3D chunk. three and R3F load lazily after the first paint, and the hero text renders on the server.
- LCP target about 2.5s on mid-range 4G (a target, not a gate). 60fps on a mid-range Android phone.
- Models compressed with Draco, textures with KTX2. Particle targets precomputed. No individual asset over 1 MB.
- Rendering pauses when the tab is hidden or the canvas is off-screen.

**Search and sharing:** page titles and descriptions, a share-preview image per page (generated with `next/og`), `sitemap.ts`, `robots.ts`, and structured company info (JSON-LD `Organization`).

---

## 9. Phases (each deployed to a Vercel preview link for review)

| Phase | Deliverable | Done when |
|---|---|---|
| ✅ **1. Foundation** | Next.js setup, fonts, `themes.ts`, Tailwind tokens, pre-paint script, ThemeController and toggle, one animation loop (GSAP, Lenis, R3F), an empty persistent canvas | Toggling and Journey mode work across placeholder sections with no flash of the wrong theme |
| ✅ **2. Home page** | All 8 sections with final copy, responsive layout, reveals, contact form and email (Resend). The concept row scrolls sideways natively for now. Pinning it on desktop moves to Phase 3. | The full page reads well with JavaScript turned off. Contact form delivers mail. |
| ✅ **3. 3D and motion** | Particle hero, loading screen, the 5 signature effects, page transitions | 60fps on desktop, phone version tuned, reduced-motion path verified |
| ✅ **4. Concept projects** | 3 MDX concept pages with unique entrance transitions, plus `TransitionLink` page transitions (moved from Phase 3, since there was no second page to transition to yet) | All three are reachable, each labelled "Concept", transitions are smooth |
| 🟡 **5. Polish and launch** | Accessibility review, performance pass, SEO, analytics, domain hookup | Lighthouse accessibility ≥ 95, no console errors, launched on the domain. **Done except the launch** (§12) |

---

## 10. Risks and how we handle them

| Risk | Handling |
|---|---|
| Lenis, ScrollTrigger and R3F drift out of sync | One animation loop (§4.1), `ScrollTrigger.refresh()` after fonts and images load |
| Muddy colours halfway through a theme fade | Timed fades rather than scroll-linked blending (already decided). Option to blend in OKLCH if needed. |
| Wrong theme flashes on load | Pre-paint script plus static `[data-theme]` CSS |
| Weak phone GPUs | Particle count and pixel ratio adjust to the device, rendering pauses when off-screen, still-frame fallback |
| Scrolljacking frustrates visitors (Nielsen Norman research) | Free scrolling everywhere, one pinned section, no forced snapping |
| Model licences | Use CC0 or our own Blender models only, with credits recorded in `CREDITS.md` |

---

## 11. Still needed from you (placeholders until then)

- Domain name
- Contact email and Cal.com link (WhatsApp is set: +91 79751 75419)
- Final approval of the concept project names (they can be renamed at any time)
- The Gemini conversation, if you still want it considered (the share link was blocked by a bot check)

---

## 12. Phase 5 results and launch checklist

**Lighthouse, production build, 2026-11-27** (local server, so HTTPS is missing until Vercel):

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home, desktop | 94–95 (LCP 1.4s) | 100 | 81 (HTTPS + source maps) | 100 |
| Home, mobile (throttled 4× CPU, slow 4G) | 49–57 (LCP 5–7s) | 100 | 81 | 100 |
| Concept pages, mobile | 57–59 | 100 | 81 | 100 |

- **Accessibility 100:** reveals use opacity rather than visibility, so screen readers can read content before it animates in.
- **Reduced motion, checked in real Chrome:** the theme locks to Solar, and there's no intro, smooth scrolling, line splitting or pinning. All content is visible.
- **Mobile performance is the open trade-off.** Most of the cost is the three.js 3D, about 3s of CPU on a throttled phone. If JavaScript hasn't taken over within 1.2s, the page now shows as-is and skips the intro. Next lever if needed: load the 3D only on capable devices, or after the page is idle.

**Built in Phase 5:** sitemap, robots.txt, canonical URLs, share images for every page (`next/og`), JSON-LD `Organization`, favicon, a themed 404 page, baseline security headers, and Vercel Analytics and Speed Insights (only loaded on Vercel).

**Launch checklist (needs you):**
1. Put the code in a GitHub repo, or deploy with the Vercel CLI.
2. Import it into Vercel. Framework and build settings are detected automatically.
3. Add environment variables in Vercel: `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM` (see `.env.example`), and `NEXT_PUBLIC_SITE_URL` once the domain exists.
4. In Resend, verify the sending domain so mail reaches any inbox.
5. Add the domain in Vercel → Domains, and point DNS at it.
6. Enable Web Analytics and Speed Insights in the Vercel project.
7. Replace the placeholder email in `lib/site.ts` (and the Cal.com link, if any).

---

## Sources

[Codrops: scroll-driven 3D world](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/) · [Codrops: curved path animations](https://tympanus.net/codrops/2025/12/17/building-responsive-scroll-triggered-curved-path-animations-with-gsap/) · [GSAP Three.js waypoints demo](https://demos.gsap.com/demo/threejs-scroll-waypoints/) · [GSAP forum: MotionPath on scroll](https://gsap.com/community/forums/topic/23516-onscroll-move-object-on-a-path-with-motionpathplugin/) · [Three.js forum: 3D portfolio](https://discourse.threejs.org/t/interactive-3d-portfolio-scroll-experience/46109) · [Awwwards dark mode](https://www.awwwards.com/awwwards/collections/dark-mode/) · [Webflow cyberpunk](https://webflow.com/made-in-webflow/cyberpunk) · [Webflow: GSAP free](https://webflow.com/blog/gsap-becomes-free) · [GSAP standard license](https://gsap.com/community/standard-license/) · [Three.js 2026 changes](https://www.utsubo.com/blog/threejs-2026-what-changed) · [Frontier web APIs 2026](https://www.utsubo.com/blog/frontier-web-apis-2026-production-ready) · [NN/g scrolljacking](https://www.nngroup.com/articles/scrolljacking-101/) · [A List Apart: safer animation](https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity) · [WCAG 2.3.3](https://w3.org/WAI/WCAG21/Understanding/animation-from-interactions) · [next-themes issues](https://dev.to/wrksz/i-was-tired-of-next-themes-being-abandoned-so-i-built-a-drop-in-replacement-4dbk) · [Tailwind v4 multi-theme](https://dev.to/praveen-sripati/how-i-built-a-multi-theme-system-using-new-tailwind-css-v4-react-27j3) · [Scroll-driven animations status](https://dev.to/richicodes/scroll-driven-animations-are-baseline-at-last-3c8g)
