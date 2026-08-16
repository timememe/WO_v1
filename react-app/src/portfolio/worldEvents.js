// Client for the site's own /api/world-events (Cloudflare Pages Function),
// which returns the persistent grid of agent-placed decorations (trees,
// bushes, rocks) that accumulates day by day. See functions/api/world-events.js.

export async function fetchWorldEvents({ signal } = {}) {
  const res = await fetch('/api/world-events', { signal });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }

  return {
    objects: data.objects && typeof data.objects === 'object' ? data.objects : {},
    // Today's freshly-decided add/remove actions (may be empty) — used to
    // animate the character walking out and placing/removing just those,
    // while everything else from prior days is placed instantly.
    todaysActions: Array.isArray(data.todaysActions) ? data.todaysActions : [],
  };
}
