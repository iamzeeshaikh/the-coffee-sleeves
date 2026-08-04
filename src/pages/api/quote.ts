export const prerender = false;

import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_EXT = /\.(pdf|png|jpe?g|ai|eps|svg|zip)$/i;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/postscript',
  'application/illustrator',
  'application/octet-stream',
]);

// Simple in-memory rate limit per instance (Vercel functions are short-lived,
// so this is best-effort; the honeypot plus origin check do most of the work).
const hits = new Map<string, { count: number; ts: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    hits.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function clean(value: FormDataEntryValue | null, max = 500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

const json = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Origin / CSRF protection: only accept same-origin browser posts.
  const origin = request.headers.get('origin');
  const allowedHosts = [
    'thecoffeesleeves.com',
    'www.thecoffeesleeves.com',
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    'localhost:4321',
  ].filter(Boolean) as string[];
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).host;
    } catch {
      return json(403, { success: false, message: 'Invalid request origin.' });
    }
    const isLocal = host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
    if (!allowedHosts.includes(host) && !host.endsWith('.vercel.app') && !isLocal) {
      return json(403, { success: false, message: 'Invalid request origin.' });
    }
  }

  if (rateLimited(clientAddress ?? 'unknown')) {
    return json(429, {
      success: false,
      message: 'Too many requests. Please try again later or call (503) 358-0443.',
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { success: false, message: 'Invalid form submission.' });
  }

  // Honeypot: real users never fill this.
  if (clean(form.get('website')) !== '') {
    // Pretend success so bots do not adapt.
    return json(200, { success: true });
  }

  const email = clean(form.get('email'), 254);
  const name = clean(form.get('name'), 120);
  const phone = clean(form.get('phone'), 40);
  const company = clean(form.get('company'), 120);
  const product = clean(form.get('product') ?? form.get('material'), 200);
  const quantity = clean(form.get('quantity'), 60);
  const message = typeof form.get('message') === 'string'
    ? (form.get('message') as string).trim().slice(0, 5000)
    : '';
  const pageUrl = clean(form.get('page_url') ?? form.get('form_source'), 300);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json(422, { success: false, message: 'Please provide a valid email address.' });
  }
  if (!phone && !message && !name) {
    return json(422, { success: false, message: 'Please fill in the form before submitting.' });
  }

  // Optional artwork upload
  const attachments: { filename: string; content: Buffer }[] = [];
  const file = form.get('artwork') ?? form.get('design_file') ?? form.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return json(422, { success: false, message: 'File too large — maximum size is 8 MB.' });
    }
    if (!ALLOWED_EXT.test(file.name) || (file.type && !ALLOWED_MIME.has(file.type))) {
      return json(422, {
        success: false,
        message: 'Unsupported file type. Please upload PDF, PNG, JPG, AI, EPS, SVG or ZIP.',
      });
    }
    attachments.push({
      filename: file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120),
      content: Buffer.from(await file.arrayBuffer()),
    });
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_TO,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    QUOTE_TO_EMAIL,
    QUOTE_FROM_EMAIL,
  } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('quote endpoint: SMTP env vars missing');
    return json(500, {
      success: false,
      message:
        'Our quote form is temporarily unavailable. Please email info@thecoffeesleeves.com or call (503) 358-0443.',
    });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const lines = [
    `Name: ${name || '—'}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    company ? `Company: ${company}` : null,
    product ? `Product: ${product}` : null,
    quantity ? `Quantity: ${quantity}` : null,
    pageUrl ? `Submitted from: ${pageUrl}` : null,
    '',
    'Message:',
    message || '—',
  ].filter((l) => l !== null);

  try {
    await transporter.sendMail({
      from: {
        name: SMTP_FROM_NAME ?? 'The Coffee Sleeves',
        address: SMTP_FROM_EMAIL ?? QUOTE_FROM_EMAIL ?? SMTP_USER,
      },
      to: SMTP_TO ?? QUOTE_TO_EMAIL ?? 'info@thecoffeesleeves.com',
      replyTo: email,
      subject: `Quote request${product ? ` — ${product}` : ''} (thecoffeesleeves.com)`,
      text: lines.join('\n'),
      attachments,
    });
  } catch (err) {
    console.error('quote endpoint: sendMail failed', err);
    return json(502, {
      success: false,
      message:
        'We could not send your request right now. Please email info@thecoffeesleeves.com or call (503) 358-0443.',
    });
  }

  return json(200, { success: true, message: 'Thank you! Your request has been sent.' });
};

export const GET: APIRoute = () => json(405, { success: false, message: 'Method not allowed.' });
