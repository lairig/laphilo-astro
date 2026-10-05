// Frises "virtuelles" : pas de frise_source propre, elles regroupent des fiches
// de plusieurs frises réelles selon une règle.

import { themesVivants, friseDuTheme } from './themes-vivants';

interface PhilosopheData {
  name: string;
  nationalite?: string;
  traditions?: string[];
  themes?: string[];
  groupe?: string;
  year?: number | string;
  frise_source: string;
}

/* Philosophes en activité : les deux frises « contemporains » (même règle que
   le bouton « Vivants uniquement » de la recherche, champ live de l'index). */
const vivant = (p: PhilosopheData) => ['france-contemporains', 'contemporains-monde'].includes(p.frise_source);

/* Contemporains hors France, par grande région (nationalité) ; une nationalité
   absente de ces listes reste seulement dans « contemporains-monde ». */
/* Penseur de l'époque moderne : né de 1700 à 1935, hors frises des contemporains */
const moderneHorsOccident = (p: PhilosopheData) => Number(p.year) >= 1700 && Number(p.year) <= 1935 && !vivant(p);

export const regionsContemporains: { slug: string; label: string; nats: string[] }[] = [
  { slug: 'contemporains-europe', label: 'Europe', nats: ['Britannique', 'Irlandaise', 'Allemande', 'Autrichienne', 'Suisse', 'Italienne', 'Espagnole', 'Portugaise', 'Belge', 'Néerlandaise', 'Luxembourgeoise', 'Danoise', 'Suédoise', 'Norvégienne', 'Finlandaise', 'Islandaise', 'Polonaise', 'Tchèque', 'Slovaque', 'Hongroise', 'Roumaine', 'Bulgare', 'Slovène', 'Croate', 'Serbe', 'Grecque', 'Russe', 'Ukrainienne', 'Lettone', 'Lituanienne', 'Estonienne'] },
  { slug: 'contemporains-ameriques', label: 'Amériques', nats: ['Américaine', 'Canadienne', 'Mexicaine', 'Argentine', 'Uruguayenne', 'Brésilienne', 'Chilienne', 'Colombienne', 'Péruvienne', 'Vénézuélienne', 'Cubaine', 'Haïtienne', 'Martiniquaise'] },
  { slug: 'contemporains-afrique-moyen-orient', label: 'Afrique & Moyen-Orient', nats: ['Camerounaise', 'Sénégalaise', 'Ghanéenne', 'Sud-Africaine', 'Nigériane', 'Congolaise', 'Ivoirienne', 'Béninoise', 'Kényane', 'Éthiopienne', 'Tunisienne', 'Marocaine', 'Algérienne', 'Égyptienne', 'Libanaise', 'Syrienne', 'Perse', 'Iranienne', 'Turque', 'Israélienne', 'Palestinienne', 'Irakienne'] },
  { slug: 'contemporains-asie-oceanie', label: 'Asie & Océanie', nats: ['Japonaise', 'Chinoise', 'Coréenne', 'Taïwanaise', 'Vietnamienne', 'Indienne', 'Pakistanaise', 'Bangladaise', 'Sri-lankaise', 'Indonésienne', 'Philippine', 'Malaisienne', 'Singapourienne', 'Thaïlandaise', 'Australienne', 'Néo-zélandaise'] },
];

/* Nationalités du monde arabe (frise monde-arabe-toutes-epoques ; même liste dans search-full.js) */
const NATS_ARABES = ['Arabe', 'Égyptienne', 'Syrienne', 'Libanaise', 'Irakienne', 'Palestinienne', 'Jordanienne', 'Saoudienne', 'Yéménite', 'Marocaine', 'Algérienne', 'Tunisienne', 'Libyenne', 'Soudanaise', 'Mauritanienne'];

export interface VirtualFrise {
  label: string;
  match: (p: PhilosopheData) => boolean;
}

export const virtualPhilosopheFrises: Record<string, VirtualFrise> = {
  'francais-toutes-epoques': {
    label: 'Philosophes français — toutes époques',
    /* + les Suisses francophones (exclus des germanophones) */
    match: (p) => p.nationalite === 'Française' || ['Jean Jacques ROUSSEAU', 'Charles BONNET', 'Charles SECRÉTAN'].includes(p.name),
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
    label: 'Philosophes britanniques et du Commonwealth — toutes époques',
    match: (p) => ['Britannique', 'Canadienne', 'Australienne', 'Irlandaise', 'Néo-zélandaise'].includes(p.nationalite ?? '')
      || (p.nationalite === 'Sud-Africaine' && p.groupe === 'occident'),
  },
  'italiens-toutes-epoques': {
    label: 'Philosophes italiens et romains — toutes époques',
    match: (p) => ['Italienne', 'Romaine'].includes(p.nationalite ?? ''),
  },
  /* Benelux, Scandinavie, Europe centrale */
  'europe-nord-centrale-toutes-epoques': {
    label: "Philosophes d'Europe du Nord et centrale — toutes époques",
    match: (p) => ['Belge', 'Néerlandaise', 'Luxembourgeoise', 'Danoise', 'Suédoise', 'Norvégienne', 'Finlandaise', 'Islandaise', 'Tchèque', 'Polonaise', 'Hongroise', 'Roumaine', 'Slovène', 'Slovaque', 'Croate', 'Serbe', 'Bulgare', 'Lettone', 'Lituanienne', 'Estonienne'].includes(p.nationalite ?? ''),
  },
  'germanophones-toutes-epoques': {
    label: 'Philosophes germanophones — toutes époques',
    match: (p) => ['Allemande', 'Autrichienne', 'Suisse'].includes(p.nationalite ?? '') && !['Jean Jacques ROUSSEAU', 'Charles BONNET', 'Charles SECRÉTAN'].includes(p.name),
  },
  /* Colonne « Groupe » (islam-juif), sans les penseurs juifs qui ont leur propre frise ; remplace « arabo-persans » */
  'monde-islamique-toutes-epoques': {
    label: 'Philosophes du monde islamique — toutes époques',
    match: (p) => p.groupe === 'islam-juif' && !(p.traditions ?? []).includes('juive'),
  },
  /* Colonne « Groupe » : Afrique, Amérique latine, Caraïbes, Amériques indigènes (remplace « Africains ») */
  'pensees-du-sud-toutes-epoques': {
    label: 'Pensées du Sud et de la décolonisation — toutes époques',
    match: (p) => p.groupe === 'sud' || (p.traditions ?? []).includes('sud'),
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
    /* + Arméniens, et néoplatoniciens d'Égypte et de Syrie qui écrivaient en grec (groupe occident) */
    match: (p) => ['Grecque', 'Byzantine', 'Arménienne'].includes(p.nationalite ?? '')
      || (['Égyptienne', 'Syrienne'].includes(p.nationalite ?? '') && p.groupe === 'occident'),
  },
  /* Colonne « Groupe » : Inde, Tibet, Sri Lanka, Asie du Sud-Est continentale (remplace « Indiens ») */
  'inde-bouddhisme-toutes-epoques': {
    label: "Philosophes de l'Inde et du monde bouddhiste — toutes époques",
    match: (p) => p.groupe === 'inde' || (p.traditions ?? []).includes('inde'),
  },
  /* Colonne « Groupe » : la pensée russe (≠ nationalité, cf. russes-toutes-epoques) */
  'pensee-russe-toutes-epoques': {
    label: 'La pensée russe — toutes époques',
    match: (p) => p.groupe === 'russe' || (p.traditions ?? []).includes('russe'),
  },
  /* Colonne « Groupe » : Chine, Japon, Corée, Vietnam (remplace l'ancienne frise des Chinois) */
  'asie-est-toutes-epoques': {
    label: "Philosophes d'Asie de l'Est — toutes époques",
    match: (p) => p.groupe === 'asie-est' || (p.traditions ?? []).includes('asie-est'),
  },
  /* « Autres philosophes modernes » (frise modernes) découpés en 4 zones */
  'modernes-europe-nord-centrale': {
    label: "Philosophes modernes d'Europe du Nord et centrale",
    match: (p) => p.frise_source === 'modernes' && ['Britannique', 'Irlandaise', 'Australienne', 'Autrichienne', 'Suisse', 'Belge', 'Néerlandaise', 'Danoise', 'Suédoise', 'Norvégienne', 'Finlandaise', 'Polonaise', 'Tchèque', 'Slovaque', 'Hongroise', 'Roumaine', 'Lettone', 'Lituanienne', 'Estonienne', 'Slovène', 'Croate', 'Serbe', 'Bulgare'].includes(p.nationalite ?? ''),
  },
  'modernes-europe-sud': {
    label: "Philosophes modernes d'Europe du Sud",
    match: (p) => p.frise_source === 'modernes' && ['Espagnole', 'Portugaise', 'Italienne', 'Grecque'].includes(p.nationalite ?? ''),
  },
  /* Époque moderne hors Occident (nés de 1700 à 1935, hors frises des contemporains) */
  'modernes-asie': {
    label: "Philosophes modernes d'Asie",
    match: (p) => moderneHorsOccident(p) && ['inde', 'asie-est', 'asie-se'].includes(p.groupe ?? ''),
  },
  'modernes-islam-sud': {
    label: 'Philosophes modernes : islam et pensées du Sud',
    match: (p) => moderneHorsOccident(p) && ((p.groupe === 'islam-juif' && !(p.traditions ?? []).includes('juive')) || p.groupe === 'sud'),
  },
  /* Toute l'époque moderne sauf la France : réunion des autres cartes « Modernes » de /frises/ */
  'modernes-monde': {
    label: 'Philosophes modernes du monde entier (hors France)',
    match: (p) => ['allemands', 'russes', 'americains', 'modernes'].includes(p.frise_source)
      || (moderneHorsOccident(p) && (['inde', 'asie-est', 'asie-se', 'sud'].includes(p.groupe ?? '')
        || (p.groupe === 'islam-juif' && !(p.traditions ?? []).includes('juive')))),
  },
  /* Pays d'Asie (nationalité) : en plus des grandes traditions Inde et Asie de l'Est */
  'indiens-toutes-epoques': {
    label: "Philosophes de l'Inde — toutes époques",
    match: (p) => p.nationalite === 'Indienne',
  },
  'chinois-toutes-epoques': {
    label: 'Philosophes chinois — toutes époques',
    match: (p) => p.nationalite === 'Chinoise',
  },
  'coreens-toutes-epoques': {
    label: 'Philosophes coréens — toutes époques',
    match: (p) => p.nationalite === 'Coréenne',
  },
  'japonais-toutes-epoques': {
    label: 'Philosophes japonais — toutes époques',
    match: (p) => p.nationalite === 'Japonaise',
  },
  /* Monde arabe : nationalités arabes dans la tradition islamique (Groupe islam-juif), ce qui
     écarte l'Égypte pharaonique et les néoplatoniciens grecs de Syrie ; plus Edward Saïd,
     Palestinien de naissance. Même règle que la pastille « Monde arabe » de la recherche. */
  'monde-arabe-toutes-epoques': {
    label: 'Philosophes du monde arabe — toutes époques',
    match: (p) => (p.groupe === 'islam-juif' && NATS_ARABES.includes(p.nationalite ?? '')) || p.name === 'Edward SAÏD',
  },
  /* Colonne « Traditions » des xlsx (valeur « juive »), quelle que soit la nationalité */
  'pensee-juive-toutes-epoques': {
    label: 'Philosophes juifs — toutes époques',
    match: (p) => (p.traditions ?? []).includes('juive'),
  },
  ...Object.fromEntries(
    regionsContemporains.map((r): [string, VirtualFrise] => [
      r.slug,
      { label: `Philosophes contemporains — ${r.label}`, match: (p) => p.frise_source === 'contemporains-monde' && r.nats.includes(p.nationalite ?? '') },
    ]),
  ),
  /* Philosophes vivants, par sujet de travail (colonne « Thèmes » des xlsx
     d'actifs) ; mêmes règles que les pastilles « Sujet de travail » de la recherche */
  ...Object.fromEntries(
    themesVivants.map((t): [string, VirtualFrise] => [
      friseDuTheme(t.code),
      { label: `Philosophes vivants — ${t.label}`, match: (p) => vivant(p) && (p.themes ?? []).includes(t.code) },
    ]),
  ),
};
