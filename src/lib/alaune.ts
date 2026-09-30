/* Bloc « À la une aujourd'hui » de la page d'accueil.
   Le même HTML est rendu au build dans index.astro (jour du build) et en
   fragments /data/alaune/<jour>.txt que home-alaune.js charge les autres
   jours : pas de saut de mise en page, pas de gros index à télécharger. */
import { getCollection } from 'astro:content';
import { themesVivants } from '../data/themes-vivants';

interface Entry {
  n: string;
  d: string;
  u: string;
  t: string;
  desc: string;
  dom: string;
  /** Philosophes vivants : libellés de leurs sujets de travail */
  th?: string[];
}

const VIVANTS = ['france-contemporains', 'contemporains-monde'];
const libelleTheme = new Map(themesVivants.map((t) => [t.code, t.label]));

/* Ordre de passage : mélange stable (tri par empreinte du nom), pour que deux
   jours de suite ne montrent pas deux voisins de l'ordre alphabétique. */
const empreinte = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
};
const melange = (a: Entry, b: Entry) => empreinte(a.n) - empreinte(b.n) || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0);

export async function getAlaunePools() {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');
  const avecFiche = philosophes.filter(({ data: p }) => p.thumbnail && p.description);
  const versEntry = ({ data: p }: (typeof philosophes)[number]): Entry => ({
    n: p.name,
    d: p.display_date,
    u: `/philosophes/frise/${p.frise_source}/`,
    t: p.thumbnail || '',
    desc: p.description || '',
    dom: '',
    th: (p.themes || []).map((c) => libelleTheme.get(c) || c),
  });
  /* « Philosophe à la une » : les penseurs du passé ; les vivants ont leur propre carte */
  const phi: Entry[] = avecFiche.filter(({ data: p }) => !VIVANTS.includes(p.frise_source)).map(versEntry).sort(melange);
  const viv: Entry[] = avecFiche.filter(({ data: p }) => VIVANTS.includes(p.frise_source)).map(versEntry).sort(melange);
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
    .sort(melange);
  return { phi, viv, cur };
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

/* Numéro absolu (jours depuis 1970) de la prochaine date portant ce jour de
   l'année, à partir de la veille du build. La rotation se poursuit ainsi d'une
   année sur l'autre et parcourt toutes les fiches, au lieu de rejouer chaque
   année les 366 mêmes. */
function epochDayFor(day: number) {
  /* Date lue ici et non au chargement du module : sur Cloudflare (workerd),
     l'horloge vaut 0 hors du traitement d'une requête. */
  const buildEpochDay = Math.floor(Date.now() / 86400000);
  for (let e = buildEpochDay - 1; e < buildEpochDay + 366; e++) {
    if (dayOfYear(new Date(e * 86400000)) === day) return e;
  }
  return buildEpochDay + day; // jour 366 hors année bissextile
}

const titleCase =(s: string) =>
  s.toLowerCase().replace(/(^|[^a-zàâäéèêëïîôöùûüç])([a-zàâäéèêëïîôöùûüç])/gi, (_m, sep, c) => sep + c.toUpperCase());

const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const friseUrl = (e: Entry) => attr(e.u + '?p=' + encodeURIComponent(e.n));

export function alauneHtml(pools: Awaited<ReturnType<typeof getAlaunePools>>, day: number) {
  const { phi, viv, cur } = pools;
  if (!phi.length || !cur.length || !viv.length) return '';
  const n = Math.max(0, epochDayFor(day));
  const entry = phi[n % phi.length];
  const entryViv = viv[n % viv.length];
  const entryCur = cur[n % cur.length];

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
    `<a class="alaune-card alaune-card--viv" href="${friseUrl(entryViv)}">` +
    '<span class="alaune-subeyebrow">Philosophe vivant à la une</span>' +
    '<div class="alaune-inner">' +
    `<img class="alaune-portrait" src="${attr(entryViv.t)}" alt="${attr(entryViv.n)}" width="72" height="72" loading="lazy">` +
    '<div class="alaune-text">' +
    `<span class="alaune-name">${titleCase(entryViv.n)}</span>` +
    `<span class="alaune-dates"><span class="alaune-live">● En activité</span> · ${entryViv.d}</span>` +
    (entryViv.th?.length ? `<span class="alaune-themes">${entryViv.th.map((t) => `<span class="alaune-theme">${attr(t)}</span>`).join('')}</span>` : '') +
    `<span class="alaune-desc">${entryViv.desc}</span>` +
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
