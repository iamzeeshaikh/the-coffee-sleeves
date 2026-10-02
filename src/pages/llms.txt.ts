import type { APIRoute } from 'astro';
import { products, categories, site } from '../utils/site';
import { BLOG_POSTS } from '../utils/blog';
import { pageExtras } from '../utils/page-extras';

/**
 * llms.txt: a plain-text map of the site for AI assistants and answer engines,
 * built from the same data as the pages so it never drifts.
 */
export const GET: APIRoute = () => {
  const line = (title: string, path: string, note: string) => `- [${title}](${site.url}${path}): ${note}`;
  const body = [
    `# ${site.name}`,
    '',
    '> Custom printed coffee cup sleeves in kraft, cardboard, paper and corrugated board for cafes, roasters, events and brands. Quote-based, orders from 100 pieces, free design help.',
    '',
    `Phone ${site.phone}. Email ${site.email}. Free quotes at ${site.url}/get-quote/.`,
    '',
    '## Categories',
    line('All cup sleeves', '/shop/', pageExtras['shop'].metaDescription),
    ...categories.map((c) =>
      line(c.name, `/product-category/${c.slug}/`, pageExtras[c.slug]?.metaDescription ?? c.metaDescription),
    ),
    '',
    '## Products',
    ...products.map((p) => line(p.name, `/product/${p.slug}/`, p.metaDescription)),
    '',
    '## Guides',
    ...BLOG_POSTS.map((b) => line(b.title, b.url, b.metaDescription)),
    '',
    '## Company',
    line('Get a quote', '/get-quote/', pageExtras['get-quote'].metaDescription),
    line('FAQ', '/faq/', pageExtras['faq'].metaDescription),
    line('About us', '/about-us/', pageExtras['about-us'].metaDescription),
    line('Contact', '/contact/', pageExtras['contact'].metaDescription),
    line('Shipping policy', '/shipping-policy/', 'Processing times, delivery windows, tracking and international shipping.'),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
