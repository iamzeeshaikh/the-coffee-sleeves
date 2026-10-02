import raw from '../data/page-extras.json';
import faqsExtra from '../data/faqs-extra.json';
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

const withPrice = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value).replaceAll('{price}', UNIT_PRICE_DISPLAY));

const more: Record<string, PageExtra['faqs']> = withPrice(faqsExtra);

/**
 * Further FAQs per page (every page carries at least ten). Keys are the page
 * keys below, policy page slugs and blog post slugs.
 */
export const extraFaqs = (key: string): PageExtra['faqs'] => more[key] ?? [];

export const pageExtras: Record<string, PageExtra> = Object.fromEntries(
  Object.entries(withPrice(raw as Record<string, PageExtra>)).map(([key, extra]) => [
    key,
    { ...extra, faqs: [...extra.faqs, ...extraFaqs(key)] },
  ]),
);
