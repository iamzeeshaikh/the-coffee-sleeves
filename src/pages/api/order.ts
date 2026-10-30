// Orders from /checkout/. Every line is re-priced here from src/utils/order.ts, so a
// tampered browser can never change what an order costs. Spam signals only label the
// email (owner's rule: never drop a lead).
export const prerender = false;

import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { productBySlug } from '../../utils/site';
import { PACK_QTY, PACK_PRICE, MAX_PACKS, PAYMENT_METHODS, SHIP_COUNTRIES, money } from '../../utils/order';
import { spamReasons } from '../../utils/spam.js';

const RECIPIENTS = ['shanimazhar82@gmail.com', 'dev@zeecustomboxes.com'];
const SITE = 'https://thecoffeesleeves.com';
const MAX_FILE = 4 * 1024 * 1024;
const ALLOWED_EXT = /\.(pdf|png|jpe?g|ai|eps|svg|zip)$/i;
const FIELDS = ['name', 'email', 'phone', 'company', 'address1', 'address2', 'city', 'region', 'postal', 'country', 'notes', 'payment', 'items', 'ts', 'website'] as const;
const REQUIRED = ['name', 'email', 'phone', 'address1', 'city', 'region', 'postal'] as const;

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 8;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();
const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function orderRef() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `TCS-${ymd}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => abc[b % abc.length]).join('')}`;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const origin = request.headers.get('origin');
  if (origin) {
    const host = (() => { try { return new URL(origin).host; } catch { return ''; } })();
    const allowed = ['thecoffeesleeves.com', 'www.thecoffeesleeves.com', process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, 'localhost:4321'].filter(Boolean);
    if (!allowed.includes(host) && !host.endsWith('.vercel.app')) return json(403, { ok: false, error: 'Invalid request origin' });
  }

  let form: FormData;
  try { form = await request.formData(); } catch { return json(400, { ok: false, error: 'Could not read the order' }); }
  const v = Object.fromEntries(FIELDS.map((k) => [k, String(form.get(k) ?? '').trim().slice(0, k === 'items' ? 8000 : 2000)])) as Record<(typeof FIELDS)[number], string>;

  if (REQUIRED.some((k) => !v[k]) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(v.email)) return json(422, { ok: false, error: 'Please fill in every required field' });
  const country = SHIP_COUNTRIES.find((c) => c.code === (v.country || 'US'));
  if (!country) return json(422, { ok: false, error: 'We ship to addresses in the United States only' });
  const method = PAYMENT_METHODS.find((m) => m.id === v.payment);
  if (!method) return json(422, { ok: false, error: 'Choose a payment method' });

  // Never trust the browser's prices: rebuild every line from the catalogue.
  let raw: unknown = [];
  try { raw = JSON.parse(v.items || '[]'); } catch {}
  const lines = (Array.isArray(raw) ? raw : []).slice(0, 30)
    .map((l: any) => ({ p: productBySlug(String(l?.slug ?? '')), packs: Math.floor(Number(l?.packs)) }))
    .filter((l) => l.p && l.packs >= 1 && l.packs <= MAX_PACKS)
    .map((l) => ({ name: l.p!.name, url: `${SITE}/product/${l.p!.slug}/`, qty: l.packs * PACK_QTY, total: l.packs * PACK_PRICE }));
  if (!lines.length) return json(422, { ok: false, error: 'Your order is empty' });
  const total = lines.reduce((s, l) => s + l.total, 0);

  if (limited(clientAddress || request.headers.get('x-forwarded-for') || 'unknown')) return json(429, { ok: false, error: 'Too many orders from this connection, please call us' });

  const spam: string[] = [];
  if (v.website) spam.push('hidden field filled');
  const attachments: { filename: string; content: Buffer }[] = [];
  const file = form.get('artwork');
  if (file && typeof file === 'object' && 'arrayBuffer' in file && file.size > 0) {
    if (file.size <= MAX_FILE && ALLOWED_EXT.test(file.name)) attachments.push({ filename: file.name.replace(/[^\w.\- ]+/g, '_').slice(-120), content: Buffer.from(await file.arrayBuffer()) });
    else spam.push(`attachment not accepted (${file.name.slice(0, 60)})`);
  }
  spam.push(...spamReasons({ names: [v.name], email: v.email, phone: v.phone, message: v.notes, fields: { Company: v.company }, sentAt: v.ts }));
  const spamLine = spam.length ? `Spam check: ${spam.join('; ')}` : '';

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL, SMTP_FROM_NAME, QUOTE_FROM_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('order endpoint: SMTP env vars missing');
    return json(503, { ok: false, error: 'We could not send your order' });
  }
  const mailer = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT ?? 587), secure: Number(SMTP_PORT ?? 587) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  const from = { name: SMTP_FROM_NAME ?? 'The Coffee Sleeves', address: SMTP_FROM_EMAIL ?? QUOTE_FROM_EMAIL ?? SMTP_USER };

  const ref = orderRef();
  const address = [v.address1, v.address2, [v.city, v.region, v.postal].filter(Boolean).join(', '), country.name].filter(Boolean).join('\n');
  const payLine = `${method.name}: send the invoice after the customer approves the proof`;
  const itemText = lines.map((l) => `- ${l.name}: ${l.qty.toLocaleString('en-US')} sleeves, ${money(l.total)}`).join('\n');
  const td = 'style="padding:6px 12px;border-bottom:1px solid #e3e5e8"';
  const itemHtml = `<table style="font-family:sans-serif;border-collapse:collapse">${lines.map((l) => `<tr><td ${td}><a href="${l.url}">${esc(l.name)}</a></td><td ${td}>${l.qty.toLocaleString('en-US')} sleeves</td><td ${td} align="right">${money(l.total)}</td></tr>`).join('')}<tr><td ${td}>Shipping</td><td ${td}></td><td ${td} align="right">Free</td></tr><tr><th align="left" ${td}>Total</th><td ${td}></td><th ${td} align="right">${money(total)}</th></tr></table>`;
  const office = [
    `PAYMENT: ${payLine}`, spamLine, `Order ${ref}`, '', itemText, `Total: ${money(total)} (free shipping)`, '',
    `Name: ${v.name}`, `Email: ${v.email}`, `Phone: ${v.phone}`, v.company ? `Company: ${v.company}` : '',
    '', 'Ship to:', address, '', v.notes ? `Notes: ${v.notes}` : '', 'Site: thecoffeesleeves.com',
  ].filter((x) => x !== '').join('\n');

  try {
    await mailer.sendMail({
      from, to: RECIPIENTS, replyTo: { name: oneLine(v.name), address: oneLine(v.email) },
      subject: `${spam.length ? '[Possible spam] ' : ''}New order ${ref}: ${money(total)}, ${method.name} | thecoffeesleeves.com`,
      text: office,
      html: `<p style="font-family:sans-serif;font-size:16px;background:#fff4cc;padding:10px 12px"><b>PAYMENT:</b> ${esc(payLine)}</p>${spamLine ? `<p style="font-family:sans-serif;background:#fde3d8;padding:8px 12px">${esc(spamLine)}</p>` : ''}<h2 style="font-family:sans-serif">Order ${ref}</h2>${itemHtml}<p style="font-family:sans-serif">${esc(v.name)}<br>${esc(v.email)}<br>${esc(v.phone)}${v.company ? `<br>${esc(v.company)}` : ''}</p><p style="font-family:sans-serif"><b>Ship to</b><br>${esc(address).replace(/\n/g, '<br>')}</p>${v.notes ? `<p style="font-family:sans-serif"><b>Notes</b><br>${esc(v.notes).replace(/\n/g, '<br>')}</p>` : ''}`,
      attachments,
    });
  } catch (err) {
    console.error('order send failed', err instanceof Error ? err.message : err, ref);
    return json(502, { ok: false, error: 'We could not send your order' });
  }

  const steps = ['We check your artwork and email a free digital proof.', 'You approve the proof or ask for changes. Nothing is printed before you approve.', method.detail, 'Your sleeves are printed in 7 to 10 business days and ship free within the US.'];
  try {
    await mailer.sendMail({
      from, to: { name: oneLine(v.name), address: oneLine(v.email) }, replyTo: 'info@thecoffeesleeves.com',
      subject: `Your order ${ref} with The Coffee Sleeves`,
      text: [`Hi ${v.name},`, '', `Thank you for your order ${ref}.`, '', itemText, 'Shipping: free', `Total: ${money(total)}`, `Payment: ${method.name}`, '', 'What happens next:', ...steps.map((s, i) => `${i + 1}. ${s}`), '', `Ship to:\n${address}`, '', 'Questions? Call (503) 461-4788 or reply to this email.', 'The Coffee Sleeves'].join('\n'),
      html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.5"><p>Hi ${esc(v.name)},</p><p>Thank you for your order <b>${ref}</b>.</p>${itemHtml}<p><b>Payment:</b> ${esc(method.name)}</p><p><b>What happens next</b></p><ol>${steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><p><b>Ship to</b><br>${esc(address).replace(/\n/g, '<br>')}</p><p>Questions? Call (503) 461-4788 or reply to this email.</p><p>The Coffee Sleeves</p></div>`,
    });
  } catch (err) {
    console.error('order buyer copy failed', err instanceof Error ? err.message : err, ref);
  }

  return json(200, { ok: true, ref, total, payment: method.id });
};
