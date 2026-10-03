import type { APIRoute } from 'astro';
import { indexDesFrises } from '../../lib/frises-index';

/* Index de l'onglet « Frises » de la recherche (chargé par search-full.js au
   premier clic sur l'onglet) : voir src/lib/frises-index.ts. */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await indexDesFrises()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
