// Reprend les tables URL_FILTERS/BADGE_MAP/COLOR_FILTERS/URL_TO_EPOQUE de
// js/search.js, adaptées aux frise_source des collections Astro (remplace
// les anciens chemins /frise-*.html).

export interface FriseMeta {
  epoque: 'actuels' | 'antiquite' | 'moyenage' | 'renaissance' | 'modernes';
  badgeFr: string;
  badgeEn: string;
  badgeCls: string;
  colorFilter?: string; // valeur de COLOR_FILTERS pour les philosophes
  isOriental?: boolean;
  isRusse?: boolean;
}

export const philosopheFriseMeta: Record<string, FriseMeta> = {
  'contemporains-monde': { epoque: 'actuels', badgeFr: 'Actuels', badgeEn: 'Living', badgeCls: 'actuels', colorFilter: 'live' },
  'france-contemporains': { epoque: 'actuels', badgeFr: 'Actuels · France', badgeEn: 'Living · France', badgeCls: 'actuels', colorFilter: 'live' },
  'greco-romains': { epoque: 'antiquite', badgeFr: 'Antiquité', badgeEn: 'Antiquity', badgeCls: 'antiquite', colorFilter: 'greco' },
  medievaux: { epoque: 'moyenage', badgeFr: 'Moyen Âge', badgeEn: 'Medieval', badgeCls: 'moyenage', colorFilter: 'medieval' },
  'renaissance-lumieres': { epoque: 'renaissance', badgeFr: 'Renaissance', badgeEn: 'Renaissance', badgeCls: 'renaissance', colorFilter: 'renaissance' },
  modernes: { epoque: 'modernes', badgeFr: 'Modernes', badgeEn: 'Modern', badgeCls: 'modernes', colorFilter: 'moderne' },
  france: { epoque: 'modernes', badgeFr: 'France', badgeEn: 'France', badgeCls: 'francais', colorFilter: 'france' },
  allemands: { epoque: 'modernes', badgeFr: 'Allemands', badgeEn: 'German', badgeCls: 'allemands', colorFilter: 'allemand' },
  americains: { epoque: 'modernes', badgeFr: 'Américains', badgeEn: 'American', badgeCls: 'americains', colorFilter: 'americain' },
  russes: { epoque: 'modernes', badgeFr: 'Russes', badgeEn: 'Russian', badgeCls: 'russes', colorFilter: 'russe', isRusse: true },
  orientaux: { epoque: 'modernes', badgeFr: 'Orientaux', badgeEn: 'Eastern', badgeCls: 'orientaux', colorFilter: 'oriental', isOriental: true },
};

export const courantFriseMeta: Record<string, FriseMeta> = {
  occidental: { epoque: 'modernes', badgeFr: 'Courant occidental', badgeEn: 'Western school', badgeCls: 'courant-occ' },
  oriental: { epoque: 'modernes', badgeFr: 'Courant oriental', badgeEn: 'Eastern school', badgeCls: 'courant-ori' },
};

// _epoqueFromDate() de search.js : pour les courants et les philosophes
// orientaux, l'époque est recalculée depuis l'année plutôt que fixée par frise.
export function epoqueFromYear(year: number): FriseMeta['epoque'] {
  if (year < 500) return 'antiquite';
  if (year < 1400) return 'moyenage';
  if (year < 1700) return 'renaissance';
  if (year < 1940) return 'modernes';
  return 'actuels';
}

// BRANCH_MAP de search.js : courant -> branche philosophique (philosophes).
export const BRANCH_MAP: Record<string, string[]> = {
  politique: ['Libéralisme', 'Conservatisme', 'Anarchisme', 'Marxisme', 'Contractualisme',
    'Progressisme', 'Populisme', 'Anticolonialisme', 'Tiers-mondisme', 'Libertarisme',
    'Saint-Simonisme', 'Keynésianisme', 'Wokisme', 'Moïsme', 'Légisme',
    'Pan-africanisme', 'Gandhisme', 'Philosophie Dalit', 'Négritude', 'Ubuntu',
    'Rousseauisme', 'Utopisme'],
  ethique: ['Hédonisme', 'Stoïcisme', 'Épicurisme', 'Cynisme', 'Cyrénaïsme', 'Utilitarisme',
    'Existentialisme', 'Nihilisme', 'Antinatalisme', 'Pessimisme', 'Romantisme',
    'Bouddhisme', 'Bouddhisme Theravada', 'Bouddhisme Mahayana', 'Bouddhisme Zen',
    'Vajrayana', 'Bushido', 'Jaïnisme', 'Gandhisme', 'Soufisme'],
  metaphysique: ['Platonisme', 'Idéalisme', 'Matérialisme', 'Dualisme', 'Monisme', 'Naturalisme',
    'Réalisme', 'Nominalisme', 'Conceptualisme', 'Thomisme', 'Néoplatonisme',
    'Augustinisme', 'Panéntéisme', 'Panthéisme', 'Immatérialisme', 'Spiritualisme',
    'Pluralisme', 'Ontologie Orientée Objet', 'Meinongianisme', 'Méréologie',
    'Dataïsme', 'Hindouisme', 'Védanta', 'Advaïta Védanta', 'Sâmkhya', 'Vaisheshika',
    'Taoïsme', 'Shintoïsme', 'Zoroastrisme', 'Mysticisme', 'Martinisme'],
  epistemologie: ['Empirisme', 'Rationalisme', 'Scepticisme', 'Pragmatisme', 'Analytique',
    'Positivisme', 'Positivisme Logique', 'Relativisme', 'Structuralisme',
    'Phénoménologie', 'Herméneutique', 'Déconstructionnisme', 'Post-structuralisme',
    'Post Modernisme', 'French Theory', 'Computationnalisme', 'Connexionnisme',
    'Nouveau réalisme', 'Perspectivisme', 'Solipsisme',
    'Essentialisme', 'Fonctionnalisme', 'Mobilisme', 'Présocratique', 'Atomisme',
    'Nyâya', 'Mimamsa', 'École des Noms',
    'Falsificationnisme', 'Constructivisme', 'Eliminativisme', 'Criticisme'],
  spiritualite: ['Néoplatonisme', 'Patristique', 'Augustinisme', 'Scolastique', 'Thomisme',
    'Scotisme', 'Néothomisme', 'Averroïsme', 'Modiste', 'Monothélisme',
    'Œcuménisme', 'Pérénnialisme', 'Anthroposophie', 'Illuminisme', 'Ishraqisme',
    'Mutazilisme', 'Acharisme', 'Falsafa', 'Soufisme', 'Hindouisme', 'Mysticisme',
    'Zoroastrisme', 'Bouddhisme', 'Jaïnisme', 'Ajīvika', 'Shintoïsme',
    'Confucianisme', 'Néoconfucianisme', 'Taoïsme', 'Kokugaku', 'Martinisme',
    'Égypte antique'],
  esthetique: ['Romantisme', 'Symbolisme', 'Idéalisme allemand', 'Existentialisme',
    'Phénoménologie', 'Structuralisme', 'Post-structuralisme', 'Post Modernisme',
    'Théorie Critique', 'Pérennialisme', 'Spiritualisme', 'Mysticisme'],
  langage: ['Analytique', 'Herméneutique', 'Phénoménologie', 'Structuralisme',
    'Sophisme', 'Nominalisme', 'Pragmatisme'],
  logique: ['Analytique', 'Positivisme Logique', 'Stoïcisme', 'Aristotélisme',
    'Présocratique', 'Socratisme', 'Scolastique', 'Intuitivisme'],
};

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

const BRANCH_NORM: Record<string, string> = {};
for (const [branch, names] of Object.entries(BRANCH_MAP)) {
  for (const name of names) BRANCH_NORM[normalizeKey(name)] = branch;
}

export function branchOfCourant(courantName: string): string | null {
  return BRANCH_NORM[normalizeKey(courantName)] || null;
}

// CUR_FAMILY_MAP de search.js : courant -> famille (couleur du badge courant).
export const CUR_FAMILY_MAP: Record<string, string[]> = {
  antiquite: ['Présocratique', 'Socratisme', 'Sophisme', 'Platonisme', 'Aristotélisme',
    'Stoïcisme', 'Epicurisme', 'Cynisme', 'Cyrénaïsme', 'Scepticisme',
    'Atomisme', 'Eclectisme', 'Egypte antique', 'Mobilisme', 'Hédonisme'],
  religieux: ['Bouddhisme', 'Bouddhisme Mahayana', 'Bouddhisme Zen', 'Vajrayana',
    'Hindouisme', 'Advaïta Védanta', 'Védanta', 'Jaïnisme', 'Soufisme',
    'Falsafa', 'Ishraqisme', 'Herméneutique juive', 'Hermétisme',
    'Mysticisme', 'Mysticisme mésoaméricain', 'Mystérianisme', 'Hésychasme',
    'Théosophisme', 'Anthroposophie', 'Martinisme', 'Panthéisme',
    'Panenthéisme', 'Déisme', 'Athéisme', 'Zoroastrisme', 'Mazdakisme',
    'Brahmoïsme', 'Gandhisme', 'Réforme', 'Pérennialisme', 'Spiritualisme',
    'Confucianisme', 'Néoconfucianisme', 'Taoïsme', 'Moïsme', 'Légisme'],
  scolastique: ['Scolastique', 'Thomisme', 'Néothomisme', 'Scotisme', 'Avérroïsme',
    'Patristique', 'Occasionalisme', 'Néoplatonisme'],
  rationalisme: ['Rationalisme', 'Idéalisme', 'Idéalisme allemand', 'Criticisme',
    'Immatérialisme', 'Monisme', 'Objectivisme', 'Réalisme',
    'Nouveau réalisme', 'Nominalisme', 'Méréologie', 'Meinongianisme'],
  empirisme: ['Empirisme', 'Analytique', 'Positivisme', 'Positivisme Logique',
    'Positivisme logique', 'Falsificationnisme', 'Pragmatisme',
    'Fonctionnalisme', 'Eliminativisme', 'Naturalisme', 'Matérialisme',
    'Logique paraconsistante', 'Ontologie Orientée Objet', 'Perspectivisme',
    'Constructivisme'],
  politique: ['Marxisme', 'Anarchisme', 'Anarcho-Capitalisme', 'Libéralisme',
    'Libertarianisme', 'Conservatisme', 'Populisme', 'Utopisme',
    'Contractualisme', 'Communautarisme', 'Ecologisme', 'Féminisme',
    'Anticolonialisme', 'Pan-africanisme', 'Pan-islamisme', 'Négritude',
    'Tiers-mondisme', 'Ubuntu', 'Biopolitique', 'Keynésianisme',
    'Théorie Critique', 'Théorie critique', 'Slavophilisme',
    'Occidentalisme', 'Orientalisme', 'Cosmisme', 'Volontarisme',
    'Utilitarisme', 'Humanisme'],
  contemporain: ['Existentialisme', 'Phénoménologie', 'Herméneutique',
    'Post-structuralisme', 'Structuralisme', 'Déconstructionnisme',
    'Post Modernisme', 'Psychanalyse', 'Nihilisme', 'Pessimisme',
    'Antinatalisme', 'Vitalisme', 'Transhumanisme', 'Accélérationnisme',
    'Symbolisme', 'Romantisme', 'Transcendantalisme', 'Néo-kantisme', 'Absurde'],
};

const CUR_FAMILY_NORM: Record<string, string> = {};
for (const [fam, names] of Object.entries(CUR_FAMILY_MAP)) {
  for (const name of names) CUR_FAMILY_NORM[normalizeKey(name)] = fam;
}

export function curFamily(courantName: string): string {
  return CUR_FAMILY_NORM[normalizeKey(courantName)] || '';
}

// COLOR_FILTERS de search.js : pastilles de filtre par frise (philosophes).
export const COLOR_FILTERS = [
  { v: 'live', fr: 'Vivants', en: 'Living', grad: '#f0b400' },
  { v: 'medieval', fr: 'Médiévaux', en: 'Medieval', grad: '#e06414' },
  { v: 'greco', fr: 'Gréco-romains', en: 'Greco-Roman', grad: '#d21e1e' },
  { v: 'oriental', fr: 'Orientaux', en: 'Eastern', grad: '#1e8c3c' },
  { v: 'renaissance', fr: 'Renaissance', en: 'Renaissance', grad: '#1464d2' },
  { v: 'moderne', fr: 'Modernes', en: 'Modern', grad: 'linear-gradient(180deg,#f0b400 50%,#e8508c 50%)' },
  { v: 'france', fr: 'Français', en: 'French', grad: 'linear-gradient(180deg,#d21e1e 50%,#1464d2 50%)' },
  { v: 'russe', fr: 'Russes', en: 'Russian', grad: 'linear-gradient(180deg,#f0b400 50%,#d21e1e 50%)' },
  { v: 'americain', fr: 'Américains', en: 'American', grad: 'linear-gradient(180deg,#f7f4ea 50%,#1464d2 50%)' },
  { v: 'allemand', fr: 'Allemands', en: 'German', grad: 'linear-gradient(180deg,#d0d0d0 50%,#0a0a0a 50%)' },
];

// COURANT_COLOR_FILTERS de search.js : pastilles de filtre par origine (courants).
export const COURANT_COLOR_FILTERS = [
  { v: 'courant-occ', fr: 'Occidental', en: 'Western', grad: '#0e6882' },
  { v: 'courant-ori', fr: 'Oriental', en: 'Eastern', grad: '#6e2e9a' },
];

// COURANT_SUBERAS de search.js : sous-groupes d'époque par origine.
export const COURANT_SUBERAS: Record<string, { v: string; fr: string; en: string; epoques: string[] }[]> = {
  'courant-occ': [
    { v: 'actuel', fr: 'Actuel', en: 'Living', epoques: ['actuels'] },
    { v: 'moderne', fr: 'Moderne', en: 'Modern', epoques: ['renaissance', 'modernes'] },
    { v: 'antique', fr: 'Antique', en: 'Ancient', epoques: ['antiquite', 'moyenage'] },
  ],
  'courant-ori': [
    { v: 'moderne', fr: 'Moderne', en: 'Modern', epoques: ['modernes', 'actuels'] },
    { v: 'ancien', fr: 'Ancien', en: 'Ancient', epoques: ['antiquite', 'moyenage', 'renaissance'] },
  ],
};
