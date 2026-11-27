import Image from "next/image";
import ContactForm from "@/components/ContactForm";
import ProcessPath from "@/components/ProcessPath";
import { TransitionLink } from "@/components/Transition";
import { WORK } from "@/content/work";
import { site } from "@/lib/site";

// Journey themes per PLAN.md §6.

const pad = "px-4 sm:px-8 lg:px-16";
// Syne 800 is very wide: scale with the viewport so long words ("remember", "dashboards") fit a 375px phone.
const h2 = "max-w-[18ch] text-balance font-display text-[clamp(1.9rem,6vw,3.5rem)] font-extrabold leading-[0.98] tracking-tight";
const card = "rounded-2xl border border-line bg-surface/60 backdrop-blur-sm";

const SERVICES = [
  {
    title: "Websites & landing pages",
    body: "Fast, animated sites that make a strong first impression and turn visitors into enquiries.",
    items: ["Company sites, portfolios and launch pages", "Landing pages for campaigns and products", "Motion, 3D and theming, like this site", "Search, analytics and speed set up from day one"],
  },
  {
    title: "Web apps & dashboards",
    body: "Custom software for the work behind the scenes, as pleasant to use as it is to look at.",
    items: ["Dashboards and admin panels", "Booking, registration and order flows", "Customer portals and logins", "Payments, email and WhatsApp integrations"],
  },
];

const CLIENTS = ["Resorts & hospitality", "New businesses & startups", "Event organizers", "Anyone with something to launch"];

const STEPS = [
  { name: "Discover", when: "Week 1", body: "We learn about your customers, your goals and what makes you different. You get a short plan and a fixed quote." },
  { name: "Design", when: "Weeks 2-3", body: "Moodboards first, then real page designs you can click through. You choose the direction." },
  { name: "Build", when: "Weeks 3-6", body: "We build it with the tools game studios use, and share a live preview link every week." },
  { name: "Launch", when: "Week 6 on", body: "Domain, speed checks and search setup, then we go live. We stay on for fixes and updates." },
];

const CRAFT = [
  { name: "Theming", body: "Scroll and the whole site changes world, down to the particles behind this text." },
  { name: "Motion", body: "Scroll-linked animation, tuned so it follows your scroll instead of fighting it." },
  { name: "3D", body: "Real-time 3D in the browser, made light enough to run smoothly on phones." },
  { name: "Speed & access", body: "Respects reduced-motion settings, works with screen readers and loads on slow connections." },
];

const TOOLS = ["Next.js", "React", "three.js", "GSAP", "Tailwind CSS", "Vercel"];

export default function Home() {
  return (
    <>
      {/* 1 · Hero: text in the left column (side layout) or at the bottom (narrow), particles fill the rest */}
      <section id="hero" data-theme-section="solar" className={`flex min-h-[100dvh] flex-col justify-end gap-6 pb-16 pt-24 side:justify-center ${pad}`}>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent" data-reveal data-scramble>Web design &amp; development studio</p>
        <h1 data-split className="max-w-[14ch] text-balance font-display text-[clamp(2.2rem,3.3vw,3.75rem)] font-extrabold leading-[0.98] tracking-tight side:max-w-[56%]">
          We build websites <br className="hidden side:block" />people remember
        </h1>
        <div data-reveal="stagger" className="grid gap-7 side:max-w-[52%]">
          <p className="max-w-[46ch] text-lg text-muted sm:text-xl">
            We design and build fast, animated websites and web apps that work beautifully on every device.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#contact" data-magnetic className="inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-medium text-bg transition-transform active:scale-[0.98]">Start a project</a>
            <a href="#work" className="inline-flex min-h-12 items-center rounded-full border border-line px-7 font-medium transition-colors hover:border-fg">See concept work</a>
          </div>
        </div>
      </section>

      {/* 2 · Belief: one statement, no cards */}
      <section id="belief" data-theme-section="solar" className={`grid gap-8 py-28 ${pad}`}>
        <h2 data-split className={h2}>From first idea to final pixel</h2>
        <div data-reveal="stagger" className="grid max-w-[60ch] gap-5 text-lg text-muted sm:text-xl">
          <p><span className="text-fg">Ādyanta</span> is Sanskrit for “beginning and end”. We take that literally.</p>
          <p>We&apos;re with you from the first sketch to launch day, and after it: strategy, design, build, and the small fixes nobody else wants to do.</p>
          <p>One small team, from first call to launch. The people you meet are the people who build it.</p>
        </div>
      </section>

      {/* 3 · Services: two offers side by side, clients as a quiet row underneath */}
      <section id="services" data-theme-section="solar" className={`grid gap-12 py-28 ${pad}`}>
        <h2 data-split className={h2}>Two things we build. One standard.</h2>
        <div data-reveal="stagger" className="grid gap-4 md:grid-cols-2">
          {SERVICES.map((s) => (
            <article key={s.title} className={`${card} grid content-start gap-4 p-6 sm:p-8`}>
              <h3 className="text-balance font-display text-2xl font-extrabold leading-tight">{s.title}</h3>
              <p className="text-muted">{s.body}</p>
              <ul className="grid gap-2 border-t border-line pt-4 text-sm">
                {s.items.map((i) => (
                  <li key={i} className="flex gap-3"><span aria-hidden="true" className="text-accent">+</span>{i}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div data-reveal className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h3 className="text-sm text-muted">Who we work with</h3>
          <ul className="flex flex-wrap gap-2">
            {CLIENTS.map((c) => (
              <li key={c} className="rounded-full border border-line px-4 py-1.5 text-sm">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4 · Concept work: real previews of each concept page */}
      <section id="work" data-theme-section="bloom" className="grid gap-12 overflow-x-clip py-28">
        <div className={`grid gap-6 ${pad}`}>
          <h2 data-split className={h2}>Three concepts you can click through</h2>
          <p data-reveal className="max-w-[60ch] text-lg text-muted">
            We&apos;re a new studio, so these are concept projects: real designs for fictional clients, built to show what we can do.
          </p>
        </div>
        <ul data-pin-row className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 ${pad} [scrollbar-width:thin]`} aria-label="Concept projects">
          {WORK.map((w) => (
            <li key={w.slug} className={`${card} w-[min(85vw,460px)] shrink-0 snap-start overflow-hidden lg:w-[38vw]`}>
              <TransitionLink href={`/work/${w.slug}`} entrance={w.entrance} theme={w.theme} label={w.name} data-reveal="stagger" className="group grid content-start gap-4">
                <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
                  <Image
                    src={`/work/${w.slug}.png`}
                    alt={`Preview of the ${w.name} concept`}
                    fill
                    sizes="(min-width: 1024px) 38vw, 85vw"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="grid gap-2 px-6 pb-6">
                  <p className="text-sm text-muted">Concept · {w.kind}</p>
                  <h3 className="font-display text-2xl font-extrabold">{w.name}</h3>
                  <p className="text-muted">{w.summary}</p>
                  <p className="mt-2 text-sm font-medium text-accent underline-offset-4 group-hover:underline">View concept</p>
                </div>
              </TransitionLink>
            </li>
          ))}
        </ul>
      </section>

      {/* 5 · Process: a real sequence, drawn as a path */}
      <section id="process" data-theme-section="deep" className={`grid gap-12 py-28 ${pad}`}>
        <div className="grid gap-6">
          <h2 data-split className={h2}>How a project runs</h2>
          <p data-reveal className="max-w-[60ch] text-lg text-muted">A typical project takes about six weeks. You see progress every week, and nothing goes live until you&apos;re happy.</p>
        </div>
        <ProcessPath>
          <ol data-reveal="stagger" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.name} className={`${card} grid content-start gap-3 p-6 transition-colors duration-500 data-active:border-accent`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl font-extrabold">{s.name}</h3>
                  <span className="text-sm text-muted">{s.when}</span>
                </div>
                <p className="text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </ProcessPath>
      </section>

      {/* 6 · What we build with: open rows instead of a card grid */}
      <section id="craft" data-theme-section="deep" className={`grid gap-10 py-28 ${pad}`}>
        <h2 data-split className={h2}>This site is our demo</h2>
        <dl data-reveal="stagger" className="grid max-w-5xl">
          {CRAFT.map((c) => (
            <div key={c.name} className="grid gap-2 border-t border-line py-6 md:grid-cols-[minmax(0,14rem)_1fr] md:gap-10">
              <dt className="font-display text-xl font-extrabold text-accent">{c.name}</dt>
              <dd className="max-w-[56ch] text-lg">{c.body}</dd>
            </div>
          ))}
        </dl>
        <ul data-reveal="stagger" className="flex flex-wrap gap-2" aria-label="Tools we use">
          {TOOLS.map((t) => (
            <li key={t} className="rounded-full border border-line px-4 py-1.5 text-sm text-muted">{t}</li>
          ))}
        </ul>
      </section>

      {/* 7 · Contact */}
      <section id="contact" data-theme-section="solar" className={`grid gap-12 py-28 lg:grid-cols-[1fr_1.2fr] ${pad}`}>
        <div className="grid content-start gap-6">
          <h2 data-split className={h2}>Let&apos;s build yours</h2>
          <div data-reveal="stagger" className="grid gap-6">
            <p className="max-w-[44ch] text-lg text-muted">Tell us what you&apos;re planning. WhatsApp is the fastest way to reach us, and we usually reply within a day.</p>
            <a href={site.whatsapp.href} target="_blank" rel="noopener" data-magnetic className="inline-flex min-h-12 items-center justify-self-start rounded-full bg-accent px-7 font-medium text-bg transition-transform active:scale-[0.98]">
              Message us on WhatsApp
            </a>
            <dl className="grid gap-3 text-sm">
              <div className="flex flex-wrap gap-x-4"><dt className="w-20 text-muted">WhatsApp</dt><dd className="select-all">{site.whatsapp.display}</dd></div>
              <div className="flex flex-wrap gap-x-4"><dt className="w-20 text-muted">Email</dt><dd className="select-all">{site.email}</dd></div>
              {site.cal && <div className="flex flex-wrap gap-x-4"><dt className="w-20 text-muted">Book a call</dt><dd><a href={site.cal} className="underline">Pick a time</a></dd></div>}
            </dl>
          </div>
        </div>
        <div data-reveal className="min-w-0">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
