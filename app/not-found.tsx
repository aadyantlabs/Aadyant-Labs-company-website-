import { TransitionLink } from "@/components/Transition";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section data-theme-section="deep" className="flex min-h-svh flex-col justify-center gap-6 px-4 pt-28 sm:px-8 lg:px-16">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Error 404</p>
      <h1 className="max-w-[14ch] text-balance font-display text-[clamp(2.4rem,6vw_+_1rem,5rem)] font-extrabold leading-[0.95] tracking-tight">
        This page drifted into deep space
      </h1>
      <p className="max-w-[48ch] text-lg text-muted">The link may be old or mistyped. Everything we make is one click away.</p>
      <TransitionLink href="/" className="justify-self-start self-start rounded-full bg-accent px-7 py-3 font-medium text-bg">
        Back to home
      </TransitionLink>
    </section>
  );
}
