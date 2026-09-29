// Frises "virtuelles" : pas de frise_source propre, elles regroupent des fiches
// de plusieurs frises réelles selon une règle.

interface PhilosopheData {
  name: string;
  nationalite?: string;
  traditions?: string[];
  groupe?: string;
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
    match: (p) => ['Égyptienne', 'Camerounaise', 'Ghanéenne', 'Sénégalaise', 'Nigériane', 'Congolaise', 'Béninoise', 'Éthiopienne', 'Sud-Africaine'].includes(p.nationalite ?? ''),
  },
  'hispaniques-toutes-epoques': {
    label: 'Philosophes hispaniques — toutes époques',
    match: (p) => ['Espagnole', 'Argentine', 'Uruguayenne', 'Mexicaine', 'Portugaise', 'Vénézuélienne', 'Péruvienne', 'Brésilienne'].includes(p.nationalite ?? ''),
  },
  /* Colonne « Traditions » des xlsx (valeur « femme ») */
  'femmes-toutes-epoques': {
    label: 'Philosophes femmes — toutes époques',
    match: (p) => (p.traditions ?? []).includes('femme'),
  },
  /* Colonne « Groupe » des xlsx : Égypte, Mésopotamie, Perse antiques, sagesse biblique */
  'proche-orient-ancien-toutes-epoques': {
    label: 'Philosophes du Proche-Orient ancien — toutes époques',
    match: (p) => p.groupe === 'orient-ancien',
  },
  'grecs-byzantins-toutes-epoques': {
    label: 'Philosophes grecs et byzantins — toutes époques',
    match: (p) => ['Grecque', 'Byzantine'].includes(p.nationalite ?? ''),
  },
  /* Sous-continent indien : Iqbal (Pakistan) et Coomaraswamy (Sri Lanka) sont nés dans l'Inde britannique */
  'indiens-toutes-epoques': {
    label: "Philosophes de l'Inde — toutes époques",
    match: (p) => ['Indienne', 'Pakistanaise', 'Sri-lankaise'].includes(p.nationalite ?? ''),
  },
  'chinois-toutes-epoques': {
    label: 'Philosophes chinois — toutes époques',
    match: (p) => (p.nationalite ?? '') === 'Chinoise',
  },
  /* Colonne « Traditions » des xlsx (valeur « juive »), quelle que soit la nationalité */
  'pensee-juive-toutes-epoques': {
    label: 'Philosophes juifs — toutes époques',
    match: (p) => (p.traditions ?? []).includes('juive'),
  },
};
