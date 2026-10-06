/* Titres et descriptions des pages pour les moteurs de recherche.
   Les données (xlsx) écrivent les noms de famille en capitales (« Emmanuel
   KANT ») et les dates sous des formes variées : on produit ici une version
   propre pour Google, sans toucher à l'affichage des pages. */

export const SITE_NAME = 'LaPhilo.fr';

export const withBrand = (title: string) => `${title} | ${SITE_NAME}`;

/* Limites de Google et de Bing : titre ≤ 60 caractères, description 25 à 155 */
export const TITRE_MAX = 60;
export const DESCRIPTION_MAX = 155;
/** Le premier titre candidat qui tient, sinon le dernier coupé au dernier mot entier. */
const premierQuiTient = (candidats: string[]) =>
  candidats.find((t) => t.length <= TITRE_MAX) ?? clip(candidats[candidats.length - 1], TITRE_MAX);

/** Titre de page ≤ 60 caractères : on raccourcit pas à pas (parenthèses, « de toutes les époques »,
    « frise chronologique » → « frise »), avec « | LaPhilo.fr » tant que la place le permet. */
export function titreSeo(texte: string): string {
  const v1 = texte.replace(/\s*\([^)]*\)/g, '');
  const v2 = v1.replace(/ (de toutes les époques|et de tous les pays|de toutes les époques et de tous les pays)/g, '');
  const v3 = v2.replace(/ : frise chronologique$/, ' : frise');
  return premierQuiTient([texte, v1, v2, v3].flatMap((v) => [withBrand(v), v]));
}

/** Description ≤ 155 caractères : sans le libellé répété en tête s'il fait déborder, puis coupée au dernier mot. */
export function descriptionSeo(libelle: string, texte: string): string {
  const avec = texte.toLowerCase().startsWith(libelle.toLowerCase()) ? texte : `${libelle} — ${texte}`;
  return clip(avec.length <= DESCRIPTION_MAX ? avec : texte, DESCRIPTION_MAX);
}

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

/** « Emmanuel KANT » → « Emmanuel Kant », « Nicolas D'AUTRECOURT » → « Nicolas d'Autrecourt ». */
export function prettyName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .map((word, i) => {
      if (NAME_FIXES[word]) return NAME_FIXES[word];
      // « d'HOLBACH », « d'ACQUASPARTA » : particule en minuscule, nom en capitales
      const part = word.match(/^([dl]')(\p{Lu}[\p{Lu}-]+)$/u);
      if (part) return part[1] + part[2].split('-').map(capitalize).join('-');
      // Seuls les mots entièrement en capitales sont retouchés.
      if (word !== word.toUpperCase() || !/\p{L}{2}/u.test(word)) return word;
      // Numéro de règne (Jean XXIII), jamais en tête : « LI Zehou » est un nom.
      if (i > 0 && ROMAN.test(word)) return word;
      if (i > 0 && PARTICLES.has(word.toLowerCase())) return word.toLowerCase();
      return word
        .split('-')
        .map((part) =>
          part
            .split("'")
            .map((seg, j, segs) => (j === 0 && segs.length > 1 && seg.length === 1 && i > 0 ? seg.toLowerCase()
              // après une apostrophe interne (« ASH'ARI ») : minuscule ; « O'NEILL », « D'AQUIN » gardent la capitale
              : j > 0 && segs[j - 1].length > 1 ? seg.toLowerCase() : capitalize(seg)))
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

/** Texte brut : les xlsx contiennent parfois « &amp; » ou des balises (<em>),
    qui seraient sinon ré-échappés et affichés tels quels dans Google. */
export function plainText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Première lettre en majuscule, espaces normalisés, point final. */
export function sentence(text: string): string {
  const t = plainText(text).replace(/\s+/g, ' ').replace(/\s+([,.])/g, '$1').trim();
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
  // Du plus complet au plus court : « vie et pensée » et la marque seulement s'ils tiennent.
  const title = premierQuiTient([withBrand(`${head} : vie et pensée`), withBrand(head), head, withBrand(name), name]);

  // On n'annonce que les médias réellement présents sur la fiche.
  const video = Boolean(p.yt_id);
  const podcast = /<audio/i.test(p.text);
  const media = video && podcast ? ' en vidéo et en podcast' : video ? ' en vidéo' : podcast ? ' en podcast' : '';
  const suffix = ` Sa vie et sa pensée${media}.`;
  const summary = p.description ? sentence(p.description) : '';
  const description = summary
    ? `${head} : ${lowerFirst(clip(summary, DESCRIPTION_MAX - head.length - 3 - suffix.length))}${suffix}`
    : `${head} :${suffix.toLowerCase()}`;
  return { name, title, description: clip(description, DESCRIPTION_MAX) };
}

interface CourantData {
  name: string;
  display_date: string;
  description?: string;
}

export function courantSeo(c: CourantData, philosophes: string[]) {
  // Du plus complet au plus court, on garde le premier qui tient en 60 caractères.
  const title = premierQuiTient([
    ...(philosophes.length ? [withBrand(`${c.name} : définition et philosophes`)] : []),
    withBrand(`${c.name} : définition`),
    `${c.name} : définition`,
    withBrand(c.name),
    c.name,
  ]);
  const summary = c.description ? sentence(c.description) : '';
  // Trois représentants au plus, moins si la description y perdrait trop (au moins 70 caractères de résumé)
  const head = `${c.name} (${c.display_date.trim()})`;
  const qui = (n: number) => (n && philosophes.length
    ? ` Philosophes : ${philosophes.slice(0, n).map(prettyName).join(', ')}${philosophes.length > n ? '…' : '.'}` : '');
  let n = Math.min(3, philosophes.length);
  while (n > 0 && summary && DESCRIPTION_MAX - head.length - 3 - qui(n).length < 70) n--;
  const who = qui(n);
  const description = summary
    ? `${head} : ${lowerFirst(clip(summary, DESCRIPTION_MAX - head.length - 3 - who.length))}${who}`
    : `${head} :${who}`;
  return { title, description: clip(description, DESCRIPTION_MAX) };
}
