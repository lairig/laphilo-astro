import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/* Données de la Frise et du Tableau des courants (/frises/courants-du-monde/,
   /frises/tableau-des-courants/).
   courants : [id, nom, année, date affichée, groupe, traditions secondaires,
     branches, description, vidéo YouTube, frise (occidental | oriental),
     représentants (indices dans philosophes, du plus ancien au plus récent)]
   philosophes : [id, nom, année, date affichée, groupe, vignette, frise, vivant]
   Seuls les philosophes rattachés à au moins un courant sont repris ; « vivant »
   = fiche de philosophe en activité (colonne Thèmes renseignée). */

export const GET: APIRoute = async () => {
  const courants = await getCollection('courants');
  const philosophes = (await getCollection('philosophes'))
    .filter((p) => (p.data.courants ?? []).length)
    .sort((a, b) => a.data.year - b.data.year);

  const index = new Map(philosophes.map((p, i) => [p.id, i]));
  const reps = new Map<string, number[]>();
  for (const p of philosophes) {
    for (const c of p.data.courants ?? []) {
      if (!reps.has(c)) reps.set(c, []);
      reps.get(c)!.push(index.get(p.id)!);
    }
  }

  const json = {
    courants: courants
      .slice()
      .sort((a, b) => a.data.year - b.data.year)
      .map((c) => [
        c.id, c.data.name, c.data.year, c.data.display_date, c.data.groupe ?? '',
        (c.data.traditions ?? []).join(';'), (c.data.branches ?? []).join(';'),
        c.data.description ?? '', c.data.yt_id ?? '', c.data.frise_source,
        reps.get(c.data.name) ?? [],
      ]),
    philosophes: philosophes.map((p) => [
      p.id, p.data.name, p.data.year, p.data.display_date, p.data.groupe ?? '',
      p.data.thumbnail ?? '', p.data.frise_source, (p.data.themes ?? []).length ? 1 : 0,
    ]),
  };

  return new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
