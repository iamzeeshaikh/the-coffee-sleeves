// Post-build: make the 301 redirect routes match both /path and /path/ so the
// old WordPress URLs (which always used trailing slashes) redirect in one hop.
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(import.meta.dirname, '../.vercel/output/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let patched = 0;
for (const route of config.routes ?? []) {
  if (route.status === 301 && route.src && !route.src.includes('/?$')) {
    route.src = route.src.replace(/\$$/, '/?$');
    patched += 1;
  }
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`patched ${patched} redirect routes for trailing-slash tolerance`);
