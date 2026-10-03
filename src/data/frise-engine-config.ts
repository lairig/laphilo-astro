// Reprend les réglages FRISE_CONFIG (defaultIndex/scale_factor/mode/etc.)
// des pages frise-*.html originales, mappés aux frise_source Astro.

export interface FriseEngineConfig {
  defaultIndex: number;
  scale_factor?: number;
  mode?: 'philosophe' | 'courant';
  pxPerYear?: number;
  pxMin?: number;
  pxMax?: number;
  zoomSteps?: number[];
}

export const philosopheFriseConfig: Record<string, FriseEngineConfig> = {
  'greco-romains': { defaultIndex: 37, scale_factor: 4 },
  medievaux: { defaultIndex: 40, scale_factor: 15 },
  'renaissance-lumieres': { defaultIndex: 38, scale_factor: 8 },
  modernes: { defaultIndex: 36, scale_factor: 10 },
  france: { defaultIndex: 58, scale_factor: 15 },
  'francais-toutes-epoques': { defaultIndex: 44, scale_factor: 10 },
  'allemands-toutes-epoques': { defaultIndex: 17, scale_factor: 10 },
  'americains-toutes-epoques': { defaultIndex: 8, scale_factor: 15 },
  'russes-toutes-epoques': { defaultIndex: 19, scale_factor: 15 },
  'italiens-toutes-epoques': { defaultIndex: 0, scale_factor: 8 },
  'europe-nord-centrale-toutes-epoques': { defaultIndex: 0, scale_factor: 8 },
  'britanniques-toutes-epoques': { defaultIndex: 30, scale_factor: 8 },
  'germanophones-toutes-epoques': { defaultIndex: 17, scale_factor: 10 },
  'monde-islamique-toutes-epoques': { defaultIndex: 13, scale_factor: 8 },
  'pensees-du-sud-toutes-epoques': { defaultIndex: 0, scale_factor: 15 },
  'hispaniques-toutes-epoques': { defaultIndex: 5, scale_factor: 8 },
  'proche-orient-ancien-toutes-epoques': { defaultIndex: 0, scale_factor: 8 },
  'femmes-toutes-epoques': { defaultIndex: 20, scale_factor: 8 },
  'grecs-byzantins-toutes-epoques': { defaultIndex: 24, scale_factor: 4 },
  'inde-bouddhisme-toutes-epoques': { defaultIndex: 9, scale_factor: 8 },
  'asie-est-toutes-epoques': { defaultIndex: 1, scale_factor: 8 },
  'pensee-juive-toutes-epoques': { defaultIndex: 3, scale_factor: 8 },
  allemands: { defaultIndex: 20, scale_factor: 10 },
  americains: { defaultIndex: 18, scale_factor: 15 },
  russes: { defaultIndex: 40, scale_factor: 15 },
  orientaux: { defaultIndex: 42, scale_factor: 9 },
  'france-contemporains': { defaultIndex: 40, scale_factor: 15 },
  'contemporains-monde': { defaultIndex: 20, scale_factor: 18 },
  'contemporains-europe': { defaultIndex: 10, scale_factor: 18 },
  'contemporains-ameriques': { defaultIndex: 10, scale_factor: 18 },
  'contemporains-afrique-moyen-orient': { defaultIndex: 3, scale_factor: 18 },
  'contemporains-asie-oceanie': { defaultIndex: 3, scale_factor: 18 },
  'vivants-esprit-ia': { defaultIndex: 6, scale_factor: 18 },
  'vivants-ecologie': { defaultIndex: 5, scale_factor: 18 },
  'vivants-justice': { defaultIndex: 14, scale_factor: 18 },
  'vivants-critique': { defaultIndex: 10, scale_factor: 18 },
  'vivants-genre': { defaultIndex: 7, scale_factor: 18 },
  'vivants-decolonial': { defaultIndex: 5, scale_factor: 18 },
  'vivants-sens': { defaultIndex: 8, scale_factor: 18 },
  'vivants-reel': { defaultIndex: 10, scale_factor: 18 },
  'vivants-art': { defaultIndex: 4, scale_factor: 18 },
  'vivants-continental': { defaultIndex: 12, scale_factor: 18 },
};

/* Réglages communs à toutes les frises de courants ; les frises ajoutées
   (traditions, thèmes du monde) partent du plus ancien courant (index 0). */
const COURANT_DEFAUT: FriseEngineConfig = {
  defaultIndex: 0,
  scale_factor: 3,
  mode: 'courant',
  pxPerYear: 22,
  pxMin: 4,
  pxMax: 80,
  zoomSteps: [2, 4, 8, 15],
};
const courant = (defaultIndex: number): FriseEngineConfig => ({ ...COURANT_DEFAUT, defaultIndex });

export const courantFriseConfig: Record<string, FriseEngineConfig> = {
  occidental: courant(45),
  oriental: courant(11),
  'occidental--metaphysique-theologie': courant(30),
  'occidental--politique-ethique': courant(25),
  'occidental--connaissance-sciences': courant(20),
  'oriental--metaphysique-theologie': courant(12),
  'oriental--politique-ethique': courant(6),
  'oriental--connaissance-sciences': courant(2),
};
export const courantFriseDefaut = COURANT_DEFAUT;

/* ── Frises de courants ──────────────────────────────────────────────────
   Deux frises complètes, selon la colonne Groupe du courant (build-data.py) :
   « occidental » (groupe occident) et « oriental » (toutes les autres
   traditions, libellé « Courants des autres traditions du monde »).
   Trois mêmes thèmes partout (colonne Branche) : sous-frises des deux frises
   complètes (boutons « Tout / thème » en haut de celles-ci) et frises
   « monde » toutes traditions confondues. */
export interface CourantTheme {
  cle: string;
  shortLabel: string;
  branches: string[];
}
export const courantThemes: CourantTheme[] = [
  { cle: 'metaphysique-theologie', shortLabel: 'Métaphysique & Spiritualité', branches: ['Métaphysique', 'Théologie et spiritualité'] },
  { cle: 'politique-ethique', shortLabel: 'Politique & Éthique', branches: ['Philosophie politique', 'Éthique'] },
  { cle: 'connaissance-sciences', shortLabel: 'Connaissance & Sciences', branches: ['Épistémologie', 'Philosophie des sciences et du vivant', "Philosophie de l'esprit", 'Logique'] },
];

export interface CourantBranchGroup {
  slug: string;
  source: 'occidental' | 'oriental' | 'monde';
  label: string;
  shortLabel: string;
  branches: string[];
}
const SOURCES_THEMES: [CourantBranchGroup['source'], string][] = [
  ['occidental', 'Courants occidentaux'],
  ['oriental', 'Autres traditions du monde'],
  ['monde', 'Courants du monde entier'],
];
export const courantBranchGroups: CourantBranchGroup[] = SOURCES_THEMES.flatMap(([source, prefixe]) =>
  courantThemes.map((t) => ({
    slug: `${source}--${t.cle}`,
    source,
    label: `${prefixe} — ${t.shortLabel}`,
    shortLabel: t.shortLabel,
    branches: t.branches,
  })),
);

/* Frises par tradition (hors Occident, qui a sa frise complète) : courants dont
   c'est la tradition principale ou une tradition secondaire (colonne Traditions). */
export interface CourantTraditionFrise {
  slug: string;
  groupe: string;
  label: string;
  shortLabel: string;
}
export const courantTraditionFrises: CourantTraditionFrise[] = [
  { slug: 'islam-juif', groupe: 'islam-juif', label: 'Courants du monde islamique et juif', shortLabel: 'Islam & judaïsme' },
  { slug: 'inde', groupe: 'inde', label: "Courants de l'Inde et du bouddhisme", shortLabel: 'Inde & bouddhisme' },
  { slug: 'asie-est', groupe: 'asie-est', label: "Courants de l'Asie de l'Est", shortLabel: "Asie de l'Est" },
  { slug: 'russe', groupe: 'russe', label: 'Courants de la pensée russe', shortLabel: 'Pensée russe' },
  { slug: 'sud', groupe: 'sud', label: 'Courants des pensées du Sud', shortLabel: 'Pensées du Sud' },
  { slug: 'orient-ancien', groupe: 'orient-ancien', label: 'Courants du Proche-Orient ancien', shortLabel: 'Proche-Orient ancien' },
];

/* Les courants d'une frise (slug d'URL), ou null si le slug est inconnu. */
interface CourantPourFrise {
  data: { frise_source: string; branches?: string[]; groupe?: string; traditions?: string[] };
}
export function courantsDeLaFrise<T extends CourantPourFrise>(slug: string, courants: T[]): T[] | null {
  const groupe = courantBranchGroups.find((g) => g.slug === slug);
  if (groupe) {
    return courants.filter((c) => (groupe.source === 'monde' || c.data.frise_source === groupe.source)
      && (c.data.branches || []).some((b) => groupe.branches.includes(b)));
  }
  const trad = courantTraditionFrises.find((t) => t.slug === slug);
  if (trad) return courants.filter((c) => c.data.groupe === trad.groupe || (c.data.traditions || []).includes(trad.groupe));
  if (slug === 'occidental' || slug === 'oriental') return courants.filter((c) => c.data.frise_source === slug);
  return null;
}

/* Tous les slugs de frises de courants, et leur libellé */
export const courantFriseSlugs = (): string[] => [
  'occidental', 'oriental', ...courantBranchGroups.map((g) => g.slug), ...courantTraditionFrises.map((t) => t.slug),
];
export function libelleFriseCourant(slug: string): string {
  if (slug === 'occidental') return 'Courants de pensée occidentaux';
  if (slug === 'oriental') return 'Courants des autres traditions du monde';
  return courantBranchGroups.find((g) => g.slug === slug)?.label
    ?? courantTraditionFrises.find((t) => t.slug === slug)?.label ?? slug;
}
