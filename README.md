# Aadyant Labs website

Static site for [aadyantlabs.dev](https://aadyantlabs.dev), built with Astro. Plain CSS, self-hosted fonts, one small script for the scroll thread and one for the contact form.

## Run

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs dist/
```

## Edit content

- Prices, steps, team, FAQ, contact details: `src/data/site.ts`
- Case studies: one Markdown file per project in `src/content/work/` (`order: 1` is the large one on the home page)
- Screenshots: put them in `src/assets/` and pass them to `<Shot src={...} alt="..." />`
- Design tokens: `src/styles/tokens.css`

## Environment variables (Cloudflare Pages → Settings → Environment variables)

| Name | What |
| --- | --- |
| `PUBLIC_WEB3FORMS_KEY` | Web3Forms access key for hello@aadyantlabs.dev |
| `PUBLIC_WHATSAPP_NUMBER` | Digits only with country code, e.g. `919876543210`. The WhatsApp button hides until this is set. |

## Deploy

Cloudflare Pages, framework preset Astro, build command `npm run build`, output `dist`. Every branch gets a preview link; `main` is production.

## Before launch

Search the repo for `TODO(` — prices, team photos and names, screenshots, case study details, FAQ answers and the WhatsApp number are still placeholders.
