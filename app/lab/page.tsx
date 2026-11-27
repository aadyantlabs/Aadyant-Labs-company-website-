import type { Metadata } from "next";
import Worlds from "@/components/lab/Worlds";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Theme worlds prototype", robots: { index: false, follow: false } };

const pad = "px-4 sm:px-8 lg:px-16";
const h2 = "max-w-[16ch] text-balance font-display text-[clamp(1.9rem,5vw,3.5rem)] font-extrabold leading-[0.98] tracking-tight";
const col = "grid max-w-[min(100%,40rem)] gap-6";
const card = "rounded-2xl border border-line bg-surface/55 p-6 backdrop-blur-md";

const WORK = [
  { name: "Pulseboard", kind: "Web app", body: "A live operations dashboard with real-time charts." },
  { name: "Nook & Brew", kind: "Café launch", body: "A warm launch site for a neighbourhood café." },
  { name: "Monsoon Sessions", kind: "Music event", body: "An event site with tickets and a line-up that moves." },
];
const STEPS = [
  { name: "Discover", when: "Week 1" }, { name: "Design", when: "Weeks 2-3" }, { name: "Build", when: "Weeks 3-6" }, { name: "Launch", when: "Week 6 on" },
];

export default function Lab() {
  return (
    <div id="lab">
      <Worlds />

      {/* World 1 · Futuristic */}
      <section data-world="0" className={`flex min-h-[100dvh] flex-col justify-end gap-6 pb-24 pt-28 side:justify-center side:pb-16 ${pad}`}>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Web design &amp; development studio</p>
        <h1 className="max-w-[14ch] text-balance font-display text-[clamp(2.2rem,4.2vw,4rem)] font-extrabold leading-[0.98] tracking-tight">We build websites people remember</h1>
        <p className="max-w-[44ch] text-lg text-muted sm:text-xl">We design and build fast, animated websites and web apps that work beautifully on every device.</p>
        <div className="flex flex-wrap gap-3">
          <a href="#contact" className="inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-medium text-bg">Start a project</a>
          <a href="#work" className="inline-flex min-h-12 items-center rounded-full border border-line px-7 font-medium">See concept work</a>
        </div>
      </section>
      <div aria-hidden="true" className="h-[40vh]" />

      {/* World 2 · Space */}
      <section id="work" data-world="1" className={`grid min-h-[100dvh] content-center gap-8 py-28 ${pad}`}>
        <h2 className={h2}>Three concepts you can click through</h2>
        <ul className="grid max-w-3xl gap-4 md:grid-cols-3">
          {WORK.map((w) => (
            <li key={w.name} className={card}><p className="text-sm text-muted">Concept · {w.kind}</p><h3 className="mt-1 font-display text-xl font-extrabold">{w.name}</h3><p className="mt-2 text-sm text-muted">{w.body}</p></li>
          ))}
        </ul>
      </section>
      <section className={`grid min-h-[100dvh] content-center gap-8 py-28 ${pad}`}>
        <div className={col}>
          <h2 className={h2}>How a project runs</h2>
          <p className="text-lg text-muted">A typical project takes about six weeks. You see progress every week.</p>
        </div>
        <ol className="grid max-w-3xl gap-3 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.name} className={`${card} flex items-baseline justify-between`}><span className="font-display text-xl font-extrabold">{s.name}</span><span className="text-sm text-muted">{s.when}</span></li>
          ))}
        </ol>
      </section>
      <div aria-hidden="true" className="h-[50vh]" />

      {/* World 3 · Rainforest */}
      <section data-world="2" className={`grid min-h-[100dvh] content-center gap-8 py-28 ${pad}`}>
        <div className={col}>
          <h2 className={h2}>From first idea to final pixel</h2>
          <p className="text-lg text-muted sm:text-xl"><span className="text-fg">Ādyanta</span> is Sanskrit for “beginning and end”. We take that literally.</p>
          <p className="text-lg text-muted sm:text-xl">One small team, from first call to launch. The people you meet are the people who build it.</p>
        </div>
      </section>
      <section className={`grid min-h-[100dvh] content-center gap-8 py-28 ${pad}`}>
        <h2 className={h2}>Two things we build. One standard.</h2>
        <div className="grid max-w-3xl gap-4 md:grid-cols-2">
          <article className={card}><h3 className="font-display text-2xl font-extrabold">Websites &amp; landing pages</h3><p className="mt-2 text-muted">Fast, animated sites that make a strong first impression.</p></article>
          <article className={card}><h3 className="font-display text-2xl font-extrabold">Web apps &amp; dashboards</h3><p className="mt-2 text-muted">Custom software for the work behind the scenes.</p></article>
        </div>
      </section>
      <div aria-hidden="true" className="h-[50vh]" />

      {/* World 4 · Lantern festival */}
      <section data-world="3" className={`grid min-h-[100dvh] content-center gap-8 py-28 ${pad}`}>
        <div className={col}>
          <h2 className={h2}>This site is our demo</h2>
          <p className="text-lg text-muted sm:text-xl">Four worlds, one scroll. Real-time 3D, made to feel calm rather than loud.</p>
        </div>
      </section>
      <section id="contact" className={`grid min-h-[100dvh] content-center gap-8 py-28 ${pad}`}>
        <div className={col}>
          <h2 className={h2}>Let&apos;s build yours</h2>
          <p className="text-lg text-muted">Tell us what you&apos;re planning. WhatsApp is the fastest way to reach us.</p>
          <a href={site.whatsapp.href} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center justify-self-start rounded-full bg-accent px-7 font-medium text-bg">Message us on WhatsApp</a>
        </div>
      </section>
    </div>
  );
}
