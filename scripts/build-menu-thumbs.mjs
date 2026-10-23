// 96px WebP thumbnails for the header menu (40px shown, 2x for retina). The site's smallest
// existing size is 600w, far too heavy for 30 menu icons. Re-run when a menu product changes.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const header = fs.readFileSync('src/components/Header.astro', 'utf8');
const slugs = [...new Set([...header.matchAll(/thumb\('([a-z0-9-]+)'\)/g)].map((m) => m[1]))];
const manifest = JSON.parse(fs.readFileSync('src/data/image-manifest.json', 'utf8'));
const outDir = 'public/images/menu';
fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (const slug of slugs) {
  const p = JSON.parse(fs.readFileSync(`src/data/products/${slug}.json`, 'utf8'));
  const file = (p.images[0]?.url ?? '').split('/').pop().replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');
  const entry = manifest[file];
  if (!entry) { console.warn('no image for', slug); continue; }
  await sharp(path.join('public/images', entry.file)).resize(96, 96, { fit: 'cover' }).webp({ quality: 72 }).toFile(path.join(outDir, `${slug}.webp`));
  n++;
}
console.log(`menu thumbs: ${n}/${slugs.length}`);
