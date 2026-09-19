import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  philosopheFriseMeta,
  courantFriseMeta,
  epoqueFromYear,
  branchOfCourant,
} from '../../data/search-frise-meta';
import { courantBranchGroups } from '../../data/frise-engine-config';

export const GET: APIRoute = async () => {
  const philosophes = await getCollection('philosophes');
  const courants = await getCollection('courants');

  const natsSet = new Set<string>();
  const domsSet = new Set<string>();
  const domsCurSet = new Set<string>();
  const cursSet = new Set<string>();

  const index = [];

  for (const entry of philosophes) {
    const p = entry.data;
    const meta = philosopheFriseMeta[p.frise_source];
    const isOriental = meta?.isOriental || false;
    const epoque = isOriental ? epoqueFromYear(p.year) : meta?.epoque || 'modernes';
    const live = meta?.colorFilter === 'live';

    if (p.nationalite) natsSet.add(p.nationalite);
    (p.branches || []).forEach((d) => domsSet.add(d));
    (p.courants || []).forEach((c) => cursSet.add(c));

    index.push({
      n: p.name,
      d: p.display_date,
      y: 'philosophe',
      u: `/philosophes/frise/${p.frise_source}/`,
      t: p.thumbnail || '',
      nat: p.nationalite || '',
      dom: p.branches || [],
      cur: p.courants || [],
      desc: p.description || '',
      live,
      epoque,
      badgeFr: meta?.badgeFr || '',
      badgeEn: meta?.badgeEn || '',
      badgeCls: meta?.badgeCls || '',
      colorFilter: meta?.colorFilter || '',
      isOriental,
      isRusse: meta?.isRusse || false,
      year: p.year,
    });
  }

  for (const entry of courants) {
    const c = entry.data;
    const meta = courantFriseMeta[c.frise_source];
    const epoque = epoqueFromYear(c.year);
    const branch = branchOfCourant(c.name);

    (c.branches || []).forEach((d) => domsCurSet.add(d));

    index.push({
      n: c.name,
      d: c.display_date,
      y: 'courant',
      u: `/courants/frise/${c.frise_source}/`,
      t: '',
      nat: '',
      dom: c.branches || [],
      cur: [],
      desc: c.description || '',
      live: false,
      epoque,
      badgeFr: meta?.badgeFr || '',
      badgeEn: meta?.badgeEn || '',
      badgeCls: meta?.badgeCls || '',
      colorFilter: c.frise_source === 'occidental' ? 'courant-occ' : 'courant-ori',
      isOriental: c.frise_source === 'oriental',
      isRusse: false,
      year: c.year,
      br: branch,
    });
  }

  const json = {
    _meta: {
      nats: Array.from(natsSet).sort(),
      doms: Array.from(domsSet).sort(),
      doms_cur: Array.from(domsCurSet).sort(),
      curs: Array.from(cursSet).sort(),
      courantBranchGroups: courantBranchGroups.map((g) => ({
        slug: g.slug,
        label: g.shortLabel,
        branches: g.branches,
      })),
    },
    index,
  };

  return new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json' },
  });
};
