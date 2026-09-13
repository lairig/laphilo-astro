# Ajouter un philosophe ou un courant de pensée

## 1. Éditer le xlsx concerné

Les 13 fichiers sources sont dans `data/` (à la racine de `laphilo-astro`),
un par frise :

- `frise-philosophes-greco-romains.xlsx`, `frise-philosophes-medievaux.xlsx`,
  `frise-philosophes-renaissance-lumieres.xlsx`, `frise-philosophes-modernes.xlsx`,
  `frise-philosophes-france.xlsx`, `frise-philosophes-allemands.xlsx`,
  `frise-philosophes-americains.xlsx`, `frise-philosophes-russes.xlsx`,
  `frise-philosophes-orientaux.xlsx`
- `frise-philosophes-france-actif.xlsx` (Français contemporains),
  `frise-philosophes-autre-actif.xlsx` (autres contemporains)
- `frise-courant-pensee-occidental.xlsx`, `frise-courant-pensee-oriental.xlsx`

Ajouter une ligne à la suite des existantes, avec les colonnes habituelles
(Année_naissance, Année_décès, Dates_affichage, Nom, Texte_HTML, YouTube_ID,
Crédit_media, Thumbnail_URL, Image_media, Nationalité, Branche, Courant,
Description...). Mettre `NON` dans la colonne `Actif` pour désactiver une
fiche sans la supprimer.

## 1bis. Ajouter un portrait ou une image (si besoin)

- Portrait miniature (colonne `Thumbnail_URL`) → déposer le fichier `.webp`
  dans `public/pho/`, puis renseigner `/pho/nom-du-fichier.webp` dans le xlsx.
- Image de fiche (colonne `Image_media`) → déposer le fichier dans
  `public/photo/`, puis renseigner `/photo/nom-du-fichier.webp` dans le xlsx.

Le nom de fichier est libre, seul le chemin renseigné dans le xlsx compte.

## 2. Régénérer et déployer

Double-cliquer sur `update-site.bat` (ou le raccourci bureau), ou depuis un
terminal à la racine `laphilo-astro` :

```
python scripts/update-site.py "Ajoute [Nom du philosophe/courant]"
```

Ce script :
1. régénère `src/data/philosophes.json` et `src/data/courants.json` depuis
   les xlsx (`build-data.py`) ;
2. lance `astro build` pour vérifier que le site se génère sans erreur ;
3. s'il n'y a aucun changement (xlsx, données, ou images dans `public/pho/`
   et `public/photo/`), s'arrête là (rien à déployer) ;
4. sinon, commit et push automatiquement — xlsx, données ET images comprises.

Cloudflare Pages détecte le push sur GitHub et reconstruit/déploie le site
tout seul en quelques minutes — aucune étape manuelle supplémentaire.

Pour juste régénérer les données sans committer/pousser (pour vérifier
avant) :

```
python scripts/build-data.py
```

## Notes

- Un même nom peut apparaître dans les données ; le script détecte les
  collisions d'URL (slug) et ajoute un suffixe numérique automatiquement, en
  prévenant dans la sortie — vérifier si c'est bien voulu.
- Les slugs (`_id`, donc les URLs `/philosophes/xxx/` et `/courants/xxx/`)
  sont dérivés du nom exact renseigné dans le xlsx. Renommer un philosophe
  existant dans le xlsx change son URL — à éviter une fois la page indexée
  par Google, sauf besoin explicite.
- `build-data.py` ne touche jamais aux xlsx, seulement en lecture.
