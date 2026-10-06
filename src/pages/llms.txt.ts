import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import friseDescriptions from '../data/frise-descriptions.json';

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, '');

const PHILO_ORDER = [
  'greco-romains',
  'medievaux',
  'renaissance-lumieres',
  'france',
  'france-contemporains',
  'allemands',
  'modernes',
  'americains',
  'russes',
  'orientaux',
  'contemporains-monde',
];

const COURANT_ORDER = ['occidental', 'oriental'];

export const GET: APIRoute = async ({ site }) => {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');

  const philoBySource = new Map<string, { label: string; count: number }>();
  for (const p of philosophes) {
    const key = p.data.frise_source;
    if (!philoBySource.has(key)) philoBySource.set(key, { label: p.data.frise_label, count: 0 });
    philoBySource.get(key)!.count++;
  }

  const courantBySource = new Map<string, { label: string; count: number }>();
  for (const c of courants) {
    const key = c.data.frise_source;
    if (!courantBySource.has(key)) courantBySource.set(key, { label: c.data.frise_label, count: 0 });
    courantBySource.get(key)!.count++;
  }

  const url = (path: string) => new URL(path, site).toString();
  const descriptions = friseDescriptions as Record<string, string>;

  const philoLines = PHILO_ORDER
    .filter((slug) => philoBySource.has(slug))
    .map((slug) => {
      const { label, count } = philoBySource.get(slug)!;
      const desc = stripHtml(descriptions[slug] ?? '');
      return `- [${label}](${url(`/philosophes/frise/${slug}/`)}) : ${desc} (${count} fiches)`;
    })
    .join('\n');

  const courantLines = COURANT_ORDER
    .filter((slug) => courantBySource.has(slug))
    .map((slug) => {
      const { label, count } = courantBySource.get(slug)!;
      const desc = stripHtml(descriptions[slug] ?? '');
      return `- [${label}](${url(`/courants/frise/${slug}/`)}) : ${desc} (${count} fiches)`;
    })
    .join('\n');

  const body = `# LaPhilo.fr

> Ressource éducative libre et gratuite dédiée à l'histoire de la philosophie mondiale, de l'Antiquité à 2026.

LaPhilo.fr propose des frises chronologiques interactives couvrant ${philosophes.length} philosophes et ${courants.length} courants de pensée, répartis entre les traditions occidentale, orientale, africaine et russe.

## Pages principales

- [Accueil](${url('/')}) : portail d'entrée, présentation des sections
- [Bienvenue](${url('/bienvenue/')}) : présentation du site et parcours conseillé
- [Plan du site](${url('/plan-du-site/')}) : liste complète des ressources
- [Recherche](${url('/recherche/')}) : recherche par nom, filtres par époque, nationalité, branche, courant
- [Définition de la philosophie](${url('/definition/')}) : les 7 grandes branches et les branches spécialisées
- [Histoire des courants de pensée](${url('/histoire-des-courants/')}) : les grandes familles d'idées, par période
- [Familles de pensée et grands débats](${url('/familles-de-pensee/')}) : les courants rangés par famille (filiations) et les positions rangées par grande question
- [Les philosophes d'aujourd'hui](${url('/philosophes-d-aujourd-hui/')}) : les penseurs vivants, par sujet de travail et par région du monde
- [Les philosophes anciens](${url('/histoire-des-philosophes/')}) : des présocratiques aux grandes figures du XXᵉ siècle
- [Les frises](${url('/frises/')}) : toutes les frises chronologiques, par époque, pays, tradition, sujet ou courant

## Penseurs et courants du monde

- [La Frise des penseurs du monde](${url('/frises/penseurs-du-monde/')}) : toutes les traditions philosophiques sur un même axe du temps (filtres femmes, hommes, vivants)
- [Le Tableau des penseurs](${url('/frises/tableau-des-penseurs/')}) : les traditions du monde époque par époque, et les contemporains de chaque penseur
- [La Frise des courants](${url('/frises/courants-du-monde/')}) : les courants de pensée de toutes les traditions sur un même axe du temps
- [Le Tableau des courants](${url('/frises/tableau-des-courants/')}) : les courants rangés par grande question, époque par époque

## Frises philosophes

${philoLines}

## Frises courants de pensée

${courantLines}

## Informations éditoriales

- Langue : français (fr-FR)
- Accès : gratuit, sans inscription
- Mise à jour : continue (2026)
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
