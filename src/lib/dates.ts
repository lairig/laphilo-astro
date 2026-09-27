/* Dates affichées sur les fiches, calculées depuis les années numériques :
   les xlsx les écrivent sous des formes variées (« -240 AJC   - 182 AJC »). */

const bc = (y: number) => `${-y} av. J.-C.`;

/** 1724 – 1804 · 240 – 182 av. J.-C. · 4 av. J.-C. – 65 · 1967 · 290 av. J.-C. */
export function lifeSpan(year: number, endYear?: number): string {
  if (endYear === undefined) return year < 0 ? bc(year) : `${year}`;
  if (year < 0 && endYear < 0) return `${-year} – ${bc(endYear)}`;
  if (year < 0) return `${bc(year)} – ${endYear}`;
  return `${year} – ${endYear}`;
}
