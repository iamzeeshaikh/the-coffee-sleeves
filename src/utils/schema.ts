/**
 * JSON-LD builders.
 *
 * Every page used to inline its own graphs, which is how the site ended up
 * with Organization and WebSite on the homepage only and no FAQPage anywhere
 * despite rendering FAQs on both the /faq page and every product page.
 *
 * No aggregateRating or review is emitted: the store has no genuine review
 * data (0 comments in the WP export; the old site's 5/5 came from a single
 * fabricated "webmaster" review — see reports/STRUCTURED_DATA_REPORT.md).
 */
import site from '../data/site.json';
import type { Faq } from './site';

const abs = (path: string) => `${site.url}${path}`;

export interface Crumb {
  name: string;
  url?: string;
}

export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: `${site.url}/`,
    logo: `${site.url}/favicon-192x192.png`,
    email: site.email,
    telephone: '+1-503-358-0443',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.zip,
      addressCountry: 'US',
    },
  };
}

export function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: `${site.url}/`,
    publisher: { '@id': `${site.url}/#organization` },
  };
}

export function breadcrumbs(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.url ? { item: abs(c.url) } : {}),
    })),
  };
}

/** Only ever called with FAQs the same page renders. */
export function faqPage(faqs: Faq[]) {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/**
 * Shipping and returns as published on the shipping-policy and
 * refund_returns pages. Note there is deliberately no `shippingRate`: the
 * policy states rates are calculated at checkout from weight, destination and
 * method, so any single figure here would be invented.
 */
const SHIPPING_DETAILS = {
  '@type': 'OfferShippingDetails',
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: {
      '@type': 'QuantitativeValue',
      minValue: 1,
      maxValue: 3,
      unitCode: 'DAY',
    },
    transitTime: {
      '@type': 'QuantitativeValue',
      minValue: 3,
      maxValue: 7,
      unitCode: 'DAY',
    },
  },
};

const RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'US',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 10,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
};

/**
 * The offer was an AggregateOffer over a $0.12-$0.90 range. A price range
 * leaves the product ineligible for a merchant listing, so it now carries the
 * single site-wide $0.30 per-sleeve entry price, which is also the figure the
 * product cards and listing pages display.
 */
export const UNIT_PRICE = '0.30';

export function product(input: {
  name: string;
  url: string;
  sku: string;
  description: string;
  images: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${abs(input.url)}#product`,
    name: input.name,
    url: abs(input.url),
    sku: input.sku,
    description: input.description,
    brand: { '@type': 'Brand', name: site.name },
    ...(input.images.length ? { image: input.images } : {}),
    offers: {
      '@type': 'Offer',
      url: abs(input.url),
      price: UNIT_PRICE,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: '2027-08-04',
      seller: { '@id': `${site.url}/#organization` },
      shippingDetails: SHIPPING_DETAILS,
      hasMerchantReturnPolicy: RETURN_POLICY,
    },
  };
}

/** Listing pages: the CollectionPage owns the ItemList of what it shows. */
export function collectionPage(input: {
  path: string;
  name: string;
  description: string;
  items: { name: string; url: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${abs(input.path)}#collectionpage`,
    url: abs(input.path),
    name: input.name,
    description: input.description,
    isPartOf: { '@id': `${site.url}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      name: input.name,
      numberOfItems: input.items.length,
      itemListElement: input.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        url: abs(it.url),
      })),
    },
  };
}

/**
 * Article schema for the blog. Posts carry no byline, so the organisation is
 * author as well as publisher.
 */
export function blogPosting(post: {
  title: string;
  metaDescription: string;
  url: string;
  image: string;
  date: string;
}) {
  const published = `${post.date}T12:00:00Z`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${abs(post.url)}#article`,
    headline: post.title,
    description: post.metaDescription,
    url: abs(post.url),
    image: abs(post.image),
    datePublished: published,
    dateModified: published,
    inLanguage: 'en-US',
    author: { '@id': `${site.url}/#organization` },
    publisher: { '@id': `${site.url}/#organization` },
    isPartOf: { '@id': `${site.url}/#website` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': abs(post.url) },
  };
}
