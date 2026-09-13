import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function crossLinksHtml(label: string, items: { href: string; label: string }[], threshold = 6) {
  if (items.length === 0) return '';
  const visible = items.slice(0, threshold);
  const hidden = items.slice(threshold);
  const badge = (it: { href: string; label: string }) =>
    `<a class="cross-link-badge" href="${escapeAttr(it.href)}">${it.label}</a>`;
  const hiddenHtml = hidden.length
    ? `<details class="cross-links-more"><summary class="cross-link-badge cross-link-badge--more">+${hidden.length} autres</summary><div class="cross-links-list cross-links-list--expanded">${hidden.map(badge).join('')}</div></details>`
    : '';
  return `<div class="cross-links"><span class="cross-links-label">${label}</span><div class="cross-links-list">${visible.map(badge).join('')}${hiddenHtml}</div></div>`;
}

// Reprend la logique de _getRepresentants() de frise-engine.js : priorité aux
// figures_cles éditoriales, puis complément par la période de 40 ans la plus
// dense en naissances parmi les représentants restants du courant.
function getRepresentants(
  courantName: string,
  figuresCles: string[] | undefined,
  philosophesByCourant: { id: string; name: string; year: number }[],
  n: number,
) {
  if (!philosophesByCourant.length) return [];
  const top: { id: string; name: string; year: number }[] = [];
  const used = new Set<string>();

  (figuresCles || []).forEach((name) => {
    if (top.length >= n) return;
    const found = philosophesByCourant.find((p) => p.name === name && !used.has(p.name));
    if (found) {
      top.push(found);
      used.add(found.name);
    }
  });

  if (top.length < n) {
    const rest = philosophesByCourant.filter((p) => !used.has(p.name));
    if (rest.length) {
      const windowSize = 40;
      let best = { center: rest[0].year, count: 0 };
      rest.forEach((r) => {
        const lo = r.year - windowSize / 2;
        const hi = r.year + windowSize / 2;
        const count = rest.filter((q) => q.year >= lo && q.year <= hi).length;
        if (count > best.count) best = { center: r.year, count };
      });
      rest
        .map((r) => ({ r, dist: Math.abs(r.year - best.center) }))
        .sort((a, b) => a.dist - b.dist)
        .forEach(({ r }) => {
          if (top.length < n && !used.has(r.name)) {
            top.push(r);
            used.add(r.name);
          }
        });
    }
  }

  return top;
}

export async function getStaticPaths() {
  const courants = await getCollection('courants');
  const frises = new Set(courants.map((c) => c.data.frise_source));
  return Array.from(frises).map((frise) => ({ params: { frise } }));
}

export const GET: APIRoute = async ({ params }) => {
  const courants = await getCollection('courants');
  const philosophes = await getCollection('philosophes');

  const philosophesByCourantName = new Map<string, { id: string; name: string; year: number }[]>();
  for (const p of philosophes) {
    for (const courantName of p.data.courants || []) {
      if (!philosophesByCourantName.has(courantName)) philosophesByCourantName.set(courantName, []);
      philosophesByCourantName.get(courantName)!.push({ id: p.id, name: p.data.name, year: p.data.year });
    }
  }

  const items = courants
    .filter((c) => c.data.frise_source === params.frise)
    .slice()
    .sort((a, b) => a.data.year - b.data.year);

  const json = items.map((entry) => {
    const c = entry.data as typeof entry.data & { figures_cles?: string[] };
    const reps = getRepresentants(
      c.name,
      c.figures_cles,
      philosophesByCourantName.get(c.name) || [],
      4,
    );
    const repLinks = reps.map((r) => ({ href: `/philosophes/${r.id}/`, label: r.name }));

    return {
      year: c.year,
      end_year: c.end_year,
      display_date: c.display_date,
      name: c.name,
      text: c.text,
      yt_id: c.yt_id,
      media_credit: c.media_credit,
      image_media: c.image_media,
      branches: c.branches,
      description: c.description,
      crossLinksHtml: crossLinksHtml('Principaux représentants', repLinks, 4),
    };
  });

  return new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json' },
  });
};
