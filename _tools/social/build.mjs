// TCH Works: share pictures, Pinterest auto-post feed, and download pages.
// Run from the repo root:  node _tools/social/build.mjs
// Safe to re-run. It only rewrites what it made before.
//
// Makes:
//   img/pins/<kind>-<slug>.jpg   1000x1500 Pinterest picture per shop page and Daily page
//   img/share/<kind>-<slug>.jpg  1200x630 link-preview picture (WhatsApp, Facebook, X, LinkedIn)
//   pins.xml                     RSS feed Pinterest reads to post new pins by itself
//   f/<token>/index.html         "Your download" page for each paid-file folder (noindex)
// and adds share tags between <!-- share:start --> and <!-- share:end --> on each page.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = (() => {
  // Playwright is declared in _tools/social/package.json: run `npm ci` there once,
  // then `npx playwright install chromium` (or set CHROMIUM_PATH to an existing Chromium).
  try { return createRequire(new URL('./package.json', import.meta.url))('playwright'); } catch {}
  try { return require(execFileSync('npm', ['root', '-g']).toString().trim() + '/playwright'); } catch {}
  throw new Error('Playwright not found. Run: cd _tools/social && npm ci && npx playwright install chromium');
})();

const ROOT = process.cwd();
const SITE = 'https://www.tchworks.co.uk';
const PIN_MAX_PRICE = 60; // services (£197+) are not pinned: Pinterest buyers are planner buyers

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, '’').replace(/&nbsp;/g, ' ')
  .replace(/&middot;/g, '·').replace(/&pound;/g, '£').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
  .replace(/\s+/g, ' ').trim();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pick = (html, re) => { const m = html.match(re); return m ? decode(m[1]) : ''; };

function addedDate(file) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%aI', '--', file], { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
    if (out.length) return new Date(out[out.length - 1]);
  } catch {}
  return new Date();
}

// ---------- collect pages ----------
function pageFiles(dir) {
  // Each page lives at dir/slug.html and usually also dir/slug/index.html (pretty URL copy).
  const slugs = new Map();
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const full = path.join(dir, name);
    if (name.endsWith('.html') && name !== 'index.html') {
      const slug = name.slice(0, -5);
      if (!slugs.has(slug)) slugs.set(slug, []);
      slugs.get(slug).push(full);
    } else if (fs.statSync(path.join(ROOT, full)).isDirectory() && exists(path.join(full, 'index.html'))) {
      if (!slugs.has(name)) slugs.set(name, []);
      slugs.get(name).push(path.join(full, 'index.html'));
    }
  }
  return slugs;
}

const items = [];
for (const [slug, files] of pageFiles('shop')) {
  const main = files.find((f) => f.endsWith(`${slug}.html`)) || files[0];
  const html = read(main);
  const title = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/);
  const price = pick(html, /<title>[^<]*?·\s*(£[\d.,]+)/);
  const lede = pick(html, /<p class="lede">([\s\S]*?)<\/p>/) || pick(html, /<meta name="description" content="([^"]*)"/);
  const bullets = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1])).filter((b) => b.length > 8 && b.length < 110).slice(0, 4);
  const description = pick(html, /<meta name="description" content="([^"]*)"/) || lede;
  const priceNum = parseFloat(price.replace(/[£,]/g, '')) || 0;
  if (!title) continue;
  items.push({ kind: 'shop', slug, files, title, price, priceNum, lede, bullets, description,
    url: `${SITE}/shop/${slug}`, date: addedDate(main), pin: priceNum > 0 && priceNum <= PIN_MAX_PRICE });
}
for (const [slug, files] of pageFiles('daily')) {
  const main = files.find((f) => f.endsWith(`${slug}.html`)) || files[0];
  const html = read(main);
  const title = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!title) continue;
  const kicker = pick(html, /<p class="kicker">([\s\S]*?)<\/p>/).replace(/^TCH Daily\s*·\s*/, '');
  const description = pick(html, /<meta name="description" content="([^"]*)"/);
  const metaDate = pick(html, /<p class="article-meta">([^<·]*)/);
  const parsed = metaDate ? new Date(`${metaDate} 09:00:00 GMT`) : null;
  const bullets = [...html.matchAll(/<li><strong>([\s\S]*?)<\/strong>/g)].map((m) => decode(m[1]).replace(/[.:]$/, '')).filter((b) => b.length > 4 && b.length < 80).slice(0, 4);
  items.push({ kind: 'daily', slug, files, title, kicker, description, lede: description, bullets,
    url: `${SITE}/daily/${slug}`, date: parsed && !isNaN(parsed) ? parsed : addedDate(main), pin: true });
}

// ---------- pictures ----------
const CSS = `
*{box-sizing:border-box;margin:0}
body{font-family:Inter,Arial,sans-serif;color:#1F2937;background:#F7F7F8}
.card{display:flex;flex-direction:column;overflow:hidden}
.top{background:#0D1323;color:#fff;border-bottom:10px solid #FBBF24;display:flex;align-items:center;justify-content:space-between}
.logo{font-weight:800;letter-spacing:-.04em;line-height:.9}
.logo b{display:block;position:relative}
.logo b:after{content:"";position:absolute;left:.18em;right:.18em;top:52%;height:.12em;background:#2563EB}
.logo span{display:block;font-weight:600;letter-spacing:.02em}
.chip{background:#FBBF24;color:#0D1323;font-weight:800;border-radius:999px}
.kick{color:#2563EB;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
h1{font-weight:800;letter-spacing:-.025em;line-height:1.05;color:#0D1323}
p{color:#374151;line-height:1.35}
ul{list-style:none;padding:0}
li{position:relative;line-height:1.3;color:#1F2937}
li:before{content:"";position:absolute;left:0;border-radius:4px;background:#2563EB}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;color:#0D1323;font-weight:700}
.btn{background:#2563EB;color:#fff;border-radius:14px;font-weight:700}
`;

// Services (over PIN_MAX_PRICE) are done-for-you work, not downloads.
const isService = (it) => it.kind === 'shop' && it.priceNum > PIN_MAX_PRICE;
const productKicker = (it) => (isService(it) ? 'Done-for-you service · UK' : 'Printable PDF · UK');
const productButton = (it) => (isService(it) ? 'Book now' : 'Instant PDF');

function fit(text, max) { return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text; }

function pinHtml(it) {
  const big = it.kind === 'shop';
  const kicker = big ? productKicker(it) : `TCH Daily · ${it.kicker || 'How-to'}`;
  const sub = fit(big ? it.lede : it.description, 170);
  const list = it.bullets || [];
  return `<style>${CSS}
.card{width:1000px;height:1500px}
.top{padding:46px 64px}.logo b{font-size:64px}.logo span{font-size:30px}.chip{font-size:52px;padding:14px 34px}
.body{padding:80px 64px 0;display:flex;flex-direction:column;gap:34px;flex:1}.foot{margin-top:auto}
.kick{font-size:30px}h1{font-size:${it.title.length > 48 ? 78 : 92}px}p{font-size:36px}
ul{display:flex;flex-direction:column;gap:34px;margin-top:10px}li{font-size:40px;padding-left:54px}li:before{top:14px;width:26px;height:26px}
.foot{padding:0 0 64px;font-size:34px}.btn{font-size:36px;padding:24px 36px}
</style><div class="card"><div class="top"><div class="logo"><b>TCH</b><span>Works</span></div>${big && it.price ? `<div class="chip">${esc(it.price)}</div>` : ''}</div>
<div class="body"><div class="kick">${esc(kicker)}</div><h1>${esc(fit(it.title, 90))}</h1>${big && list.length >= 2 ? '' : `<p>${esc(sub)}</p>`}${!big && list.length ? '<div class="kick" style="margin-top:16px;color:#6B7280">Inside</div>' : ''}
${list.length ? `<ul>${list.map((b) => `<li>${esc(fit(b, 90))}</li>`).join('')}</ul>` : ''}
<div class="foot"><span>tchworks.co.uk</span><span class="btn">${big ? productButton(it) : 'Read free'}</span></div></div></div>`;
}

function shareHtml(it) {
  const big = it.kind === 'shop';
  return `<style>${CSS}
.card{width:1200px;height:630px;flex-direction:row}
.top{width:300px;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:48px 40px;border-bottom:0;border-right:10px solid #FBBF24}
.logo b{font-size:64px}.logo span{font-size:30px}.chip{font-size:46px;padding:12px 28px}
.body{flex:1;padding:56px 60px;display:flex;flex-direction:column;gap:22px}
.kick{font-size:24px}h1{font-size:${it.title.length > 48 ? 54 : 64}px}p{font-size:28px}
.foot{font-size:26px}.btn{font-size:28px;padding:16px 26px}
</style><div class="card"><div class="top"><div class="logo"><b>TCH</b><span>Works</span></div>${big && it.price ? `<div class="chip">${esc(it.price)}</div>` : ''}</div>
<div class="body"><div class="kick">${esc(big ? productKicker(it) : `TCH Daily · ${it.kicker || 'How-to'}`)}</div><h1>${esc(fit(it.title, 80))}</h1>
<p>${esc(fit(big ? it.lede : it.description, 130))}</p><div class="foot"><span>tchworks.co.uk</span><span class="btn">${big ? productButton(it) : 'Read free'}</span></div></div></div>`;
}

fs.mkdirSync(path.join(ROOT, 'img/pins'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'img/share'), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
async function shoot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
  await page.screenshot({ path: path.join(ROOT, out), type: 'jpeg', quality: 72, clip: { x: 0, y: 0, width: w, height: h } });
}
for (const it of items) {
  it.pinImg = `img/pins/${it.kind}-${it.slug}.jpg`;
  it.shareImg = `img/share/${it.kind}-${it.slug}.jpg`;
  await shoot(pinHtml(it), 1000, 1500, it.pinImg);
  await shoot(shareHtml(it), 1200, 630, it.shareImg);
}
await browser.close();

// ---------- share tags on each page ----------
for (const it of items) {
  const block = [
    '<!-- share:start -->',
    ` <meta property="og:type" content="${it.kind === 'shop' ? 'product' : 'article'}">`,
    ' <meta property="og:site_name" content="TCH Works">',
    ` <meta property="og:title" content="${esc(it.kind === 'shop' && it.price ? `${it.title} · ${it.price}` : it.title)}">`,
    ` <meta property="og:description" content="${esc(it.description)}">`,
    ` <meta property="og:url" content="${it.url}">`,
    ` <meta property="og:image" content="${SITE}/${it.shareImg}">`,
    ' <meta property="og:image:width" content="1200">',
    ' <meta property="og:image:height" content="630">',
    ' <meta name="twitter:card" content="summary_large_image">',
    ' <!-- share:end -->',
  ].join('\n');
  for (const f of it.files) {
    let html = read(f);
    if (html.includes('<!-- share:start -->')) {
      html = html.replace(/<!-- share:start -->[\s\S]*?<!-- share:end -->/, block);
    } else if (/<link rel="canonical"[^>]*>/.test(html)) {
      html = html.replace(/(<link rel="canonical"[^>]*>)/, `$1\n ${block}`);
    } else {
      html = html.replace(/<\/head>/, ` ${block}\n</head>`);
    }
    fs.writeFileSync(path.join(ROOT, f), html);
  }
}

// ---------- Pinterest feed ----------
const pinned = items.filter((i) => i.pin).sort((a, b) => b.date - a.date);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>TCH Works</title>
<link>${SITE}/</link>
<description>Printable UK planners, trackers and free how-tos from TCH Works.</description>
<language>en-gb</language>
${pinned.map((it) => {
  const img = `${SITE}/${it.pinImg}`;
  const size = fs.statSync(path.join(ROOT, it.pinImg)).size;
  const desc = it.kind === 'shop' ? `${it.description} ${it.price} printable PDF.` : `${it.description} Free to read.`;
  return `<item>
<title>${esc(it.kind === 'shop' && it.price ? `${it.title} · ${it.price}` : it.title)}</title>
<link>${it.url}?utm_source=pinterest&amp;utm_medium=social</link>
<guid isPermaLink="false">tch-${it.kind}-${it.slug}</guid>
<pubDate>${it.date.toUTCString()}</pubDate>
<description>${esc(desc)}</description>
<enclosure url="${img}" length="${size}" type="image/jpeg"/>
<media:content url="${img}" medium="image" type="image/jpeg" width="1000" height="1500"/>
</item>`;
}).join('\n')}
</channel>
</rss>
`;
fs.writeFileSync(path.join(ROOT, 'pins.xml'), rss);

// ---------- download pages ----------
const shopBySlug = new Map(items.filter((i) => i.kind === 'shop').map((i) => [i.slug, i]));
const FILE_ALIASES = {
  'tch-uk-freelancer-invoice-proposals-pack': 'freelancer-ai-invoice',
  'tch-uk-ltd-ai-admin-prompt-pack': 'ltd-ai-admin',
  'tch-monthly-wall-calendar-pack': 'monthly-wall-calendar',
  'tch-free-sunday-reset': null,
  'tch-free-this-weeks-meal-grid': null,
};
const FREE_NAMES = { 'tch-free-sunday-reset': 'Sunday Reset (free)', 'tch-free-this-weeks-meal-grid': 'This Week’s Meal Grid (free)' };
const human = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const deliveries = [];
for (const token of fs.readdirSync(path.join(ROOT, 'f'))) {
  const dir = path.join('f', token);
  if (!fs.statSync(path.join(ROOT, dir)).isDirectory()) continue;
  const files = fs.readdirSync(path.join(ROOT, dir)).filter((n) => n !== 'index.html').sort((a, b) => (a.endsWith('.ics') - b.endsWith('.ics')));
  let product = null; let name = null;
  for (const f of files) {
    const base = f.replace(/\.[^.]+$/, '');
    if (base in FILE_ALIASES) { product = FILE_ALIASES[base] && shopBySlug.get(FILE_ALIASES[base]); name = FREE_NAMES[base] || product?.title; if (name) break; }
    const s = base.replace(/^tch-/, '');
    if (shopBySlug.has(s)) { product = shopBySlug.get(s); name = product.title; break; }
  }
  name = name || 'Your TCH Works files';
  const free = files.some((f) => f.startsWith('tch-free-'));
  const label = (f) => f.endsWith('.ics') ? `${f} (calendar reminders)` : f.endsWith('.zip') ? `${f} (all files, zipped)` : f;
  const page = `<!DOCTYPE html>
<html lang="en-GB">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <meta name="robots" content="noindex, nofollow">
 <title>Your download · ${esc(name)} | TCH Works</title>
 <link rel="stylesheet" href="/css/site.css">
 <style>.dl{list-style:none;padding:0;display:grid;gap:.75rem}.dl a{display:flex;justify-content:space-between;gap:1rem;padding:1rem 1.1rem;border:1px solid var(--line);border-radius:12px;background:#fff;font-weight:600;word-break:break-word}.dl small{color:var(--muted);font-weight:400;white-space:nowrap}</style>
</head>
<body>
<header class="site-header"><div class="wrap nav"><a class="brand" href="/" aria-label="TCH Works home"><span class="logo-stack"><span class="logo-tch">TCH<span class="bar" aria-hidden="true"></span></span><span class="logo-works">Works</span></span></a></div></header>
<main class="section"><div class="wrap prose">
 <p class="kicker">${free ? 'Free download' : 'Thank you'}</p>
 <h1>${esc(name)}</h1>
 <p class="lede">Your file is ready. Tap to download, then print on A4 or fill it in on screen.</p>
 <ul class="dl">
${files.map((f) => `  <li><a href="./${encodeURIComponent(f)}" download>${esc(label(f))}<small>${human(fs.statSync(path.join(ROOT, dir, f)).size)}</small></a></li>`).join('\n')}
 </ul>
${free
    ? ' <p>Bookmark this page if you want the file again later.</p>\n <p>Problem with the file? Email hello@tch.works and we will put it right.</p>'
    : ' <p>Bookmark this page if you want the file again later. Stripe also emails your receipt.</p>\n <p>Problem with the file? Reply to the Stripe receipt and we will put it right.</p>'}
 <p><a href="/">Back to the shop</a></p>
</div></main>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, dir, 'index.html'), page);
  deliveries.push({ token, name, slug: product?.slug || null });
}
// The token list is not written into the site: set DELIVERIES_OUT to save it somewhere private.
if (process.env.DELIVERIES_OUT) fs.writeFileSync(process.env.DELIVERIES_OUT, JSON.stringify(deliveries, null, 1) + '\n');

console.log(`pictures: ${items.length} pages (${items.filter((i) => i.kind === 'shop').length} shop, ${items.filter((i) => i.kind === 'daily').length} daily)`);
console.log(`pins.xml: ${pinned.length} pins`);
console.log(`download pages: ${deliveries.length} (${deliveries.filter((d) => !d.slug).length} not tied to a shop page)`);
