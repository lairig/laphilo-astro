const PALETTE = [
  '#8b3a0f', '#1a4a6a', '#3a5a2a', '#5a2a6a', '#1a5a5a',
  '#6a4a1a', '#2a5a3a', '#4a1a5a', '#1a3a6a', '#5a3a1a',
  '#3a1a5a', '#6a2a2a', '#1a5a3a', '#4a5a1a', '#2a2a5a',
  '#7a3a0f', '#0a4a7a', '#2a6a2a', '#6a1a5a', '#0a6a5a',
];

export function markerColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function eraLabel(year: number): string {
  if (year < -300) return 'Antiquité';
  if (year < 500) return 'Époque hellénistique';
  if (year < 1400) return 'Moyen Âge';
  if (year < 1650) return 'Renaissance';
  if (year < 1800) return 'Lumières';
  if (year < 1900) return 'XIXe siècle';
  return 'Époque contemporaine';
}
