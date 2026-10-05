import { getCollection } from 'astro:content';
import catalogue from '../data/frises-catalogue.json';
import { virtualPhilosopheFrises } from '../data/virtual-frises';
import { courantsDeLaFrise, courantTraditionFrises } from '../data/frise-engine-config';
import friseDescriptions from '../data/frise-descriptions.json';
import { philosopheFriseMeta } from '../data/search-frise-meta';

/* Index des frises du catalogue (page /frises/) avec leur contenu : nombre de
   membres, dates, vignettes. Sert à l'onglet « Frises » de la recherche
   (/data/frises-index.json) et aux cartes de la page /frises/.
   m = membres [nom, paramètre ?p= de la frise] ; v = vignettes à afficher. */

type Membre = { name: string; id: string; year: number; fin: number; thumbnail?: string; importance?: number };

export type EntreeFrise = {
  n: string; u: string; c: string; r: string; tag: string; desc: string;
  debut: number | null; fin: number | null; nb: number; k: string;
  v: [string, string | undefined][]; m: string[][];
};

/* Libellé de groupe du catalogue -> regroupement proposé dans le filtre */
const REGROUPEMENTS: Record<string, string> = {
  Anciens: 'epoque',
  Modernes: 'epoque',
  /* les contemporains (français, par région, monde entier) sont aussi « par région du monde » */
  Contemporains: 'epoque region',
  'Vivants par sujet de travail': 'vivants',
  'Par pays': 'pays',
  'Par grande tradition': 'tradition',
  'Par thème': 'theme',
  'La Frise des Penseurs du Monde': 'monde',
};

/* Couleur de la carte (k) : mêmes couleurs que les cartes de l'onglet Philosophes
   (colorFilter des frises réelles) ou que les pastilles de tradition (drapeaux,
   « flag:<clé> » de COLOR_FILTERS dans search-full.js) */
const COULEUR_VIRTUELLE: Record<string, string> = {
  'francais-toutes-epoques': 'france',
  'allemands-toutes-epoques': 'allemand',
  'americains-toutes-epoques': 'americain',
  'russes-toutes-epoques': 'russe',
  'britanniques-toutes-epoques': 'flag:britannique',
  'italiens-toutes-epoques': 'flag:italien',
  'europe-nord-centrale-toutes-epoques': 'flag:europe-nord-centrale',
  'germanophones-toutes-epoques': 'flag:germanophone',
  'monde-islamique-toutes-epoques': 'flag:arabo-persan',
  'pensees-du-sud-toutes-epoques': 'flag:africain',
  'hispaniques-toutes-epoques': 'flag:hispanique',
  'femmes-toutes-epoques': 'flag:femme',
  'proche-orient-ancien-toutes-epoques': 'flag:orient-ancien',
  'grecs-byzantins-toutes-epoques': 'flag:grec',
  'inde-bouddhisme-toutes-epoques': 'flag:indien',
  'asie-est-toutes-epoques': 'flag:asie-est',
  'pensee-russe-toutes-epoques': 'russe',
  'pensee-juive-toutes-epoques': 'flag:juif',
  'indiens-toutes-epoques': 'flag:indiens',
  'modernes-europe-nord-centrale': 'flag:europe-nord-centrale',
  'modernes-europe-sud': 'flag:italien',
  'modernes-asie': 'flag:asie-est',
  'modernes-monde': 'moderne',
  'modernes-islam-sud': 'flag:arabo-persan',
  'chinois-toutes-epoques': 'flag:chinois',
  'coreens-toutes-epoques': 'flag:coreen',
  'japonais-toutes-epoques': 'flag:japonais',
  'monde-arabe-toutes-epoques': 'flag:arabe',
  'monde-persan-turc-toutes-epoques': 'flag:persan-turc',
  'afrique-subsaharienne-toutes-epoques': 'flag:afrique',
  'asie-sud-est-toutes-epoques': 'flag:asie-se',
  'caraibes-toutes-epoques': 'flag:caraibes',
};
function couleur(href: string): string {
  if (href.startsWith('/frises/')) return 'monde';
  const slug = href.split('/').filter(Boolean).pop() ?? '';
  if (href.startsWith('/courants/')) return slug.startsWith('occidental') || slug.startsWith('monde') ? 'courant-occ' : 'courant-ori';
  if (slug.startsWith('vivants-') || slug.startsWith('contemporains-')) return 'live';
  return COULEUR_VIRTUELLE[slug] ?? philosopheFriseMeta[slug]?.colorFilter ?? '';
}

/* Frises de courants : complète, par tradition ou thématique (« occidental--… »,
   « monde--… »), et occidentale ou des autres traditions du monde */
const TRADITIONS_COURANTS = new Set(courantTraditionFrises.map((t) => t.slug));
/* Frise et Tableau des courants (toutes traditions) */
const VUES_COURANTS = new Set(['/frises/courants-du-monde/', '/frises/tableau-des-courants/']);
function regroupCourant(href: string): string {
  const slug = href.split('/').filter(Boolean).pop() ?? '';
  if (slug.startsWith('monde--')) return 'courants-theme courants-occ courants-ori';
  if (TRADITIONS_COURANTS.has(slug)) return 'courants-tradition courants-ori';
  return `${slug.includes('--') ? 'courants-theme' : 'courants-complet'} ${slug.startsWith('oriental') ? 'courants-ori' : 'courants-occ'}`;
}

const texte = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export async function indexDesFrises(): Promise<EntreeFrise[]> {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');

  const annee = new Date().getFullYear();
  const vivant = (source: string) => source === 'france-contemporains' || source === 'contemporains-monde';
  const phi = philosophes.map((e): Membre & { data: (typeof philosophes)[number]['data'] } => ({
    name: e.data.name,
    id: e.id,
    year: e.data.year,
    /* un vivant compte jusqu'à aujourd'hui pour le filtre « Période » */
    fin: typeof e.data.end_year === 'number' ? e.data.end_year : vivant(e.data.frise_source) ? annee : e.data.year,
    thumbnail: e.data.thumbnail,
    importance: e.data.importance,
    data: e.data,
  }));
  const cur = courants.map((e) => ({
    name: e.data.name,
    id: e.id,
    year: e.data.year,
    fin: typeof e.data.end_year === 'number' ? e.data.end_year : e.data.year,
    data: e.data,
  }));

  /* Même contenu que la frise elle-même (pages /philosophes/frise/…, /courants/frise/…) */
  function membres(href: string): { liste: Membre[]; parId: boolean } {
    let m = href.match(/^\/philosophes\/frise\/([^/]+)\/$/);
    if (m) {
      const v = virtualPhilosopheFrises[m[1]];
      return { liste: phi.filter((p) => (v ? v.match(p.data) : p.data.frise_source === m![1])), parId: false };
    }
    m = href.match(/^\/courants\/frise\/([^/]+)\/$/);
    if (m) {
      return { liste: courantsDeLaFrise(m[1], cur) ?? [], parId: false };
    }
    if (href === '/frises/penseurs-du-monde/') return { liste: phi.filter((p) => p.data.groupe), parId: true };
    /* Une seule voie de la frise du monde : /frises/penseurs-du-monde/?g=occident */
    m = href.match(/^\/frises\/penseurs-du-monde\/\?g=([a-z-]+)$/);
    if (m) return { liste: phi.filter((p) => p.data.groupe === m![1]), parId: true };
    if (VUES_COURANTS.has(href)) return { liste: cur, parId: true }; // pages ouvertes sur ?p=<id du courant>
    return { liste: [], parId: false };
  }

  const entrees: { label: string; groupe: string; href: string; tag: string; text: string }[] = [];
  for (const g of catalogue.groups as any[]) {
    for (const it of g.items) {
      if (it.href) entrees.push({ label: it.name, groupe: g.label, href: it.href, tag: it.tag, text: it.text });
      /* Hubs à plusieurs liens : la frise complète et ses sous-frises ; pour la
         Frise des penseurs du monde, seule la vue d'ensemble (les autres liens
         sont des réglages de la même frise) */
      (it.links || []).forEach((l: any, i: number) => {
        if (l.href.includes('?')) return;
        const principal = i === 0 && !it.egaux;
        const nom = principal ? it.name : `${it.name} — ${l.label}`;
        /* Sous-frise sans texte propre dans le catalogue : sa description de frise_descriptions.json, comme sur /frises/ */
        const slug = l.href.split('/').filter(Boolean).pop() ?? '';
        const propre = !principal ? (friseDescriptions as Record<string, string>)[slug] : undefined;
        entrees.push({ label: nom, groupe: g.label, href: l.href, tag: it.tag, text: principal && l.href.startsWith('/frises/') ? it.text : l.desc || propre || it.text });
      });
    }
  }

  return entrees.map((e): EntreeFrise => {
    const { liste, parId } = membres(e.href);
    const tries = liste.slice().sort((a, b) => a.year - b.year);
    const parImportance = liste
      .filter((p) => p.thumbnail)
      .sort((a, b) => (b.importance ?? 1) - (a.importance ?? 1) || a.year - b.year);
    /* Frise du monde : un portrait par grande tradition (8) ; ailleurs les 4 plus importants */
    const vignettes = e.href === '/frises/penseurs-du-monde/'
      ? Array.from(new Map(parImportance.map((p) => [(p as any).data.groupe, p])).values())
          .map((p) => parImportance.find((q) => (q as any).data.groupe === (p as any).data.groupe)!)
          .sort((a, b) => a.year - b.year)
          .slice(0, 8)
      : parImportance.slice(0, 4);
    return {
      n: texte(e.label),
      u: e.href,
      c: e.href.startsWith('/courants/') || VUES_COURANTS.has(e.href) ? 'courants' : e.href.startsWith('/frises/') ? 'monde' : 'philosophes',
      r: VUES_COURANTS.has(e.href) ? 'courants-complet courants-occ courants-ori' : e.href.startsWith('/courants/') ? regroupCourant(e.href) : REGROUPEMENTS[e.groupe] ?? '',
      tag: texte(e.tag || ''),
      desc: texte(e.text || ''),
      debut: tries.length ? tries[0].year : null,
      fin: tries.length ? Math.max(...tries.map((p) => p.fin)) : null,
      nb: liste.length,
      k: couleur(e.href),
      v: vignettes.map((p) => [p.name, p.thumbnail]),
      m: tries.map((p) => (parId ? [p.name, p.id] : [p.name])),
    };
  });
}
