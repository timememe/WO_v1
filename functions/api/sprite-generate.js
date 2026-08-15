// Cloudflare Pages Function — POST /api/sprite-generate
// Body: { category: 'homes'|'grass'|'trees'|'rocks'|'character', theme?: 'default'|'winter' }
//
// Debug/owner-only tool (gated client-side by the same ?debug flag as the
// CRT controls in Sup.jsx). Regenerates one game spritesheet via the VPS
// agent's built-in image_gen tool and returns the raw PNG bytes directly in
// the response, for an in-memory live preview (see IsometricScene's
// applyNew*Texture methods). Nothing is written to the repo/catalog here —
// that's a separate, deliberate step once a generation looks good.
//
// `category` and `theme` are validated against closed enums; the actual
// generation brief is fully server-authored from them (same anti-injection
// posture as phrase-of-day.js — no free text from the client ever reaches
// the agent).
//
// Transport: goes DIRECT to the agent VM's IP (nip.io hostname trick + the
// global_fetch_strictly_public compatibility flag in wrangler.toml) instead
// of the agent.worldorder.online Cloudflare Tunnel hostname used elsewhere.
// The tunnel hard-caps requests at ~100s (confirmed empirically); a full
// spritesheet generation routinely takes 5-8 minutes. Direct-IP is the same
// fix already proven by the sibling "dealmap" project for this exact problem
// (see AGENT_TOOLS/dealmap/memory/agent-integration.md).

const REPO = 'wo-sprites';

export const THEMES = {
  default: "Cohesive palette with cool/cyan accents (the game's UI accent color is #4de3ff) mixed with warm natural/architectural tones.",
  winter: "WINTER reskin: everything blanketed in snow, cold desaturated palette (whites, pale blues, frosty grays) with icy cyan accents (the game's UI accent color is #4de3ff) glowing warm through windows/crystals/lanterns for contrast. Add icicles, frost, snow drifts, bare or snow-laden branches where it makes sense for the subject.",
};

// Each category's exact pixel-grid contract — MUST match AssetManager.js's
// atlas parsers (parseGrassAtlas/parseBuildingsAtlas/parseTreesAtlas/
// parseRocksAtlas/parseCharacterAtlas). Changing layout here without also
// changing the parser (or vice versa) silently breaks the tile system.
export const CATEGORIES = {
  homes: {
    width: 1024, height: 1024, cell: 512,
    transparent: true,
    cells: [
      { label: 'home (small cozy house)', x: 0, y: 0 },
      { label: 'cafe (small coffee-shop building)', x: 512, y: 0 },
      { label: 'cases (grand archive/gallery building)', x: 0, y: 512 },
      { label: 'projects (workshop/lab building)', x: 512, y: 512 },
    ],
    subject: 'a small standalone isometric building sprite (city-builder/sim tile perspective)',
  },
  grass: {
    width: 1536, height: 1536, cell: 512,
    transparent: false,
    cells: threeByThree(),
    subject: 'a seamless top-down ground/floor tile texture (grass/terrain), filling the entire 512x512 cell edge to edge, no transparency, designed to tile seamlessly when repeated next to itself',
    skipBackgroundRemoval: true,
    reducedGenerationCount: 3, // generate 3 distinct tiles, fill the other 6 cells with flipped/rotated copies for variety at lower cost
  },
  trees: {
    width: 1536, height: 1024, cell: 512,
    transparent: true,
    cells: [
      { label: 'bush variant A', x: 0, y: 0 },
      { label: 'bush variant B', x: 512, y: 0 },
      { label: 'bush variant C', x: 1024, y: 0 },
      { label: 'tree variant A', x: 0, y: 512 },
      { label: 'tree variant B', x: 512, y: 512 },
      { label: 'tree variant C', x: 1024, y: 512 },
    ],
    subject: 'a single standalone plant sprite (isometric game-asset perspective)',
  },
  rocks: {
    width: 1024, height: 1024, cell: 512,
    transparent: true,
    cells: [
      { label: 'rock/boulder variant A', x: 0, y: 0 },
      { label: 'rock/boulder variant B', x: 512, y: 0 },
      { label: 'rock/boulder variant C', x: 0, y: 512 },
      { label: 'rock/boulder variant D', x: 512, y: 512 },
    ],
    subject: 'a single standalone rock/boulder sprite (isometric game-asset perspective)',
  },
  character: {
    width: 2560, height: 512, cell: 512,
    transparent: true,
    cells: [
      { label: 'facing DOWN, toward the viewer', x: 0, y: 0 },
      { label: 'facing DOWN-RIGHT, three-quarter view', x: 512, y: 0 },
      { label: 'facing RIGHT, full profile', x: 1024, y: 0 },
      { label: 'facing UP-RIGHT, three-quarter back view', x: 1536, y: 0 },
      { label: 'facing UP, away from the viewer', x: 2048, y: 0 },
    ],
    subject: 'the SAME single small pixel-art game character, standing idle',
    identityCritical: true,
  },
};

function threeByThree() {
  const cells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({ label: `ground tile ${row * 3 + col + 1}`, x: col * 512, y: row * 512 });
    }
  }
  return cells;
}

const SCHEMA = {
  type: 'object',
  properties: {
    manifest: {
      type: 'object',
      properties: {
        parts: { type: 'array', items: { type: 'string' } },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['parts', 'width', 'height'],
      additionalProperties: false,
    },
    cellPreview: { type: 'array', items: { type: 'string' } },
  },
  required: ['manifest', 'cellPreview'],
  additionalProperties: false,
};

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const category = CATEGORIES[body?.category];
  if (!category) {
    return json({ error: `category must be one of: ${Object.keys(CATEGORIES).join(', ')}` }, 400);
  }
  const themeKey = THEMES[body?.theme] ? body.theme : 'default';

  if (!env.AGENT_TOKEN) {
    return json({ error: 'AGENT_TOKEN is not configured' }, 500);
  }

  const agentUrl = (env.AGENT_DIRECT_URL || 'http://136.114.121.29.nip.io:8080').replace(/\/+$/, '');
  const controller = new AbortController();
  // Measured live: 4-image homes generation took ~340s end to end. Bigger
  // categories (6 trees, or a reduced-count grass pass) run in the same
  // ballpark or a bit more; this leaves generous headroom.
  const timer = setTimeout(() => controller.abort(), 480000);

  const outputStem = `${body.category}-output.png`;
  const prompt = buildPrompt(body.category, category, themeKey, outputStem);

  let data;
  try {
    const upstream = await fetch(`${agentUrl}/task`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.AGENT_TOKEN}`,
      },
      body: JSON.stringify({ prompt, cwd: '/workspace/wo-sprites', outputSchema: SCHEMA }),
      signal: controller.signal,
    });
    data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || data.rateLimited) {
      return json(
        { error: data.error || `agent HTTP ${upstream.status}`, rateLimited: !!data.rateLimited },
        upstream.status || 502
      );
    }
    if (!data.ok) {
      return json({ error: data.error || data.stderr || 'agent task failed' }, 502);
    }
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return json({ error: aborted ? 'agent timed out' : `agent unreachable: ${String(err)}` }, 502);
  } finally {
    clearTimeout(timer);
  }

  const parsed = parseManifest(data);
  if (!parsed) {
    return json({ error: 'agent returned no usable manifest', resultPreview: truncate(data.result, 500) }, 502);
  }

  try {
    const pngBytes = await fetchAndAssemble(agentUrl, env.AGENT_TOKEN, parsed.manifest);
    return new Response(pngBytes, {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'x-sprite-cell-preview': encodeURIComponent(JSON.stringify(parsed.cellPreview || [])),
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return json({ error: `failed to assemble output: ${String(err)}` }, 502);
  }
}

export function buildPrompt(categoryName, spec, themeKey, outputStem) {
  const genCount = spec.reducedGenerationCount || spec.cells.length;
  const cellList = spec.cells.map((c) => `- offset (${c.x},${c.y}): ${c.label}`).join('\n');

  const lines = [
    `You are generating a replacement "${categoryName}" spritesheet for an isometric pixel-art web game (a personal portfolio site, Sega-Genesis-styled). Work inside /workspace/wo-sprites (already a git repo, sharp already installed in node_modules — do not reinstall).`,
    '',
    `GOAL: produce one final PNG, exactly ${spec.width}x${spec.height} pixels, ${spec.transparent ? 'RGBA (transparent background outside each subject)' : 'RGB or RGBA but fully OPAQUE, no transparency'}, laid out as a grid of ${spec.cell}x${spec.cell} cells at these EXACT pixel offsets:`,
    cellList,
    '',
    `STYLE: ${THEMES[themeKey]}${spec.identityCritical ? ' All cells must clearly depict the exact same individual character (same colors, outfit, proportions) — only the facing direction changes between cells.' : ' Keep every cell in the same consistent art style so the sheet reads as one matched set.'}`,
    '',
    'STEPS — do all of them in order, validate before moving on:',
    '',
    spec.identityCritical
      ? `1. Use your built-in image generation tool (imagegen / image_gen — no external APIs) to generate ONE reference image first: ${spec.cells[0].label}, on a plain flat background. Then generate the remaining ${spec.cells.length - 1} views by EDITING/REFERENCING that exact same generated image file (pass it as the reference/input image to the tool, do not start a fresh unrelated generation) so the character's identity stays consistent across all ${spec.cells.length} views. This is the most important constraint — prioritize identity consistency over any other detail.`
      : `1. Use your built-in image generation tool (the imagegen / image_gen capability — do not call any external API, no fal.ai/replicate/etc) ${genCount} separate times to produce ${genCount} distinct instances of "${spec.subject}"${spec.reducedGenerationCount ? `, then reuse/flip/rotate them (via sharp) to fill the remaining ${spec.cells.length - genCount} cells with visual variety at lower cost — this is fine here since these are meant to read as harmonious variations of the same terrain, not unique hero assets` : ''}, each on a plain flat white or transparent background, roughly square framing.`,
    '',
  ];

  if (!spec.skipBackgroundRemoval) {
    lines.push(
      `2. For EACH generated image that will end up in the final sheet, remove the plain background to transparency. Write one small reusable Node script bg_remove.js in /workspace/wo-sprites that takes input and output filenames as argv[2]/argv[3], using exactly this proven flood-fill-from-border algorithm (it is already validated on this exact kind of asset — adapt only the file I/O, do not change the core logic):`,
      '',
      'BEGIN CODE (bg_remove.js)',
      BG_REMOVE_CODE,
      'END CODE (bg_remove.js)',
      ''
    );
  } else {
    lines.push('2. (This category is opaque ground texture — skip background removal entirely. Do not add any transparency.)', '');
  }

  lines.push(
    `3. Resize/pad each tile to exactly ${spec.cell}x${spec.cell} using sharp with fit: "${spec.transparent ? 'contain' : 'cover'}"${spec.transparent ? ' and a transparent background (do not stretch aspect ratio)' : ' (fine to crop slightly for a seamless tile, do not stretch aspect ratio)'}.`,
    '',
    `4. Composite all ${spec.cells.length} tiles into one ${spec.width}x${spec.height} canvas using sharp's .composite() at the exact pixel offsets given above.`,
    '',
    `5. Verify with sharp(...).metadata() that the final PNG is exactly ${spec.width}x${spec.height}, ${spec.transparent ? '4 channels (RGBA)' : 'a valid opaque image'}. If it is not, fix it and re-verify — do not proceed to step 6 until this passes.`,
    '',
    `6. Bridge the final PNG out as base64: encode to base64, split into chunks of 350000 characters each, write each chunk to a file named ${outputStem}.b64.part-NNN (NNN = 001, 002, ... zero-padded to 3 digits) in /workspace/wo-sprites. Write a manifest file ${outputStem}.manifest.json containing exactly {"parts": [...chunk filenames in order...], "width": ${spec.width}, "height": ${spec.height}}. Verify round-trip: concatenate and base64-decode all the parts and confirm the bytes are byte-for-byte identical to the original PNG file before finishing.`,
    '',
    `7. Your FINAL message must be ONLY this JSON, nothing before or after it: {"manifest": <paste the exact contents of ${outputStem}.manifest.json here>, "cellPreview": [<one short sentence per cell, in the same left-to-right/top-to-bottom order as the offsets above, describing what you drew>]}`
  );

  return lines.join('\n');
}

const BG_REMOVE_CODE = [
  "const fs = require('fs');",
  "const sharp = require('sharp');",
  '',
  'async function removeBorderBackground(input, output) {',
  "  const source = sharp(input, { failOn: 'none' }).ensureAlpha();",
  '  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });',
  '  const { width, height, channels } = info;',
  '',
  '  const bins = new Map();',
  '  const addBorder = (pixel) => {',
  '    if (data[pixel + 3] === 0) return;',
  '    const key = `${data[pixel] >> 2},${data[pixel + 1] >> 2},${data[pixel + 2] >> 2}`;',
  '    const entry = bins.get(key) || { count: 0, r: 0, g: 0, b: 0 };',
  '    entry.count++;',
  '    entry.r += data[pixel]; entry.g += data[pixel + 1]; entry.b += data[pixel + 2];',
  '    bins.set(key, entry);',
  '  };',
  '  for (let x = 0; x < width; x++) {',
  '    addBorder(x * channels);',
  '    addBorder(((height - 1) * width + x) * channels);',
  '  }',
  '  for (let y = 1; y < height - 1; y++) {',
  '    addBorder((y * width) * channels);',
  '    addBorder((y * width + width - 1) * channels);',
  '  }',
  "  const dominant = [...bins.values()].sort((a, b) => b.count - a.count)[0];",
  "  if (!dominant) throw new Error('No opaque border pixels available to determine background');",
  '  const bg = [dominant.r / dominant.count, dominant.g / dominant.count, dominant.b / dominant.count];',
  '',
  '  const distance = (i) => {',
  '    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];',
  '    return Math.sqrt(dr * dr + dg * dg + db * db);',
  '  };',
  '',
  '  const transparentAt = 10;',
  '  const connectedThrough = 70;',
  '  const seen = new Uint8Array(width * height);',
  '  const queue = new Uint32Array(width * height);',
  '  let head = 0, tail = 0;',
  '  const enqueue = (p) => {',
  '    if (seen[p]) return;',
  '    const i = p * channels;',
  '    if (data[i + 3] === 0 || distance(i) <= connectedThrough) {',
  '      seen[p] = 1;',
  '      queue[tail++] = p;',
  '    }',
  '  };',
  '  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x); }',
  '  for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1); }',
  '  while (head < tail) {',
  '    const p = queue[head++];',
  '    const x = p % width, y = (p / width) | 0;',
  '    if (x) enqueue(p - 1);',
  '    if (x + 1 < width) enqueue(p + 1);',
  '    if (y) enqueue(p - width);',
  '    if (y + 1 < height) enqueue(p + width);',
  '  }',
  '',
  '  for (let p = 0; p < seen.length; p++) {',
  '    if (!seen[p]) continue;',
  '    const i = p * channels;',
  '    const originalAlpha = data[i + 3];',
  '    if (originalAlpha === 0) continue;',
  '    const d = distance(i);',
  '    let maskAlpha;',
  '    if (d <= transparentAt) maskAlpha = 0;',
  '    else {',
  '      const t = Math.min(1, (d - transparentAt) / (connectedThrough - transparentAt));',
  '      const smooth = t * t * (3 - 2 * t);',
  '      maskAlpha = Math.round(255 * smooth);',
  '    }',
  '    data[i + 3] = Math.min(originalAlpha, maskAlpha);',
  '  }',
  '',
  "  await sharp(data, { raw: { width, height, channels } }).png().toFile(output);",
  '  const meta = await sharp(output).metadata();',
  '  if (meta.width !== width || meta.height !== height || meta.channels !== 4) {',
  '    throw new Error(`Output validation failed: ${meta.width}x${meta.height}, ${meta.channels} channels`);',
  '  }',
  '}',
  '',
  'removeBorderBackground(process.argv[2], process.argv[3]).catch((e) => { console.error(e); process.exit(1); });',
].join('\n');

function parseManifest(data) {
  const raw = typeof data?.result === 'string' ? data.result : '';
  const tryParse = (text) => {
    try {
      const obj = JSON.parse(text);
      if (obj?.manifest?.parts?.length && obj.manifest.width && obj.manifest.height) return obj;
    } catch {
      return null;
    }
    return null;
  };
  const direct = tryParse(raw);
  if (direct) return direct;
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? tryParse(match[0]) : null;
}

async function fetchAndAssemble(agentUrl, token, manifest) {
  let b64 = '';
  for (const part of manifest.parts) {
    const url = `${agentUrl}/repos/${encodeURIComponent(REPO)}/file?path=${encodeURIComponent(part)}`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`chunk fetch failed (${part}): HTTP ${res.status}`);
    const body = await res.json();
    if (body.binary || typeof body.content !== 'string') {
      throw new Error(`chunk ${part} was not readable as text`);
    }
    b64 += body.content.trim();
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function truncate(s, n) {
  if (typeof s !== 'string') return s ?? null;
  return s.length > n ? s.slice(0, n) + `…[+${s.length - n} chars]` : s;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
