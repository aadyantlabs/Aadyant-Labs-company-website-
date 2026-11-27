import type { ThemeKey } from "@/lib/themes";

export type Entrance = "ripple" | "blinds" | "rain";

export type Work = {
  slug: string;
  name: string;
  kind: string;
  theme: ThemeKey;
  /** The page transition used when arriving at this project. */
  entrance: Entrance;
  summary: string;
  role: string;
};

// Fictional clients, always labelled "Concept" on the site.
export const WORK: Work[] = [
  {
    slug: "pulseboard",
    name: "Pulseboard",
    kind: "Web app",
    theme: "solar",
    entrance: "ripple",
    summary: "An operations dashboard that puts a growing business's revenue, orders and customers on one live screen.",
    role: "Product design, front-end build, data visualisation",
  },
  {
    slug: "nook-and-brew",
    name: "Nook & Brew",
    kind: "Café launch",
    theme: "deep",
    entrance: "blinds",
    summary: "A neighbourhood café that opens with a name, a menu, a look and a waitlist of regulars.",
    role: "Naming, identity, launch site, waitlist",
  },
  {
    slug: "monsoon-sessions",
    name: "Monsoon Sessions",
    kind: "Music event",
    theme: "bloom",
    entrance: "rain",
    summary: "A rainy-season concert series with lineup, schedule and sign-ups that never miss a beat.",
    role: "Event identity, microsite, registration",
  },
];

export const findWork = (slug: string) => WORK.find((w) => w.slug === slug);
