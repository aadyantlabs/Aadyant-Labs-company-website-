import { WORK, findWork } from "@/content/work";
import { ogImage, ogSize } from "@/lib/og";

export const alt = "Aadyant Labs concept project";
export const size = ogSize;
export const contentType = "image/png";
export const generateStaticParams = () => WORK.map((w) => ({ slug: w.slug }));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const w = findWork((await params).slug)!;
  return ogImage({ theme: w.theme, eyebrow: `Concept · ${w.kind}`, title: w.name });
}
