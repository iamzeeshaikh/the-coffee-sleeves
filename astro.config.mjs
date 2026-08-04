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
    '/cart/': { status: 301, destination: '/get-quote/' },
    '/checkout/': { status: 301, destination: '/get-quote/' },
    '/my-account/': { status: 301, destination: '/contact/' },
  },
});
