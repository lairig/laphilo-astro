import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { citations, finVie } from '../../lib/contemporains';

/* Données de la Frise des penseurs du monde (/frises/penseurs-du-monde/).
   Une ligne par philosophe : [id, nom, naissance, fin, dates affichées,
   groupe, priorité, vignette, description, tags, courants].
   Priorité = importance (colonne des xlsx) × 1000 + nombre d'autres fiches
   qui citent le philosophe : décide qui reste visible quand on dézoome. */

export const GET: APIRoute = async () => {
  const philosophes = (await getCollection('philosophes')).filter((e) => e.data.groupe);
  const cite = citations(philosophes);

  const lignes = philosophes.map((e) => {
    const p = e.data;
    return [
      e.id, p.name, p.year, finVie(p), p.display_date, p.groupe,
      (p.importance ?? 1) * 1000 + Math.min(cite.get(e.id) ?? 0, 999),
      p.thumbnail ?? '', p.description ?? '', (p.traditions ?? []).join(';'),
      (p.courants ?? []).join(';'),
    ];
  });

  return new Response(JSON.stringify(lignes), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
