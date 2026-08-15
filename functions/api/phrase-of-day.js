// Cloudflare Pages Function — GET /api/phrase-of-day?lang=en|ru
//
// Generates a small batch of "phrase of the day" one-liners — the character's
// take on today's actual tech/gaming news — via the VPS Codex agent
// (AGENT_TOOLS/VPSagent). The agent has real shell access, so the prompt has
// it curl a couple of public no-auth news APIs first, then write in-character
// reactions grounded in what it actually found. The token lives as a
// Cloudflare secret (AGENT_TOKEN) and never reaches the browser — see
// TAG_site/CODEX_API.md for the same pattern used elsewhere.
//
// Deliberately does NOT forward any visitor-supplied text to the agent: the
// prompt is fully server-authored, so this route has no prompt-injection
// surface. Result is cached per UTC day (+ lang) via the Cache API, so one
// real agent call (fetched once by CharacterAI on load, see CharacterAI.js
// loadAiPhrasePool()) serves the whole day regardless of visitor count.

const EXAMPLES = {
  en: [
    'Day ${day}... Wonder what it brings',
    'I locked myself in an infinite loop.',
    'Is there a cage inside a cage?',
    'Full of energy, running on all cylinders, I\'m a machine',
    'Motivation.exe has stopped working',
    'This is fine. everything is fine.',
    'I\'m a pixel man in a pixel world',
    'Could be worse, could be JavaScript... wait',
  ],
  ru: [
    'День ${day}... Интересно, что он принесёт',
    'Я запер сам себя в бесконечном цикле.',
    'Есть ли клетка внутри клетки?',
    'Бодр как никогда, энергия прёт, я машина',
    'motivation.exe перестал отвечать',
    'Всё нормально. Всё абсолютно нормально.',
    'Я пиксельный человек в пиксельном мире',
    'Могло быть хуже, мог бы писать на PHP... хотя',
  ],
};

const SCHEMA = {
  type: 'object',
  properties: {
    phrases: {
      type: 'array',
      items: { type: 'string' },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ['phrases'],
  // Codex's structured-output validation (OpenAI response_format) rejects the
  // schema outright without this — it's mandatory, not just stylistic.
  additionalProperties: false,
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lang = url.searchParams.get('lang') === 'ru' ? 'ru' : 'en';
  const force = url.searchParams.get('force') === '1';

  const cache = caches.default;
  const cacheKey = dayCacheKey(url, lang);

  if (!force) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  if (!env.AGENT_TOKEN) {
    return json({ error: 'AGENT_TOKEN is not configured' }, 500);
  }

  const agentUrl = (env.AGENT_URL || 'https://agent.worldorder.online').replace(/\/+$/, '');
  const controller = new AbortController();
  // Generous cap: this prompt makes the agent curl a couple of APIs before
  // writing, so it's slower than a plain text generation. Still well inside
  // the ~2min practical ceiling used by the sibling tag-site integration.
  const timer = setTimeout(() => controller.abort(), 110000);

  let data;
  try {
    const upstream = await fetch(`${agentUrl}/task`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.AGENT_TOKEN}`,
      },
      body: JSON.stringify({
        prompt: buildPrompt(lang),
        outputSchema: SCHEMA,
      }),
      signal: controller.signal,
    });
    data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || data.rateLimited) {
      return json(
        { error: data.error || `agent HTTP ${upstream.status}`, rateLimited: !!data.rateLimited },
        upstream.status || 502
      );
    }
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return json({ error: aborted ? 'agent timed out' : `agent unreachable: ${String(err)}` }, 502);
  } finally {
    clearTimeout(timer);
  }

  const phrases = parsePhrases(data);
  if (!phrases.length) {
    return json({ error: 'agent returned no usable phrases' }, 502);
  }

  const response = json(
    { phrases, lang, generatedAt: new Date().toISOString() },
    200,
    { 'cache-control': 'public, max-age=86400' }
  );

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function buildPrompt(lang) {
  const examples = EXAMPLES[lang] || EXAMPLES.en;
  const langName = lang === 'ru' ? 'Russian' : 'English';
  return [
    'You are writing idle one-liners for a tiny pixel-art AI character that lives in a Sega-Genesis-styled portfolio game. Voice: deadpan, self-aware, a little tired, programmer/gamer humor, never corporate.',
    '',
    'Step 1 — research (you have shell access, curl is available):',
    '- curl -s "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=15" for current tech news (Hacker News front page).',
    '- curl -s "https://store.steampowered.com/api/featuredcategories?cc=us&l=english" for current game releases/deals (Steam).',
    'Skim what actually loads and pick 4-6 concrete, specific items (real names, numbers, titles). If one source fails, just use the other — do not fail the task over it.',
    '',
    'Step 2 — write 5 short one-liners (under 16 words each) in the character\'s voice, each clearly reacting to a SPECIFIC real item from step 1 (name a game, a company, a number) — not a vague "tech moves fast" filler line. Mix tech and gaming topics across the 5.',
    '',
    'Voice reference only, not topics — existing lines, match the tone, do not repeat them:',
    ...examples.map((e) => `- ${e}`),
    '',
    `Respond ONLY with JSON matching the given schema, in ${langName}. No commentary, no markdown fences, just the JSON object.`,
  ].join('\n');
}

// Cache key = a synthetic URL carrying only {lang, UTC calendar day} so the
// batch is shared across every visitor for the day instead of per-request.
function dayCacheKey(requestUrl, lang) {
  const day = new Date().toISOString().slice(0, 10);
  const key = new URL(requestUrl);
  key.pathname = '/__cache/phrase-of-day';
  key.search = `?lang=${lang}&day=${day}`;
  return new Request(key.toString());
}

function parsePhrases(data) {
  const raw = typeof data?.result === 'string' ? data.result : '';
  const fromJson = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed?.phrases)) {
        return parsed.phrases.filter((p) => typeof p === 'string' && p.trim()).slice(0, 5);
      }
    } catch {
      return null;
    }
    return null;
  };

  const direct = fromJson(raw);
  if (direct?.length) return direct;

  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    const nested = fromJson(match[0]);
    if (nested?.length) return nested;
  }

  return raw.trim() ? [raw.trim()] : [];
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}
