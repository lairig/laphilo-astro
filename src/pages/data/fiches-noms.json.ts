import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/* Liste des fiches pour le champ « À propos de » de la page Vos remarques :
   [chemin de la fiche, nom affiché], philosophes puis courants. */
export const GET: APIRoute = async () => {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');
  const fiches = [
    ...philosophes.map((e) => [`/philosophes/${e.id}/`, e.data.name]),
    ...courants.map((e) => [`/courants/${e.id}/`, `${e.data.name} (courant)`]),
  ].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  return new Response(JSON.stringify(fiches), {
    headers: { 'Content-Type': 'application/json' },
  });
};
