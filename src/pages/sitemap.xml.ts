import type { APIRoute } from 'astro';
import { products, categories, site } from '../utils/site';

const STATIC_PATHS = [
  '/',
  '/about-us/',
  '/shop/',
  '/get-quote/',
  '/contact/',
  '/faq/',
  '/privacy-policy/',
  '/shipping-policy/',
  '/terms-conditions/',
  '/refund_returns/',
  '/brand/the-coffee-sleeves/',
];

export const GET: APIRoute = () => {
  const urls = [
    ...STATIC_PATHS,
    ...products.map((p) => `/product/${p.slug}/`),
    ...categories.map((c) => `/product-category/${c.slug}/`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${site.url}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
