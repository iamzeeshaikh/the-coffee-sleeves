// Responsive QA: loads pages at several widths, reports horizontal overflow,
// console errors, and saves full-page screenshots.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE ?? 'http://localhost:4399';
const OUT = process.argv[2] ?? '/tmp/qa';
const WIDTHS = [320, 375, 768, 1024, 1440];
const PAGES = process.env.QA_PAGES
  ? process.env.QA_PAGES.split(',')
  : [
      '/',
      '/product/cardboard-coffee-sleeves/',
      '/product/hot-cup-sleeves/',
      '/product-category/cup-sleeves/',
      '/shop/',
      '/faq/',
      '/contact/',
      '/get-quote/',
      '/terms-conditions/',
      '/refund_returns/',
      '/shipping-policy/',
      '/privacy-policy/',
      '/brand/the-coffee-sleeves/',
      '/definitely-missing-page/',
    ];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
});

const results = [];
for (const pagePath of PAGES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
    });
    page.on('pageerror', (err) => errors.push(String(err).slice(0, 200)));
    await page.setViewport({ width, height: 900 });
    const resp = await page.goto(BASE + pagePath, { waitUntil: 'networkidle0', timeout: 60000 });
    const status = resp?.status();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const over = doc.scrollWidth - doc.clientWidth;
      let worst = null;
      if (over > 1) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 && r.width > 40) {
            worst = `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(r.right)}`;
            break;
          }
        }
      }
      return { over, worst };
    });
    const slug = pagePath.replaceAll('/', '_') || 'home';
    if (width === 375 || width === 1440) {
      await page.screenshot({ path: path.join(OUT, `${slug}-${width}.png`), fullPage: true });
    }
    results.push({ page: pagePath, width, status, overflowPx: overflow.over, worst: overflow.worst, errors });
    await page.close();
  }
}
await browser.close();

let bad = 0;
for (const r of results) {
  const flag = (r.overflowPx > 1 ? 'OVERFLOW ' : '') + (r.errors.length ? 'JSERR' : '');
  if (flag || (r.status !== 200 && !r.page.includes('missing'))) bad++;
  if (flag || r.status !== 200)
    console.log(`${r.page} @${r.width}: status=${r.status} overflow=${r.overflowPx}px ${r.worst ?? ''} ${r.errors[0] ?? ''}`);
}
fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
console.log(`\nChecked ${results.length} page/width combos; ${bad} with issues. Results in ${OUT}/qa-results.json`);
