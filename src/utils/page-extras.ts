import raw from '../data/page-extras.json';
import { UNIT_PRICE_DISPLAY } from './schema';

/**
 * Metadata, sections and FAQs for the shop, category and company pages.
 * `{price}` in the copy becomes the site-wide entry price here, once, so the
 * visible text and the FAQPage schema carry the same figure as the Offer.
 */
export type PageExtra = {
  metaTitle: string;
  metaDescription: string;
  blurb?: string;
  sections: { title: string; body: string; bullets?: string[] }[];
  faqs: { q: string; a: string }[];
};

export const pageExtras: Record<string, PageExtra> = JSON.parse(
  JSON.stringify(raw).replaceAll('{price}', UNIT_PRICE_DISPLAY),
);
