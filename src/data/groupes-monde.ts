// Grandes traditions de la Frise des pensées du monde (colonne « Groupe » des
// xlsx ; mêmes codes que GROUPES dans scripts/build-data.py).

export interface GroupeMonde {
  id: string;
  label: string;
  court: string;
  color: string;
  description: string;
}

export const groupesMonde: GroupeMonde[] = [
  {
    id: 'orient-ancien', label: 'Le Proche-Orient ancien', court: 'Proche-Orient ancien', color: '#bfae93',
    description: "Égypte, Mésopotamie et Perse antiques : les premières sagesses écrites, sur la justice, l'ordre du monde et le sens de la vie.",
  },
  {
    id: 'occident', label: "L'Occident", court: 'Occident', color: '#d4a843',
    description: "De la Grèce antique à la philosophie moderne et contemporaine : la raison, le concept, la connaissance et le sujet.",
  },
  {
    id: 'islam-juif', label: 'Le monde islamique et juif', court: 'Islam & judaïsme', color: '#3fb0a6',
    description: "Philosophies de langue arabe, persane et hébraïque, qui ont repris l'héritage grec en dialogue avec la révélation : foi et raison, Dieu, prophétie, société.",
  },
  {
    id: 'inde', label: "L'Inde et le monde bouddhiste du Sud", court: 'Inde & bouddhisme', color: '#c77dba',
    description: "Védas, Upanishad, bouddhisme et jaïnisme, de l'Inde au Tibet et à l'Asie du Sud-Est : le soi, la souffrance, la libération, la conscience.",
  },
  {
    id: 'asie-est', label: "L'Asie de l'Est", court: 'Asie de l’Est', color: '#e0693c',
    description: "Chine, Corée, Japon et Vietnam : confucianisme, taoïsme et bouddhisme zen, autour de l'harmonie, de la vertu et de la voie.",
  },
  {
    id: 'asie-se', label: "L'Asie du Sud-Est insulaire", court: 'Asie du Sud-Est', color: '#e3a3c0',
    description: "Indonésie, Malaisie, Philippines : héritage hindou-bouddhiste, islam soufi et pensée anticoloniale.",
  },
  {
    id: 'sud', label: 'Les pensées du Sud et de la décolonisation', court: 'Pensées du Sud', color: '#93b84c',
    description: "Afrique subsaharienne, Amériques latine et indigène, Caraïbes : identité, communauté, libération, créolisation.",
  },
  {
    id: 'russe', label: 'La pensée russe', court: 'Pensée russe', color: '#6f9fd8',
    description: "Née au XIXᵉ siècle autour de l'identité de la Russie face à l'Europe : orthodoxie, littérature, sens de l'histoire, liberté.",
  },
];

export const groupeParId = Object.fromEntries(groupesMonde.map((g) => [g.id, g]));
