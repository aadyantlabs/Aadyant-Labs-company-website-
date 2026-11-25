// Everything the team still has to decide lives here, so launch day is one file of edits.

export const email = 'hello@aadyantlabs.dev';

// TODO(launch): real WhatsApp number, country code first, digits only, e.g. '919876543210'.
export const whatsappNumber = import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '';
export const whatsappLink = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      'Hi Aadyant Labs, I would like to talk about a project.',
    )}`
  : '';

// Web3Forms access keys are public by design (they only allow sending to the owner's inbox).
export const formKey = import.meta.env.PUBLIC_WEB3FORMS_KEY ?? '';

// TODO(launch): team agrees starting prices; null shows "Quoted after a free call".
export const services = [
  {
    name: 'Websites for businesses',
    includes: 'Up to 6 pages, mobile-first, contact form, hosting set up in your name.',
    from: null as string | null, // e.g. '₹15,000'
  },
  {
    name: 'Web apps and portals',
    includes: 'Logins, payments, admin dashboards, databases.',
    from: null as string | null,
  },
  {
    name: 'Custom tools and automation',
    includes: 'Internal tools, data cleanup, tournament and event systems.',
    from: null as string | null,
    quoted: true,
  },
];

export const steps = [
  'Free 30-minute call to understand what you need.',
  'Written scope and a fixed price within 2 days.',
  'You pay 50% and we start.',
  'Weekly previews on a live link you can click through.',
  'Launch, then the remaining 50%.',
  '30 days of free fixes after launch.',
];

// TODO(launch): real photos in public/team/, names, roles.
export const team = [
  { name: 'Vidwath N Karanth', role: 'Co-founder', github: 'VidwathN-Karanth', photo: '' },
  { name: 'Co-founder name', role: 'Co-founder', github: 'aadyantlabs', photo: '' },
];

// TODO(launch): team reviews these answers before launch.
export const faq = [
  {
    q: 'How much does a website cost?',
    a: 'It depends on the number of pages and features. After a free 30-minute call you get a written scope and a fixed price within 2 days, so the number never changes halfway through.',
  },
  {
    q: 'How long does it take?',
    a: 'A business website usually takes 2 to 3 weeks. Web apps and portals take longer; the timeline is written into your scope before you pay anything.',
  },
  {
    q: 'Do I own the code and the domain?',
    a: 'Yes. The domain is registered in your name, the code lives in a repository you own, and hosting is set up on your account.',
  },
  {
    q: 'Who hosts it, and what does that cost me?',
    a: 'Most sites we build run on free hosting plans, so the only running cost is the domain, usually under ₹1,500 a year. If your project needs paid hosting, we tell you the monthly cost in the scope.',
  },
  {
    q: 'What happens after the 30 days?',
    a: 'Fixes for anything we built wrong are always free. New features or content changes after 30 days are quoted per request, or you can ask us for a monthly maintenance plan.',
  },
];
