// Cloudflare Pages Function — GET /api/world-events
//
// Maintains a persistent, slowly-evolving layout of decorations (trees,
// bushes, rocks) inside the game's 12x12 walkable grid. Once per UTC day,
// the VPS Codex agent decides a small batch of add/remove actions; the
// result is merged into the last known state and persisted in the agent's
// own "wo-world-state" workspace (same storage mechanism sprite-generate.js
// uses for wo-sprites — a repo/file the agent reads and writes via its own
// HTTP API), so it survives redeploys/cache evictions with no extra secret
// beyond the AGENT_TOKEN already used everywhere else. Cached per UTC day
// via the Cache API (same pattern as phrase-of-day.js) so a normal page
// load never touches the agent at all.
//
// Same anti-injection posture as phrase-of-day.js / sprite-generate.js: the
// prompt is fully server-authored from grid geometry, no visitor input ever
// reaches the agent, and the agent's action list is validated against the
// actual free/occupied cells before anything is applied.
//
// Unlike the read (GET /repos/:repo/file, also used by sprite-generate.js),
// there's no confirmed direct "write a file" endpoint on the agent — so the
// commit step goes through /task with an explicit write-then-verify
// instruction, mirroring the round-trip verification sprite-generate.js
// already does for its generated PNGs. If the agent server does expose a
// more direct write endpoint, swap commitState() to call it instead.

const STATE_REPO = 'wo-world-state';
const STATE_FILE = 'state.json';
const EMPTY_STATE = { version: 0, lastUpdated: '2000-01-01', objects: {}, todaysActions: [] };

const GRID_SIZE = 12;
// Must match IsometricScene.js's buildingLocations (same convention as
// sprite-generate.js's CATEGORIES needing to match AssetManager.js's atlas
// parsers — kept in sync by hand, not imported, since Functions build
// separately from the React app).
const BUILDINGS = [
  { x: 6, y: 2, size: 2 }, // home
  { x: 2, y: 7, size: 2 }, // projects
  { x: 6, y: 6, size: 2 }, // cases
  { x: 1, y: 2, size: 2 }, // cafe
];
const BUILDING_CELLS = new Set();
for (const b of BUILDINGS) {
  for (let dx = 0; dx < b.size; dx++) {
    for (let dy = 0; dy < b.size; dy++) {
      BUILDING_CELLS.add(`${b.x + dx},${b.y + dy}`);
    }
  }
}

const VALID_TYPES = new Set(['tree', 'bush', 'rock']);
const MAX_ACTIONS_PER_DAY = 4;

const SCHEMA = {
  type: 'object',
  properties: {
    actions: {
      type: 'array',
      maxItems: MAX_ACTIONS_PER_DAY,
      items: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'remove'] },
          x: { type: 'number' },
          y: { type: 'number' },
          objectType: { type: 'string', enum: ['tree', 'bush', 'rock'] },
        },
        required: ['action', 'x', 'y'],
        additionalProperties: false,
      },
    },
  },
  required: ['actions'],
  additionalProperties: false,
};

export async function onRequestGet(context) {
  const { request, env } = context;
  const cache = caches.default;
  const cacheKey = dayCacheKey(request.url);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  if (!env.AGENT_TOKEN) {
    return json({ error: 'AGENT_TOKEN is not configured' }, 500);
  }

  const agentUrl = (env.AGENT_URL || 'https://agent.worldorder.online').replace(/\/+$/, '');
  const today = new Date().toISOString().slice(0, 10);

  let state;
  try {
    state = await fetchState(agentUrl, env.AGENT_TOKEN);
  } catch (err) {
    return json({ error: `failed to read state: ${String(err)}` }, 502);
  }

  // Already up to date (another colo/visitor generated today's batch already).
  if (state.lastUpdated === today) {
    return cacheAndReturn(context, cache, cacheKey, state);
  }

  const occupied = Object.entries(state.objects || {}).map(([key, type]) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, type };
  });
  const freeCells = computeFreeCells(occupied);

  const controller = new AbortController();
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
        prompt: buildPrompt(freeCells, occupied),
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

  const actions = parseActions(data, freeCells, occupied);

  const newObjects = { ...state.objects };
  for (const a of actions) {
    const key = `${a.x},${a.y}`;
    if (a.action === 'add') newObjects[key] = a.objectType;
    else if (a.action === 'remove') delete newObjects[key];
  }

  const newState = {
    version: (state.version || 0) + 1,
    lastUpdated: today,
    objects: newObjects,
    // Kept alongside the settled `objects` map so every visitor loading the
    // site today (not just whoever triggered the generation) can replay the
    // character walking out and placing today's items, instead of only the
    // one request that happened to compute them.
    todaysActions: actions,
  };

  try {
    await commitState(agentUrl, env.AGENT_TOKEN, newState);
  } catch (err) {
    // Couldn't persist (agent write hiccup, rate limit, etc). Return today's
    // computed layout to this visitor but don't cache it — the next request
    // will just retry the read-generate-write cycle from scratch.
    return json(newState, 200);
  }

  return cacheAndReturn(context, cache, cacheKey, newState);
}

function cacheAndReturn(context, cache, cacheKey, state) {
  const response = json(state, 200, { 'cache-control': 'public, max-age=86400' });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function computeFreeCells(occupied) {
  const occupiedSet = new Set(occupied.map((o) => `${o.x},${o.y}`));
  const free = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const key = `${x},${y}`;
      if (BUILDING_CELLS.has(key) || occupiedSet.has(key)) continue;
      free.push({ x, y });
    }
  }
  return free;
}

function buildPrompt(freeCells, occupied) {
  const freeList = freeCells.map((c) => `(${c.x},${c.y})`).join(' ');
  const occupiedList = occupied.length
    ? occupied.map((c) => `(${c.x},${c.y})=${c.type}`).join(' ')
    : '(none yet — this is the very first day)';

  return [
    'You maintain the persistent world layout for a tiny isometric pixel-art game (a personal portfolio site, Sega-Genesis-styled). The playable area is a 12x12 grid, coordinates 0-11 on each axis. Four building cells are fixed and permanently off-limits. The rest of the grid slowly accumulates decorations (trees, bushes, rocks) over time — you decide today\'s small evolution of that layout.',
    '',
    `Cells currently decorated (free to remove, or leave alone): ${occupiedList}`,
    '',
    `Free cells available for new decorations (pick only from these when adding): ${freeList}`,
    '',
    `Decide 0 to ${MAX_ACTIONS_PER_DAY} actions for today. This runs once a day, forever — prefer small, tasteful, incremental changes so the world feels like it is believably evolving, not being redecorated from scratch. Doing nothing on a given day is a perfectly good choice.`,
    '',
    'Respond ONLY with JSON matching the given schema. No commentary, no markdown fences.',
  ].join('\n');
}

function parseActions(data, freeCells, occupied) {
  const raw = typeof data?.result === 'string' ? data.result : '';
  const parsed = tryParseJson(raw);
  const list = Array.isArray(parsed?.actions) ? parsed.actions : [];

  const freeSet = new Set(freeCells.map((c) => `${c.x},${c.y}`));
  const occupiedSet = new Set(occupied.map((c) => `${c.x},${c.y}`));
  const used = new Set();
  const result = [];

  for (const a of list.slice(0, MAX_ACTIONS_PER_DAY)) {
    if (!a || typeof a.x !== 'number' || typeof a.y !== 'number') continue;
    const key = `${a.x},${a.y}`;
    if (used.has(key)) continue;

    if (a.action === 'add' && freeSet.has(key) && VALID_TYPES.has(a.objectType)) {
      result.push({ action: 'add', x: a.x, y: a.y, objectType: a.objectType });
      used.add(key);
    } else if (a.action === 'remove' && occupiedSet.has(key)) {
      result.push({ action: 'remove', x: a.x, y: a.y });
      used.add(key);
    }
  }

  return result;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Reads state.json from the agent's own wo-world-state workspace — same
// GET /repos/:repo/file endpoint sprite-generate.js uses to fetch assembled
// PNG chunks, just returned as plain text here instead of base64.
async function fetchState(agentUrl, agentToken) {
  const res = await fetch(`${agentUrl}/repos/${STATE_REPO}/file?path=${STATE_FILE}`, {
    headers: { authorization: `Bearer ${agentToken}` },
  });
  // No confirmed "not found" contract from this endpoint — treat any
  // non-OK read as "nothing persisted yet" so day 1 can bootstrap itself
  // instead of hard-failing. commitState() below creates the workspace.
  if (!res.ok) return { ...EMPTY_STATE };

  const body = await res.json().catch(() => null);
  if (!body || body.binary || typeof body.content !== 'string') return { ...EMPTY_STATE };

  try {
    return JSON.parse(body.content);
  } catch {
    return { ...EMPTY_STATE };
  }
}

// No confirmed direct "write file" endpoint on the agent, so this routes
// through /task: explicit write-then-read-back-and-verify instructions,
// same rigor as the round-trip verification sprite-generate.js's prompt
// already requires for its generated PNGs.
async function commitState(agentUrl, agentToken, newState) {
  const schema = {
    type: 'object',
    properties: { ok: { type: 'boolean' } },
    required: ['ok'],
    additionalProperties: false,
  };
  const content = JSON.stringify(newState);
  const prompt = [
    `Ensure a git repo exists at /workspace/${STATE_REPO} (mkdir -p and git init if it does not exist yet).`,
    `Write EXACTLY the following content to the file "${STATE_FILE}" in that directory — byte for byte, no reformatting, no commentary added, no trailing newline:`,
    '',
    content,
    '',
    'Then read the file back and confirm it matches the content above exactly. If it does not match, fix it and re-verify before responding.',
    '',
    'Respond ONLY with JSON matching the schema: {"ok": true} once verified to match, or {"ok": false} if you could not get it to match.',
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let data;
  try {
    const res = await fetch(`${agentUrl}/task`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${agentToken}`,
      },
      body: JSON.stringify({ prompt, outputSchema: schema }),
      signal: controller.signal,
    });
    data = await res.json().catch(() => ({}));
    if (!res.ok || data.rateLimited) {
      throw new Error(data.error || `agent write HTTP ${res.status}`);
    }
  } finally {
    clearTimeout(timer);
  }

  const parsed = tryParseJson(typeof data?.result === 'string' ? data.result : '');
  if (!parsed?.ok) throw new Error('agent could not verify the write');
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

// Cache key = a synthetic URL carrying only the UTC calendar day, so the
// result is shared across every visitor for the day instead of per-request
// (same trick as phrase-of-day.js's dayCacheKey).
function dayCacheKey(requestUrl) {
  const day = new Date().toISOString().slice(0, 10);
  const key = new URL(requestUrl);
  key.pathname = '/__cache/world-events';
  key.search = `?day=${day}`;
  return new Request(key.toString());
}
