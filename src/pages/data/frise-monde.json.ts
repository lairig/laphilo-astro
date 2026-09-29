import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/* Données de la Frise des pensées du monde (/frises/monde/).
   Une ligne par philosophe : [id, nom, naissance, fin, dates affichées,
   groupe, priorité, vignette, description, tags].
   Priorité = importance (colonne des xlsx) × 1000 + nombre d'autres fiches
   qui citent le philosophe : décide qui reste visible quand on dézoome. */

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

export const GET: APIRoute = async () => {
  const philosophes = (await getCollection('philosophes')).filter((e) => e.data.groupe);
  const mots = philosophes.map((e) =>
    new Set(norm(`${e.data.text} ${e.data.description ?? ''}`.replace(/<[^>]+>/g, ' ')).split(/[^A-Z]+/)));

  const lignes = philosophes.map((e, i) => {
    const p = e.data;
    const cle = nomCle(p.name);
    let cite = 0;
    if (cle) for (let j = 0; j < mots.length; j++) if (j !== i && mots[j].has(cle)) cite++;
    const fin = typeof p.end_year === 'number' ? p.end_year : Math.min(p.year + 70, new Date().getFullYear());
    return [
      e.id, p.name, p.year, fin, p.display_date, p.groupe, (p.importance ?? 1) * 1000 + Math.min(cite, 999),
      p.thumbnail ?? '', p.description ?? '', (p.traditions ?? []).join(';'),
    ];
  });

  return new Response(JSON.stringify(lignes), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
