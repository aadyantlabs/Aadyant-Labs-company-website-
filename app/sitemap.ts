import type { MetadataRoute } from "next";
import { WORK } from "@/content/work";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "monthly", priority: 1 },
    ...WORK.map((w) => ({ url: `${site.url}/work/${w.slug}`, changeFrequency: "yearly" as const, priority: 0.6 })),
  ];
}
