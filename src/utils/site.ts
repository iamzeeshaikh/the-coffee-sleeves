import site from '../data/site.json';
import categories from '../data/categories.json';
import manifest from '../data/image-manifest.json';

export { site, categories };

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Product {
  id: number;
  sku: string;
  slug: string;
  name: string;
  /** Unit price from the WooCommerce catalog export, e.g. "0.50" */
  price?: string;
  categories: string[];
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  description: string;
  specifications: string;
  faqs: Faq[];
  images: ProductImage[];
}

const productModules = import.meta.glob<Product>('../data/products/*.json', {
  eager: true,
  import: 'default',
});

export const products: Product[] = Object.entries(productModules)
  // Ignore macOS AppleDouble sidecar files (._foo.json) that can appear on
  // exFAT/network volumes and would otherwise be picked up by the glob.
  .filter(([path]) => !(path.split('/').pop() ?? '').startsWith('._'))
  .map(([, product]) => product)
  .sort((a, b) => a.name.localeCompare(b.name));

export function productBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function categoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function productsInCategory(name: string): Product[] {
  return products.filter((p) => p.categories.includes(name));
}

interface ManifestEntry {
  file: string;
  webp?: string;
  thumb?: string;
  width?: number;
  height?: number;
}

const imageManifest = manifest as Record<string, ManifestEntry>;

/** Map a WordPress upload URL (or bare filename) to local image info. */
export function localImage(urlOrFile: string): {
  src: string;
  webp: string | null;
  thumb: string | null;
  width: number | null;
  height: number | null;
} | null {
  let file = urlOrFile.split('/').pop() ?? '';
  file = file.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  const entry = imageManifest[file];
  if (!entry) return null;
  return {
    src: `/images/${entry.file}`,
    webp: entry.webp ? `/images/${entry.webp}` : null,
    thumb: entry.thumb ? `/images/${entry.thumb}` : null,
    width: entry.width ?? null,
    height: entry.height ?? null,
  };
}
