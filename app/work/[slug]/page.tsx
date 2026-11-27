import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TransitionLink } from "@/components/Transition";
import { WORK, findWork } from "@/content/work";
import { THEMES } from "@/lib/themes";

const pad = "px-4 sm:px-8 lg:px-16";

export const dynamicParams = false;
export const generateStaticParams = () => WORK.map((w) => ({ slug: w.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const w = findWork((await params).slug);
  if (!w) return {};
  const title = `${w.name} (concept)`;
  return {
    title,
    description: w.summary,
    alternates: { canonical: `/work/${w.slug}` },
    openGraph: { type: "article", title, description: w.summary, url: `/work/${w.slug}` },
  };
}

export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = findWork(slug);
  if (!w) notFound();
  const { default: Body } = await import(`@/content/work/${slug}.mdx`);
  const next = WORK[(WORK.indexOf(w) + 1) % WORK.length];

  return (
    // One Journey section for the whole page: Journey mode shows this project's theme.
    <article data-theme-section={w.theme} className={`pb-32 pt-36 ${pad}`}>
      <TransitionLink href="/#work" theme="solar" label="Aadyant Labs" className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-fg">
        All concept work
      </TransitionLink>

      <header className="mt-10 grid gap-6">
        <p className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-accent">
          <span className="rounded-full bg-fg px-3 py-1 text-bg">Concept</span>
          <span data-scramble>{w.kind}</span>
        </p>
        <h1 data-split className="max-w-[14ch] text-balance font-display text-[clamp(2rem,5vw_+_1.1rem,6rem)] font-extrabold leading-[0.92] tracking-tight">
          {w.name}
        </h1>
        <p data-reveal className="max-w-[54ch] text-lg text-muted sm:text-xl">{w.summary}</p>
        <dl data-reveal="stagger" className="grid gap-4 border-y border-line py-6 font-mono text-sm sm:grid-cols-3">
          <div><dt className="text-muted">Client</dt><dd>Fictional, for demonstration</dd></div>
          <div><dt className="text-muted">Our role</dt><dd>{w.role}</dd></div>
          <div><dt className="text-muted">Theme</dt><dd>{THEMES[w.theme].name}</dd></div>
        </dl>
      </header>

      <Body />

      <nav aria-label="More" className="mt-32 grid gap-4 border-t border-line pt-12 sm:grid-cols-2">
        <TransitionLink href={`/work/${next.slug}`} entrance={next.entrance} theme={next.theme} label={next.name} className="group grid gap-2 rounded-2xl border border-line p-6 hover:border-accent">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Next concept</span>
          <span className="font-display text-3xl font-extrabold group-hover:text-accent">{next.name}</span>
        </TransitionLink>
        <TransitionLink href="/#contact" theme="solar" label="Let's talk" data-magnetic className="grid content-center gap-2 rounded-2xl bg-accent p-6 text-bg">
          <span className="font-mono text-xs uppercase tracking-[0.14em] opacity-70">Have a project like this?</span>
          <span className="font-display text-3xl font-extrabold">Start a project</span>
        </TransitionLink>
      </nav>
    </article>
  );
}
