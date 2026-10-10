import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/* Liste des fiches pour le champ « À propos de » de la page Vos remarques :
   [chemin de la fiche, nom affiché, dates, vignette], triée par nom. */
export const GET: APIRoute = async () => {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');
  const fiches = [
    ...philosophes.map((e) => [`/philosophes/${e.id}/`, e.data.name, e.data.display_date || '', e.data.thumbnail || '']),
    ...courants.map((e) => [`/courants/${e.id}/`, `${e.data.name} (courant)`, e.data.display_date || '', '']),
  ].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  return new Response(JSON.stringify(fiches), {
    headers: { 'Content-Type': 'application/json' },
  });
};
