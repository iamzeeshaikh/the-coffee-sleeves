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
    '> Custom printed coffee cup sleeves in kraft, cardboard, paper and corrugated board for cafes, roasters, events and brands. Fixed price of $30.00 per 100 sleeves ordered online (up to 5,000 sleeves), free design help and a free digital proof, free shipping within the United States only, paid by PayPal or bank transfer invoice after proof approval. Runs over 5,000 sleeves or special finishes are quoted.',
    '',
    `Phone ${site.phone} (Monday to Friday, 9am to 6pm EST). Email ${site.email}. Address ${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.zip}, United States. Production 7-10 business days after proof approval; US delivery 3-7 business days. Returns: defective, damaged or misprinted sleeves reported within 14 days of delivery are replaced or refunded; no change-of-mind returns.`,
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
    line('Get a quote (runs over 5,000 sleeves)', '/get-quote/', pageExtras['get-quote'].metaDescription),
    line('FAQ', '/faq/', pageExtras['faq'].metaDescription),
    line('About us', '/about-us/', pageExtras['about-us'].metaDescription),
    line('Contact', '/contact/', pageExtras['contact'].metaDescription),
    line('Shipping policy', '/shipping-policy/', 'Free shipping within the United States only, production and delivery times, tracking.'),
    line('Refund and returns policy', '/refund_returns/', 'Defective, damaged or misprinted sleeves reported within 14 days of delivery are replaced or refunded.'),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
