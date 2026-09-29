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
  /* Colonne « Groupe » : Afrique, Amérique latine, Caraïbes, Amériques indigènes (remplace « Africains ») */
  'pensees-du-sud-toutes-epoques': {
    label: 'Pensées du Sud et de la décolonisation — toutes époques',
    match: (p) => p.groupe === 'sud',
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
  /* Colonne « Groupe » : Inde, Tibet, Sri Lanka, Asie du Sud-Est continentale (remplace « Indiens ») */
  'inde-bouddhisme-toutes-epoques': {
    label: "Philosophes de l'Inde et du monde bouddhiste — toutes époques",
    match: (p) => p.groupe === 'inde',
  },
  /* Colonne « Groupe » : Chine, Japon, Corée, Vietnam (remplace l'ancienne frise des Chinois) */
  'asie-est-toutes-epoques': {
    label: "Philosophes d'Asie de l'Est — toutes époques",
    match: (p) => p.groupe === 'asie-est',
  },
  /* Colonne « Traditions » des xlsx (valeur « juive »), quelle que soit la nationalité */
  'pensee-juive-toutes-epoques': {
    label: 'Philosophes juifs — toutes époques',
    match: (p) => (p.traditions ?? []).includes('juive'),
  },
};
