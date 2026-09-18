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
};

// Sous-frises thématiques de "occidental", filtrées par Branche (colonne K du
// xlsx source). Chaque groupe reprend un sous-ensemble des 165 courants pour
// alléger la frise complète ; la source de données reste unique (courants.json,
// frise_source === "occidental"), seul le filtrage change.
export interface CourantBranchGroup {
  slug: string;
  label: string;
  shortLabel: string;
  branches: string[];
  description: string;
}

export const courantBranchGroups: CourantBranchGroup[] = [
  {
    slug: 'occidental--metaphysique-theologie',
    label: 'Courants occidentaux — Métaphysique & Théologie',
    shortLabel: 'Métaphysique & Théologie',
    branches: ['Métaphysique', 'Théologie et spiritualité'],
    description: "L'être, le divin et le sens : des cosmologies antiques aux théologies chrétiennes, du polythéisme aux métaphysiques de la subjectivité moderne.",
  },
  {
    slug: 'occidental--politique-ethique',
    label: 'Courants occidentaux — Politique & Éthique',
    shortLabel: 'Politique & Éthique',
    branches: ['Philosophie politique', 'Éthique'],
    description: "Le pouvoir, la justice et la vie bonne : des cités grecques aux idéologies modernes, du contrat social aux éthiques contemporaines.",
  },
  {
    slug: 'occidental--connaissance-sciences',
    label: 'Courants occidentaux — Connaissance & Sciences',
    shortLabel: 'Connaissance & Sciences',
    branches: ['Épistémologie', 'Philosophie des sciences et du vivant', "Philosophie de l'esprit", 'Logique'],
    description: "Ce que l'on peut savoir et comment : de la logique antique à l'épistémologie contemporaine, en passant par la philosophie des sciences et de l'esprit.",
  },
];
