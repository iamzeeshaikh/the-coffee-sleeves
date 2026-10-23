// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://thecoffeesleeves.com',
  trailingSlash: 'always',
  output: 'static',
  adapter: vercel(),
  build: {
    format: 'directory',
  },
  redirects: {
    // WooCommerce endpoints with no equivalent on a quotation site (see REDIRECT_MAP.csv)
    // Products are ordered online since 2026-10-23 (100 sleeves = $30); the old cart URL opens the checkout.
    '/cart/': { status: 301, destination: '/checkout/' },
    '/my-account/': { status: 301, destination: '/contact/' },
    // The brand archive listed every product, so it was a 99% copy of /shop/.
    '/brand/the-coffee-sleeves/': { status: 301, destination: '/shop/' },
  },
});
