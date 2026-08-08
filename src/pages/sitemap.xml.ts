import type { APIRoute } from 'astro';
import { products, categories, site } from '../utils/site';
import { BLOG_POSTS } from '../utils/blog';

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
    '/blog/',
    ...products.map((p) => `/product/${p.slug}/`),
    ...categories.map((c) => `/product-category/${c.slug}/`),
    ...BLOG_POSTS.map((b) => b.url),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${site.url}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
