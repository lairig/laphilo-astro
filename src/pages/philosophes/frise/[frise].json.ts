import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { philosopheFriseConfig } from '../../../data/frise-engine-config';
import { virtualPhilosopheFrises } from '../../../data/virtual-frises';

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

export async function getStaticPaths() {
  const philosophes = await getCollection('philosophes');
  const frises = new Set(philosophes.map((p) => p.data.frise_source));
  for (const key of Object.keys(virtualPhilosopheFrises)) frises.add(key);
  return Array.from(frises).map((frise) => ({ params: { frise } }));
}

export const GET: APIRoute = async ({ params }) => {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');
  const courantFriseByName = new Map(courants.map((c) => [c.data.name, c.data.frise_source]));

  const items = philosophes
    .filter((p) => {
      const virtual = virtualPhilosopheFrises[params.frise as string];
      return virtual ? virtual.match(p.data) : p.data.frise_source === params.frise;
    })
    .slice()
    .sort((a, b) => a.data.year - b.data.year);

  const json = items.map((entry) => {
    const p = entry.data;
    const courantLinks = (p.courants || [])
      .map((name) => {
        const frise = courantFriseByName.get(name);
        return frise
          ? { href: `/courants/frise/${frise}/?p=${encodeURIComponent(name)}`, label: name }
          : null;
      })
      .filter((x): x is { href: string; label: string } => x !== null);

    return {
      year: p.year,
      end_year: p.end_year,
      display_date: p.display_date,
      name: p.name,
      text: p.text,
      yt_id: p.yt_id,
      media_credit: p.media_credit,
      thumbnail: p.thumbnail,
      image_media: p.image_media,
      nationalite: p.nationalite,
      branches: p.branches,
      courants: p.courants,
      description: p.description,
      crossLinksHtml: crossLinksHtml('Courants de pensée', courantLinks, 6),
    };
  });

  return new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json' },
  });
};
