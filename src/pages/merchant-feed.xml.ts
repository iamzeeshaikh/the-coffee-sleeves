// Google Merchant feed from the same catalogue and price as the pages: one item per
// sleeve design = one run of 100 sleeves (src/utils/order.ts).
import { products, localImage, site } from '../utils/site';
import { PACK_PRICE_TEXT, PACK_QTY } from '../utils/order';

const x = (s: unknown) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
const text = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function GET() {
  const items = products.map((p) => {
    const img = p.images[0] ? localImage(p.images[0].url) : null;
    const extra = p.images.slice(1, 6).map((i) => localImage(i.url)).filter(Boolean).map((i) => `\n    <g:additional_image_link>${x(site.url + i!.src)}</g:additional_image_link>`).join('');
    const desc = (text(p.shortDescription) || text(p.description) || p.metaDescription).slice(0, 4800);
    return `  <item>
    <g:id>TCS-${p.id}</g:id>
    <title>${x(`${p.name} - ${PACK_QTY} Custom Printed Sleeves`)}</title>
    <description>${x(`${desc} Sold in runs of ${PACK_QTY} sleeves, printed with your artwork after a free digital proof.`)}</description>
    <link>${site.url}/product/${x(p.slug)}/</link>${img ? `\n    <g:image_link>${x(site.url + img.src)}</g:image_link>` : ''}${extra}
    <g:availability>in_stock</g:availability>
    <g:condition>new</g:condition>
    <g:price>${PACK_PRICE_TEXT} USD</g:price>
    <g:multipack>${PACK_QTY}</g:multipack>
    <g:brand>${x(site.name)}</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:product_type>${x(p.categories.join(' > ') || 'Cup Sleeves')}</g:product_type>
    <g:shipping><g:country>US</g:country><g:service>Free shipping</g:service><g:price>0.00 USD</g:price></g:shipping>
  </item>`;
  }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${x(site.name)}</title>
  <link>${site.url}/</link>
  <description>Custom printed cup sleeves, sold in runs of ${PACK_QTY}.</description>
${items}
</channel>
</rss>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
