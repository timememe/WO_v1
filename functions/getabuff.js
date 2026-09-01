// Cloudflare Pages Function — GET /getabuff
//
// The page itself is a client-rendered React route, so link-preview crawlers
// (Telegram, Twitter/X, Discord, iMessage, Slack…) that don't run JS would
// otherwise see the bare WORLD ORDER shell. This function fetches that shell
// via context.next() and injects Open Graph / Twitter tags before returning
// it — per-buff when the share link carries ?b=<index> (&lang=ru|en), a
// generic getabuff card otherwise. Humans get the exact same SPA, just with
// a few extra <meta> tags and a 200 instead of the SPA-fallback 404.
//
// Per-buff preview images are pre-rendered 1200×630 JPEGs at
// /assets/getabuff/og/<NN>.jpg (see react-app/public/assets/getabuff/og/).

import { BUFFS, UI } from '../react-app/src/pages/getabuffData.js';

const LANGS = ['ru', 'en', 'es', 'fr', 'zh', 'hi', 'ar'];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function validIdx(v) {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n >= 0 && n < BUFFS.length ? n : null;
}

export async function onRequestGet(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  const langParam = url.searchParams.get('lang');
  const lang = LANGS.includes(langParam) ? langParam : 'ru';
  const idx = validIdx(url.searchParams.get('b'));
  const t = UI[lang];

  let title;
  let desc;
  let image;

  if (idx != null) {
    const d = BUFFS[idx][lang];
    const tier = t.tiers[BUFFS[idx].rarity];
    title = `${d.item} — getabuff`;
    desc = `${tier} · ${d.buff}. ${d.flavor}`;
    image = `${url.origin}/assets/getabuff/og/${String(idx).padStart(2, '0')}.jpg`;
  } else {
    title = 'getabuff';
    desc = (t && t.metaDesc) || UI.en.metaDesc;
    image = `${url.origin}/assets/getabuff/og/cover.jpg`;
  }

  const res = await next();
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;

  const html = await res.text();

  const meta = [
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="getabuff">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:url" content="${esc(url.href)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="description" content="${esc(desc)}">`,
  ].join('\n    ');

  const htmlAttr = lang === 'ar' ? 'lang="ar" dir="rtl"' : `lang="${lang}"`;
  const out = html
    .replace(/<html[^>]*>/, `<html ${htmlAttr}>`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('</head>', `    ${meta}\n  </head>`);

  return new Response(out, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
