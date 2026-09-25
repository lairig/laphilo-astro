// Frises "virtuelles" : pas de frise_source propre, elles regroupent des fiches
// de plusieurs frises réelles selon une règle.

interface PhilosopheData {
  name: string;
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
  'germanophones-toutes-epoques': {
    label: 'Philosophes germanophones — toutes époques',
    match: (p) => ['Allemande', 'Autrichienne', 'Suisse'].includes(p.nationalite ?? '') && !['Jean Jacques ROUSSEAU', 'Charles BONNET', 'Charles SECRÉTAN'].includes(p.name),
  },
  'arabo-persans-toutes-epoques': {
    label: 'Philosophes du monde arabo-persan — toutes époques',
    match: (p) => ['Arabe', 'Perse', 'Syrienne', 'Marocaine', 'Tunisienne', 'Afghane'].includes(p.nationalite ?? ''),
  },
  'africains-toutes-epoques': {
    label: 'Philosophes africains — toutes époques',
    match: (p) => ['Camerounaise', 'Ghanéenne', 'Sénégalaise', 'Nigériane', 'Congolaise', 'Béninoise', 'Éthiopienne', 'Sud-Africaine'].includes(p.nationalite ?? ''),
  },
  'hispaniques-toutes-epoques': {
    label: 'Philosophes hispaniques — toutes époques',
    match: (p) => ['Espagnole', 'Argentine', 'Uruguayenne', 'Mexicaine', 'Portugaise'].includes(p.nationalite ?? ''),
  },
};
