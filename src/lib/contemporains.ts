import type { CollectionEntry } from 'astro:content';

/* Notoriété et durée de vie des philosophes, partagées par la Frise des
   penseurs du monde (/data/frise-penseurs-monde.json) et la page « À la même
   époque » (/frises/tableau-des-penseurs/). */

type Philosophe = CollectionEntry<'philosophes'>;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
// Mots trop courants pour servir de nom de famille dans le décompte des citations
const STOP = new Set(['JEAN', 'PIERRE', 'ALAIN', 'PAUL', 'SIMON', 'MARTIN', 'GUILLAUME', 'NICOLAS',
  'THOMAS', 'JACQUES', 'GRAND', 'BERLIN', 'RABBI', 'SAINT', 'MARC', 'LOUIS', 'ROGER', 'ANNE', 'MARIE',
  'FRANCOIS', 'DROIT', 'ROME', 'IBN', 'HAN', 'SEN', 'ZHANG', 'WANG', 'ROY', 'LEE', 'KIM', 'PARK', 'CHOE']);

function nomCle(name: string): string | null {
  const toks = name.split(/\s+/).map((t) => t.replace(/[^\p{L}'-]/gu, ''));
  const caps = toks
    .filter((t) => t.length >= 3 && t === t.toUpperCase() && /\p{L}/u.test(t))
    .map((t) => norm(t).split(/['-]/).find((x) => x.length >= 3 && !STOP.has(x)))
    .filter(Boolean) as string[];
  if (caps.length) return caps[0];
  const fin = toks.length ? norm(toks[toks.length - 1]).split(/['-]/).pop()! : '';
  return fin.length >= 4 && !STOP.has(fin) ? fin : null;
}

/* Nombre d'autres fiches qui citent chaque philosophe (par son nom de famille). */
export function citations(philosophes: Philosophe[]): Map<string, number> {
  const mots = philosophes.map((e) =>
    new Set(norm(`${e.data.text} ${e.data.description ?? ''}`.replace(/<[^>]+>/g, ' ')).split(/[^A-Z]+/)));
  const res = new Map<string, number>();
  philosophes.forEach((e, i) => {
    const cle = nomCle(e.data.name);
    let cite = 0;
    if (cle) for (let j = 0; j < mots.length; j++) if (j !== i && mots[j].has(cle)) cite++;
    res.set(e.id, cite);
  });
  return res;
}

/* Fin de la période d'activité : la mort, ou 70 ans de vie pour les vivants. */
export function finVie(p: Philosophe['data']): number {
  return typeof p.end_year === 'number' ? p.end_year : Math.min(p.year + 70, new Date().getFullYear());
}

/* Notoriété : importance (colonne des xlsx) d'abord, puis citations. */
export function poids(p: Philosophe['data'], cite: number): number {
  return (p.importance ?? 1) * 100 + Math.min(cite, 50) * 2;
}

/* Année où le philosophe avait environ 40 ans (ou sa mort, si avant) : situe
   chacun dans une seule période du Tableau des penseurs. */
export function floruit(p: Philosophe['data']): number {
  return Math.min(p.year + 40, finVie(p));
}
