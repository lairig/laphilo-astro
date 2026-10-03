// Sujets de travail des philosophes vivants : colonne « Thèmes » des deux
// xlsx d'actifs (codes vérifiés par THEMES dans scripts/build-data.py).
// Chaque thème a sa frise virtuelle « vivants-<code> » ; la même liste est
// reprise dans public/js/search-full.js (pastilles « Sujet de travail »).

export interface ThemeVivants {
  code: string;
  label: string;
  /** Titre de la page de la frise (balise <title>) */
  seoTitle: string;
}

export const themesVivants: ThemeVivants[] = [
  { code: 'esprit-ia', label: 'Esprit, IA & technique', seoTitle: "Philosophes vivants de l'esprit, de l'intelligence artificielle et de la technique : frise chronologique" },
  { code: 'ecologie', label: 'Écologie & vivant', seoTitle: "Philosophes vivants de l'écologie, du vivant et de la cause animale : frise chronologique" },
  { code: 'justice', label: 'Justice & démocratie', seoTitle: 'Philosophes vivants de la justice, de la démocratie et du droit : frise chronologique' },
  { code: 'critique', label: 'Critique sociale & capitalisme', seoTitle: 'Philosophes vivants de la critique sociale et du capitalisme : frise chronologique' },
  { code: 'genre', label: 'Féminisme & genre', seoTitle: 'Philosophes vivants du féminisme et du genre : frise chronologique' },
  { code: 'decolonial', label: 'Décolonisation & pensées du Sud', seoTitle: 'Philosophes vivants de la décolonisation et des pensées du Sud : frise chronologique' },
  { code: 'sens', label: 'Sens & spiritualité', seoTitle: 'Philosophes vivants du sens, de la religion et de la spiritualité : frise chronologique' },
  { code: 'reel', label: 'Réel & connaissance', seoTitle: 'Philosophes vivants du réel, de la connaissance et de la logique : frise chronologique' },
  { code: 'art', label: 'Art & esthétique', seoTitle: "Philosophes vivants de l'art, de l'image et de l'esthétique : frise chronologique" },
  { code: 'continental', label: 'Héritiers de la pensée continentale', seoTitle: 'Philosophes vivants héritiers de la pensée continentale (phénoménologie, herméneutique, déconstruction) : frise chronologique' },
];

export const friseDuTheme = (code: string) => `vivants-${code}`;
