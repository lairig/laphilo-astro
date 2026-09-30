/* Blocs « À la une aujourd'hui » et « Activité du jour » (un philosophe vivant) de la page d'accueil.
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
  /** Philosophes vivants : leurs sujets de travail [code, libellé] */
  th?: [string, string][];
  nat?: string;
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
    th: (p.themes || []).map((c): [string, string] => [c, libelleTheme.get(c) || c]),
    nat: p.nationalite,
  });
  /* « Philosophe à la une » : les penseurs du passé ; les vivants ont leur propre bloc, « Activité du jour » */
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
    /* « À la une » : même présentation que « Activité du jour » (cartes sombres,
       portrait, étiquette, nom, repères, description, bouton), en cuivre et or */
    '<div class="alaune-group">' +
    '<span class="alaune-eyebrow">✦ À la une ✦</span>' +
    '<span class="une-sub">Un philosophe et un courant de pensée, chaque jour</span>' +
    '<div class="une-grid">' +
    `<a class="une-card une-card--phi" href="${friseUrl(entry)}">` +
    `<img class="une-portrait" src="${attr(entry.t)}" alt="${attr(entry.n)}" width="64" height="64" loading="lazy">` +
    '<span class="une-text">' +
    '<span class="une-label">Philosophe à la une</span>' +
    `<span class="une-name">${titleCase(entry.n)}</span>` +
    `<span class="une-meta">${[entry.nat, entry.d].filter(Boolean).map((x) => attr(x!)).join(' · ')}</span>` +
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
    '</div>' +
    activiteHtml(entryViv)
  );
}

/* « Activité du jour » : un philosophe vivant, à part du bloc « À la une »,
   avec ses sujets de travail et un lien vers la frise de chacun */
function activiteHtml(e: Entry) {
  const sujets = e.th ?? [];
  return (
    '<div class="activite-jour">' +
    '<span class="activite-eyebrow">✦ Activité du jour ✦</span>' +
    '<span class="activite-sub">Un philosophe vivant, qui pense notre époque</span>' +
    `<a class="activite-card" href="${friseUrl(e)}">` +
    `<img class="activite-portrait" src="${attr(e.t)}" alt="${attr(e.n)}" width="64" height="64" loading="lazy">` +
    '<span class="activite-text">' +
    '<span class="activite-live">● En activité</span>' +
    `<span class="activite-name">${titleCase(e.n)}</span>` +
    `<span class="activite-meta">${[e.nat, e.d].filter(Boolean).map((x) => attr(x!)).join(' · ')}</span>` +
    `<span class="activite-desc">${e.desc}</span>` +
    '<span class="activite-btn">Découvrir sa pensée <span aria-hidden="true">↗</span></span>' +
    '</span>' +
    '</a>' +
    (sujets.length
      ? '<div class="activite-sujets"><span class="activite-sujets-lbl">Sur le même sujet :</span>' +
        sujets.map(([code, label]) => `<a href="/philosophes/frise/vivants-${attr(code)}/">${attr(label)}</a>`).join('') +
        '</div>'
      : '') +
    '</div>'
  );
}
