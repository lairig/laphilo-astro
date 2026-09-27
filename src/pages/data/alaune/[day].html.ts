import type { APIRoute } from 'astro';
import { getAlaunePools, alauneHtml } from '../../../lib/alaune';

/* Un fragment HTML par jour de l'année, chargé par home-alaune.js. */
export async function getStaticPaths() {
  return Array.from({ length: 366 }, (_, i) => ({ params: { day: String(i + 1) } }));
}

export const GET: APIRoute = async ({ params }) => {
  const html = alauneHtml(await getAlaunePools(), Number(params.day));
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
