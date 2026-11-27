import type { MDXComponents } from "mdx/types";

// Typography for concept case studies (content/work/*.mdx).
const components: MDXComponents = {
  h2: (p) => <h2 data-split className="mt-24 max-w-[18ch] text-balance font-display text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-[0.95] tracking-tight" {...p} />,
  h3: (p) => <h3 className="mt-10 font-display text-xl font-extrabold" {...p} />,
  p: (p) => <p data-reveal className="mt-5 max-w-[62ch] text-lg text-muted" {...p} />,
  ul: (p) => <ul data-reveal="stagger" className="mt-5 grid max-w-[62ch] gap-2 text-lg text-muted" {...p} />,
  li: (p) => <li className="flex gap-3 before:text-accent before:content-['+']" {...p} />,
  strong: (p) => <strong className="font-semibold text-fg" {...p} />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
