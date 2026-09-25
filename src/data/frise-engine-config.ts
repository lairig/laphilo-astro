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
  'britanniques-toutes-epoques': { defaultIndex: 30, scale_factor: 8 },
  allemands: { defaultIndex: 20, scale_factor: 10 },
  americains: { defaultIndex: 18, scale_factor: 15 },
  russes: { defaultIndex: 40, scale_factor: 15 },
  orientaux: { defaultIndex: 42, scale_factor: 9 },
  'france-contemporains': { defaultIndex: 40, scale_factor: 15 },
  'contemporains-monde': { defaultIndex: 20, scale_factor: 18 },
};

export const courantFriseConfig: Record<string, FriseEngineConfig> = {
  occidental: {
    defaultIndex: 45,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  oriental: {
    defaultIndex: 11,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  'occidental--metaphysique-theologie': {
    defaultIndex: 30,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  'occidental--politique-ethique': {
    defaultIndex: 25,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  'occidental--connaissance-sciences': {
    defaultIndex: 20,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  'oriental--theologie-spiritualite': {
    defaultIndex: 15,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  'oriental--politique-metaphysique': {
    defaultIndex: 8,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
  'oriental--logique-ethique-sciences': {
    defaultIndex: 3,
    scale_factor: 3,
    mode: 'courant',
    pxPerYear: 22,
    pxMin: 4,
    pxMax: 80,
    zoomSteps: [2, 4, 8, 15],
  },
};

// Sous-frises thématiques de "occidental" et "oriental", filtrées par Branche
// (colonne K du xlsx source). Chaque groupe reprend un sous-ensemble des
// courants d'une frise_source pour l'alléger ; la source de données reste
// unique (courants.json), seul le filtrage change.
export interface CourantBranchGroup {
  slug: string;
  source: 'occidental' | 'oriental';
  label: string;
  shortLabel: string;
  branches: string[];
  description: string;
}

export const courantBranchGroups: CourantBranchGroup[] = [
  {
    slug: 'occidental--metaphysique-theologie',
    source: 'occidental',
    label: 'Courants occidentaux — Métaphysique & Théologie',
    shortLabel: 'Métaphysique & Théologie',
    branches: ['Métaphysique', 'Théologie et spiritualité'],
    description: "L'être, le divin et le sens : des cosmologies antiques aux théologies chrétiennes, du polythéisme aux métaphysiques de la subjectivité moderne.",
  },
  {
    slug: 'occidental--politique-ethique',
    source: 'occidental',
    label: 'Courants occidentaux — Politique & Éthique',
    shortLabel: 'Politique & Éthique',
    branches: ['Philosophie politique', 'Éthique'],
    description: "Le pouvoir, la justice et la vie bonne : des cités grecques aux idéologies modernes, du contrat social aux éthiques contemporaines.",
  },
  {
    slug: 'occidental--connaissance-sciences',
    source: 'occidental',
    label: 'Courants occidentaux — Connaissance & Sciences',
    shortLabel: 'Connaissance & Sciences',
    branches: ['Épistémologie', 'Philosophie des sciences et du vivant', "Philosophie de l'esprit", 'Logique'],
    description: "Ce que l'on peut savoir et comment : de la logique antique à l'épistémologie contemporaine, en passant par la philosophie des sciences et de l'esprit.",
  },
  {
    slug: 'oriental--theologie-spiritualite',
    source: 'oriental',
    label: 'Courants orientaux — Théologie & Spiritualité',
    shortLabel: 'Théologie & Spiritualité',
    branches: ['Théologie et spiritualité'],
    description: "Le sacré et la libération : bouddhisme, hindouisme, soufisme, taoïsme religieux et traditions mystiques d'Asie, du Moyen-Orient et d'Afrique.",
  },
  {
    slug: 'oriental--politique-metaphysique',
    source: 'oriental',
    label: 'Courants orientaux — Politique & Métaphysique',
    shortLabel: 'Politique & Métaphysique',
    branches: ['Philosophie politique', 'Métaphysique'],
    description: "L'ordre du monde et de la cité : confucianisme et légisme politiques, cosmologies et métaphysiques de l'être en Asie, au Moyen-Orient et en Afrique.",
  },
  {
    slug: 'oriental--logique-ethique-sciences',
    source: 'oriental',
    label: 'Courants orientaux — Logique, Éthique & Sciences',
    shortLabel: 'Logique, Éthique & Sciences',
    branches: ['Logique', 'Épistémologie', 'Éthique', 'Philosophie des sciences et du vivant'],
    description: "Raisonner, connaître et bien agir : logique bouddhiste et islamique, épistémologie et éthiques orientales, philosophie des sciences en terre d'Asie et d'Islam.",
  },
];
