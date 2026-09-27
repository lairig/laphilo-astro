/* Titres et descriptions des pages pour les moteurs de recherche.
   Les données (xlsx) écrivent les noms de famille en capitales (« Immanuel
   KANT ») et les dates sous des formes variées : on produit ici une version
   propre pour Google, sans toucher à l'affichage des pages. */

export const SITE_NAME = 'LaPhilo.fr';

export const withBrand = (title: string) => `${title} | ${SITE_NAME}`;

/* Noms dont les capitales ne se déduisent pas automatiquement. */
const NAME_FIXES: Record<string, string> = {
  'MC-GINN': 'McGinn',
  'MCORD-ADAMS': 'McCord Adams',
  'LE-BLANC': 'Le Blanc',
  'DE-FUNÈS': 'de Funès',
  'LE-ROY': 'Le Roy',
  'LE-CHANTRE': 'Le Chantre',
};
const PARTICLES = new Set(['de', 'du', 'des', 'von', 'van', 'der', 'den']);
const ROMAN = /^[IVXLC]+$/;

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** « Immanuel KANT » → « Immanuel Kant », « Nicolas D'AUTRECOURT » → « Nicolas d'Autrecourt ». */
export function prettyName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .map((word, i) => {
      if (NAME_FIXES[word]) return NAME_FIXES[word];
      // Seuls les mots entièrement en capitales sont retouchés.
      if (word !== word.toUpperCase() || !/\p{L}{2}/u.test(word)) return word;
      if (ROMAN.test(word)) return word;
      if (i > 0 && PARTICLES.has(word.toLowerCase())) return word.toLowerCase();
      return word
        .split('-')
        .map((part) =>
          part
            .split("'")
            .map((seg, j, segs) => (j === 0 && segs.length > 1 && seg.length === 1 && i > 0 ? seg.toLowerCase() : capitalize(seg)))
            .join("'")
        )
        .join('-');
    })
    .join(' ');
}

const yearLabel = (y: number) => (y < 0 ? `${-y}` : `${y}`);

/** (1724-1804), (240-182 av. J.-C.), (4 av. J.-C.-65), (1967) */
export function lifeDates(year: number, endYear?: number): string {
  if (endYear === undefined) return year < 0 ? `(${-year} av. J.-C.)` : `(${year})`;
  if (year < 0 && endYear < 0) return `(${yearLabel(year)}-${yearLabel(endYear)} av. J.-C.)`;
  if (year < 0) return `(${-year} av. J.-C.-${endYear})`;
  return `(${year}-${endYear})`;
}

/** Coupe au dernier mot entier avant `max` caractères. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '') + '…';
}

/** Première lettre en majuscule, espaces normalisés, point final. */
export function sentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim();
  if (!t) return '';
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

interface PhilosopheData {
  name: string;
  year: number;
  end_year?: number;
  description?: string;
  text: string;
  yt_id?: string;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function philosopheSeo(p: PhilosopheData) {
  const name = prettyName(p.name);
  const head = `${name} ${lifeDates(p.year, p.end_year)}`;
  // « vie et pensée » seulement si le titre reste court (Google coupe vers 60 car.).
  const long = withBrand(`${head} : vie et pensée`);
  const title = long.length <= 65 ? long : withBrand(head);

  // On n'annonce que les médias réellement présents sur la fiche.
  const video = Boolean(p.yt_id);
  const podcast = /<audio/i.test(p.text);
  const media = video && podcast ? ' en vidéo et en podcast' : video ? ' en vidéo' : podcast ? ' en podcast' : '';
  const suffix = ` Sa vie et sa pensée${media}.`;
  const summary = p.description ? sentence(p.description) : '';
  const description = summary
    ? `${head} : ${lowerFirst(clip(summary, 160 - head.length - 3 - suffix.length))}${suffix}`
    : `${head} :${suffix.toLowerCase()}`;
  return { name, title, description };
}

interface CourantData {
  name: string;
  display_date: string;
  description?: string;
}

export function courantSeo(c: CourantData, philosophes: string[]) {
  // Du plus complet au plus court, on garde le premier qui tient en 65 caractères.
  const candidates = [
    ...(philosophes.length ? [`${c.name} : définition et philosophes`] : []),
    `${c.name} : définition`,
    c.name,
  ].map(withBrand);
  const title = candidates.find((t) => t.length <= 65) ?? candidates[candidates.length - 1];
  const summary = c.description ? sentence(c.description) : '';
  const names = philosophes.slice(0, 3).map(prettyName).join(', ');
  const who = philosophes.length ? ` Philosophes : ${names}${philosophes.length > 3 ? '…' : '.'}` : '';
  const head = `${c.name} (${c.display_date.trim()})`;
  const description = summary
    ? `${head} : ${lowerFirst(clip(summary, 160 - head.length - 3 - who.length))}${who}`
    : `${head} :${who}`;
  return { title, description };
}
