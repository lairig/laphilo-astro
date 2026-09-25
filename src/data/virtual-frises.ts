// Frises "virtuelles" : pas de frise_source propre, elles regroupent des fiches
// de plusieurs frises réelles selon une règle.

interface PhilosopheData {
  nationalite?: string;
  frise_source: string;
}

export interface VirtualFrise {
  label: string;
  match: (p: PhilosopheData) => boolean;
}

export const virtualPhilosopheFrises: Record<string, VirtualFrise> = {
  'francais-toutes-epoques': {
    label: 'Philosophes français — toutes époques',
    match: (p) => p.nationalite === 'Française',
  },
  'allemands-toutes-epoques': {
    label: 'Philosophes allemands — toutes époques',
    match: (p) => p.nationalite === 'Allemande',
  },
  'americains-toutes-epoques': {
    label: 'Philosophes américains — toutes époques',
    match: (p) => p.nationalite === 'Américaine',
  },
  'russes-toutes-epoques': {
    label: 'Philosophes russes — toutes époques',
    match: (p) => p.nationalite === 'Russe',
  },
  'britanniques-toutes-epoques': {
    label: 'Philosophes britanniques — toutes époques',
    match: (p) => p.nationalite === 'Britannique',
  },
};
