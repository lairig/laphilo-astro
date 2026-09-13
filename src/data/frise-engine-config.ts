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
};
