/* Bloc « À la une aujourd'hui » de la page d'accueil.
   Le même HTML est rendu au build dans index.astro (jour du build) et en
   fragments /data/alaune/<jour>.txt que home-alaune.js charge les autres
   jours : pas de saut de mise en page, pas de gros index à télécharger. */
import { getCollection } from 'astro:content';

interface Entry {
  n: string;
  d: string;
  u: string;
  t: string;
  desc: string;
  dom: string;
}

const byName = (a: Entry, b: Entry) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0);

export async function getAlaunePools() {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');
  const phi: Entry[] = philosophes
    .map(({ data: p }) => ({
      n: p.name,
      d: p.display_date,
      u: `/philosophes/frise/${p.frise_source}/`,
      t: p.thumbnail || '',
      desc: p.description || '',
      dom: '',
    }))
    .filter((e) => e.t && e.desc)
    .sort(byName);
  const cur: Entry[] = courants
    .map(({ data: c }) => ({
      n: c.name,
      d: c.display_date,
      u: `/courants/frise/${c.frise_source}/`,
      t: '',
      desc: c.description || '',
      dom: (c.branches && c.branches[0]) || '',
    }))
    .filter((e) => e.desc)
    .sort(byName);
  return { phi, cur };
}

/** Jour de l'année (1 à 366), calculé comme dans home-alaune.js. */
export function dayOfYear(now: Date) {
  return (
    Math.floor(
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), 0, 1)) /
        86400000
    ) + 1
  );
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[^a-zàâäéèêëïîôöùûüç])([a-zàâäéèêëïîôöùûüç])/gi, (_m, sep, c) => sep + c.toUpperCase());

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const friseUrl = (e: Entry) => attr(e.u + '?p=' + encodeURIComponent(e.n));

export function alauneHtml(pools: Awaited<ReturnType<typeof getAlaunePools>>, day: number) {
  const { phi, cur } = pools;
  if (!phi.length || !cur.length) return '';
  const entry = phi[day % phi.length];
  const entryCur = cur[(day + 47) % cur.length];

  let domHue = 0;
  for (let i = 0; i < entryCur.dom.length; i++) domHue = (domHue * 31 + entryCur.dom.charCodeAt(i)) >>> 0;
  domHue = domHue % 360;

  return (
    '<div class="alaune-group">' +
    '<span class="alaune-eyebrow">✦ À la une aujourd\'hui ✦</span>' +
    '<div class="alaune-group-grid">' +
    `<a class="alaune-card alaune-card--phi" href="${friseUrl(entry)}">` +
    '<span class="alaune-subeyebrow">Philosophe à la une</span>' +
    '<div class="alaune-inner">' +
    `<img class="alaune-portrait" src="${attr(entry.t)}" alt="${attr(entry.n)}" width="72" height="72" loading="lazy">` +
    '<div class="alaune-text">' +
    `<span class="alaune-name">${titleCase(entry.n)}</span>` +
    `<span class="alaune-dates">${entry.d}</span>` +
    `<span class="alaune-desc">${entry.desc}</span>` +
    '</div>' +
    '<span class="alaune-btn">Découvrir <span class="alaune-btn-arrow">↗</span></span>' +
    '</div>' +
    '</a>' +
    `<a class="alaune-card alaune-card--cur" href="${friseUrl(entryCur)}">` +
    '<span class="alaune-subeyebrow">Courant de pensée à la une</span>' +
    '<div class="alaune-inner">' +
    (entryCur.dom ? `<span class="alaune-dom-badge" style="--dom-hue:${domHue}">${entryCur.dom}</span>` : '') +
    '<div class="alaune-text">' +
    `<span class="alaune-name">${entryCur.n}</span>` +
    `<span class="alaune-dates">${entryCur.d}</span>` +
    `<span class="alaune-desc">${entryCur.desc}</span>` +
    '</div>' +
    '<span class="alaune-btn">Découvrir <span class="alaune-btn-arrow">↗</span></span>' +
    '</div>' +
    '</a>' +
    '</div>' +
    '</div>'
  );
}
