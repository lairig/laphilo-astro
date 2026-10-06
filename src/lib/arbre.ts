/* Un nœud de l'arbre (composant Arbre.astro) : branche si elle a des enfants, sinon feuille */
export type Noeud = {
  label: string;
  href?: string;
  note?: string;       // date, nombre… en italique à droite du nom
  detail?: string;     // seconde ligne discrète (ex. « issu du Cynisme »), sur les feuilles
  enfants?: Noeud[];
  ouvert?: boolean;    // branche ouverte au chargement
  fiche?: boolean;     // feuille = fiche de philosophe ou de courant
  id?: string;         // ancre (ex. #debats) : la branche est ouverte si l'adresse la vise
};
