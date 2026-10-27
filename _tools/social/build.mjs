// TCH Works: share pictures and the Pinterest auto-post feed.
// Run from the repo root:  node _tools/social/build.mjs
// Safe to re-run. It only rewrites what it made before.
//
// Makes:
//   img/pins/<kind>-<slug>.jpg   1000x1500 Pinterest picture per shop page and Daily page
//   img/share/<kind>-<slug>.jpg  1200x630 link-preview picture, only for pages without their own
//   pins.xml                     RSS feed Pinterest reads to post new pins by itself
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
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
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
  const jsonPrice = pick(html, /"price":\s*"?([\d.]+)/);
  const price = jsonPrice ? `£${jsonPrice}` : pick(html, /<p class="big-price">(£[\d.,]+)/) || pick(html, /<title>[^<]*?·\s*(£[\d.,]+)/);
  const lede = pick(html, /<p class="pitch">([\s\S]*?)<\/p>/) || pick(html, /<p class="lede">([\s\S]*?)<\/p>/) || pick(html, /<meta name="description" content="([^"]*)"/);
  const insideList = html.match(/<ul class="inside-list">([\s\S]*?)<\/ul>/);
  const bullets = [...(insideList ? insideList[1] : html).matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => decode(m[1])).filter((b) => b.length > 8 && b.length < 110).slice(0, 4);
  // The page's own product picture, when it has one (img/p/<slug>/card.webp)
  const ownTags = html.replace(/<!-- share:start -->[\s\S]*?<!-- share:end -->/, ''); // ignore the tags this script added
  const ownImage = pick(ownTags, /<meta property="og:image" content="https:\/\/www\.tchworks\.co\.uk\/([^"]+)"/);
  const photo = ownImage && exists(ownImage) ? ownImage : null;
  const description = pick(html, /<meta name="description" content="([^"]*)"/) || lede;
  const priceNum = parseFloat(price.replace(/[£,]/g, '')) || 0;
  if (!title || !priceNum) continue; // info pages (no price) are not products
  items.push({ kind: 'shop', slug, files, title, price, priceNum, lede, bullets, description, photo,
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
const productButton = (it) => (isService(it) ? 'Book now' : 'Shop now');

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
${it.photo ? `<img src="data:image/webp;base64,${fs.readFileSync(path.join(ROOT, it.photo)).toString('base64')}" style="display:block;width:1000px;height:750px;object-fit:cover">` : ''}
<div class="body"${it.photo ? ' style="padding-top:44px;gap:22px"' : ''}><div class="kick">${esc(kicker)}</div><h1${it.photo ? ' style="font-size:72px"' : ''}>${esc(fit(it.title, 90))}</h1>${big && list.length >= 2 ? '' : `<p>${esc(sub)}</p>`}${!big && list.length ? '<div class="kick" style="margin-top:16px;color:#6B7280">Inside</div>' : ''}
${list.length ? `<ul${it.photo ? ' style="gap:18px"' : ''}>${list.slice(0, it.photo ? 2 : 4).map((b) => `<li${it.photo ? ' style="font-size:34px"' : ''}>${esc(fit(b, it.photo ? 80 : 90))}</li>`).join('')}</ul>` : ''}
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
  if (!it.photo) await shoot(shareHtml(it), 1200, 630, it.shareImg);
  else if (exists(it.shareImg)) fs.unlinkSync(path.join(ROOT, it.shareImg));
}
await browser.close();
// Pictures this script made for pages that no longer exist are stale
const wanted = new Set(items.flatMap((it) => [it.pinImg, it.photo ? null : it.shareImg]).filter(Boolean));
for (const dir of ['img/pins', 'img/share']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (/^(shop|daily)-.*\.jpg$/.test(f) && !wanted.has(`${dir}/${f}`)) fs.unlinkSync(path.join(ROOT, dir, f));
  }
}

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
    const ownOg = /<meta property="og:image"/.test(html.replace(/<!-- share:start -->[\s\S]*?<!-- share:end -->/, ''));
    if (ownOg) {
      // the page already has its own share tags: keep those, drop ours
      html = html.replace(/\n? *<!-- share:start -->[\s\S]*?<!-- share:end -->/, '');
    } else if (html.includes('<!-- share:start -->')) {
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
  const desc = it.kind === 'shop' ? `${it.description}` : `${it.description} Free to read.`;
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

console.log(`pictures: ${items.length} pages (${items.filter((i) => i.kind === 'shop').length} shop, ${items.filter((i) => i.kind === 'daily').length} daily)`);
console.log(`pins.xml: ${pinned.length} pins`);
