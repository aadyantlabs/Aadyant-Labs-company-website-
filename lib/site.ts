// Business details. Placeholders are marked TODO until confirmed.
const WHATSAPP = "917975175419"; // +91 79751 75419, country code assumed India

// Canonical URL: NEXT_PUBLIC_SITE_URL once the domain is set, else Vercel's production URL, else local.
const url =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const site = {
  name: "Aadyant Labs",
  tagline: "From first idea to final pixel",
  description: "Aadyant Labs designs and builds fast, animated websites and web apps that people remember.",
  url,
  whatsapp: { display: "+91 79751 75419", href: `https://wa.me/${WHATSAPP}`, tel: `+${WHATSAPP}` },
  email: "hello@example.com", // TODO: real address
  cal: "", // TODO: Cal.com link
};
