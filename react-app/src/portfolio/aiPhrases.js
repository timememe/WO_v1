// Client for the site's own /api/phrase-of-day (Cloudflare Pages Function),
// which proxies to the VPS Codex agent server-side — no token or prompt ever
// reaches the browser. See functions/api/phrase-of-day.js.

export async function fetchPhraseOfDay(lang = 'en', { signal } = {}) {
  const safeLang = lang === 'ru' ? 'ru' : 'en';
  const res = await fetch(`/api/phrase-of-day?lang=${safeLang}`, { signal });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.rateLimited = !!data.rateLimited;
    throw err;
  }

  const phrases = Array.isArray(data.phrases)
    ? data.phrases.filter((p) => typeof p === 'string' && p.trim())
    : [];
  if (!phrases.length) throw new Error('empty response');
  return phrases;
}
