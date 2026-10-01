/* Bloc « À la une » de la page d'accueil (un philosophe et un courant de pensée par jour).
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
  nat?: string;
  /** Philosophe vivant (« En activité ») */
  vivant?: boolean;
}

const VIVANTS = ['france-contemporains', 'contemporains-monde'];

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
    nat: p.nationalite,
    vivant: VIVANTS.includes(p.frise_source),
  });
  /* « Philosophe à la une » : penseurs du passé et vivants, dans une même rotation */
  const phi: Entry[] = avecFiche.map(versEntry).sort(melange);
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
  const { phi, cur } = pools;
  if (!phi.length || !cur.length) return '';
  const n = Math.max(0, epochDayFor(day));
  const entry = phi[n % phi.length];
  const entryCur = cur[n % cur.length];

  let domHue = 0;
  for (let i = 0; i < entryCur.dom.length; i++) domHue = (domHue * 31 + entryCur.dom.charCodeAt(i)) >>> 0;
  domHue = domHue % 360;

  return (
    /* « À la une » : cartouche parchemin, deux cartes (portrait ou branche,
       étiquette, nom, repères, description, bouton) */
    '<div class="alaune-group">' +
    '<span class="alaune-eyebrow">✦ À la une ✦</span>' +
    '<span class="une-sub">Un philosophe et un courant de pensée, chaque jour</span>' +
    '<div class="une-grid">' +
    `<a class="une-card une-card--phi" href="${friseUrl(entry)}">` +
    `<img class="une-portrait" src="${attr(entry.t)}" alt="${attr(entry.n)}" width="64" height="64" loading="lazy">` +
    '<span class="une-text">' +
    '<span class="une-label">Philosophe à la une</span>' +
    `<span class="une-name">${titleCase(entry.n)}</span>` +
    `<span class="une-meta">${entry.vivant ? '<span class="une-live">● En activité</span> · ' : ''}${[entry.nat, entry.d].filter(Boolean).map((x) => attr(x!)).join(' · ')}</span>` +
    `<span class="une-desc">${entry.desc}</span>` +
    '<span class="une-btn">Découvrir <span aria-hidden="true">↗</span></span>' +
    '</span>' +
    '</a>' +
    `<a class="une-card une-card--cur" href="${friseUrl(entryCur)}">` +
    (entryCur.dom ? `<span class="une-badge" style="--dom-hue:${domHue}">${entryCur.dom}</span>` : '<span class="une-badge une-badge--vide">◈</span>') +
    '<span class="une-text">' +
    '<span class="une-label">Courant de pensée à la une</span>' +
    `<span class="une-name">${entryCur.n}</span>` +
    `<span class="une-meta">${attr(entryCur.d)}</span>` +
    `<span class="une-desc">${entryCur.desc}</span>` +
    '<span class="une-btn">Découvrir <span aria-hidden="true">↗</span></span>' +
    '</span>' +
    '</a>' +
    '</div>' +
    '</div>'
  );
}
