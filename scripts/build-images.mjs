// Generate optimized image renditions from migration originals into public/images.
// Outputs per image: original-format copy (capped at 1200px), full-size .webp,
// and a 600w .webp thumbnail. Writes src/data/image-manifest.json with dimensions.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve(import.meta.dirname, '../../migration-workspace/images-orig');
const OUT = path.resolve(import.meta.dirname, '../public/images');
const MANIFEST = path.resolve(import.meta.dirname, '../src/data/image-manifest.json');

fs.mkdirSync(OUT, { recursive: true });
const manifest = {};

const files = fs.readdirSync(SRC).filter(f => /\.(jpe?g|png|webp|gif|svg)$/i.test(f) && !f.startsWith('._'));
for (const f of files) {
  const src = path.join(SRC, f);
  const ext = path.extname(f).toLowerCase();
  const base = path.basename(f, ext);
  if (ext === '.svg' || ext === '.gif') {
    fs.copyFileSync(src, path.join(OUT, f));
    manifest[f] = { file: f };
    continue;
  }
  const img = sharp(src);
  const meta = await img.metadata();
  const width = Math.min(meta.width, 1200);
  const resized = sharp(src).resize({ width, withoutEnlargement: true });
  const outMain = path.join(OUT, f);
  if (!fs.existsSync(outMain)) {
    if (ext === '.png') await resized.png({ quality: 85 }).toFile(outMain);
    else await resized.jpeg({ quality: 82, mozjpeg: true }).toFile(outMain);
  }
  const outWebp = path.join(OUT, `${base}.webp`);
  if (!fs.existsSync(outWebp)) await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outWebp);
  const outThumb = path.join(OUT, `${base}-600w.webp`);
  if (!fs.existsSync(outThumb)) await sharp(src).resize({ width: Math.min(600, meta.width), withoutEnlargement: true }).webp({ quality: 78 }).toFile(outThumb);
  const finalMeta = await sharp(outMain).metadata();
  manifest[f] = { file: f, webp: `${base}.webp`, thumb: `${base}-600w.webp`, width: finalMeta.width, height: finalMeta.height };
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
console.log(`Processed ${files.length} images -> ${OUT}`);
