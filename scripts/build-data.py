"""
build-data.py — Genere src/data/philosophes.json et courants.json depuis les
xlsx sources (data/*.xlsx), sans dependance a l'ancien site SITE-FINAL-01.

Usage : python scripts/build-data.py   (depuis la racine laphilo-astro)

Colonnes attendues en ligne 3 de chaque xlsx :
  Annee_naissance | Annee_deces | Dates_affichage | Nom | Texte_HTML
  YouTube_ID | Credit_media | Thumbnail_URL | Image_media | Actif
  (+ Nationalite | Branche | Courant | Description | Figures_cles | Traditions
   | Groupe | Importance selon le fichier)

Nationalite : dans les fichiers à nationalité imposée (NAT_DEFAUT), une cellule
remplie l'emporte (ex. les Latino-Américains du fichier américains).

Traditions : étiquettes transversales, indépendantes de la nationalité, séparées
par « ; » (ex. « juive », « russe », « occident »). Elles alimentent les frises
qui regroupent des fiches de plusieurs fichiers (ex. pensee-juive-toutes-epoques)
et servent de groupe secondaire pour la frise du monde.

Groupe : grande tradition du philosophe pour la frise du monde (codes dans
GROUPES ci-dessous). Importance : 3 = incontournable, 2 = important, vide = 1.

À la fin, des vérifications signalent les erreurs de saisie probables (dates
affichées qui ne correspondent pas aux années, doublons, nationalité ou groupe
manquant, groupe ou courant inconnu) : rien n'est bloqué, c'est une liste à relire.
"""

import json
import os
import re
import sys
import unicodedata

import openpyxl

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_DIR = os.path.join(BASE, 'data')
DATA_DIR = os.path.join(BASE, 'src', 'data')

# ── Fichiers philosophes : xlsx -> (frise_source, frise_label) ──────────────
# Ordre volontairement identique à celui déjà présent dans philosophes.json
# (alphabétique par frise_source) pour minimiser le diff git à chaque
# régénération.
PHILOSOPHE_FICHIERS = {
    'frise-philosophes-allemands':            ('allemands',             'Philosophes allemands modernes'),
    'frise-philosophes-americains':           ('americains',            'Philosophes américains'),
    'frise-philosophes-autre-actif':          ('contemporains-monde',   'Philosophes contemporains — monde'),
    'frise-philosophes-france-actif':         ('france-contemporains',  'Philosophes français contemporains'),
    'frise-philosophes-france':               ('france',                'Philosophes français modernes'),
    'frise-philosophes-greco-romains':        ('greco-romains',         'Philosophes gréco-romains'),
    'frise-philosophes-medievaux':            ('medievaux',             'Philosophes médiévaux'),
    'frise-philosophes-modernes':             ('modernes',              'Philosophes modernes'),
    'frise-philosophes-orientaux':            ('orientaux',             'Philosophes orientaux & africains'),
    'frise-philosophes-renaissance-lumieres': ('renaissance-lumieres',  'Philosophes Renaissance & Lumières'),
    'frise-philosophes-russes':               ('russes',                "Philosophes russes & Europe de l'Est"),
}

# ── Fichiers courants : xlsx -> (frise_source, frise_label) ─────────────────
COURANT_FICHIERS = {
    'frise-courant-pensee-occidental': ('occidental', 'Courants de pensée occidentaux'),
    'frise-courant-pensee-oriental':   ('oriental',   'Courants de pensée orientaux'),
}

# ── Nationalité par défaut selon la frise (repris de convert-xlsx.py) ───────
NAT_DEFAUT = {
    'frise-philosophes-france':       'Française',
    'frise-philosophes-france-actif': 'Française',
    'frise-philosophes-allemands':    'Allemande',
    'frise-philosophes-russes':       'Russe',
    'frise-philosophes-americains':   'Américaine',
}

# ── Grands groupes de la frise du monde (colonne Groupe des xlsx) ───────────
GROUPES = {
    'occident':      "L'Occident",
    'islam-juif':    'Le monde islamique et juif',
    'inde':          "L'Inde et le monde bouddhiste du Sud",
    'asie-est':      "L'Asie de l'Est",
    'asie-se':       "L'Asie du Sud-Est insulaire",
    'sud':           'Les pensées du Sud et de la décolonisation',
    'russe':         'La pensée russe',
    'orient-ancien': 'Le Proche-Orient ancien',
}


def to_str(v):
    if v is None:
        return ''
    return str(v).strip()


def wrap_dd(html):
    """Les textes utilisent <dd> seul pour indenter des lignes de liste. Un <dd>
    hors d'une liste de définitions (<dl> avec <dt>) est invalide pour
    l'accessibilité : on le remplace par un bloc <div class="slide-dd">, qui
    s'affiche pareil (styles-f.css remet les marges des <dd> à zéro)."""
    if '<dd' not in html.lower() or '<dl' in html.lower():
        return html
    html = re.sub(r'<dd\b([^>]*)>', r'<div class="slide-dd"\1>', html, flags=re.I)
    return re.sub(r'</dd>', '</div>', html, flags=re.I)


def to_int(v):
    if v is None:
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v)
    s = str(v).strip().replace('–', '-').replace('−', '-')
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def url_relative(v):
    s = to_str(v)
    for prefix in (
        'https://www.laphilo.fr', 'https://laphilo.fr',
        'http://www.laphilo.fr', 'http://laphilo.fr',
    ):
        if s.startswith(prefix):
            return s[len(prefix):]
    return s


def normalize_header(s):
    s = unicodedata.normalize('NFD', str(s))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s.lower().replace(' ', '_')


def slugify(name):
    """Reproduit le slug déjà en usage dans src/data/*.json (_id) :
    minuscules, accents retirés, toute suite de caractères non alphanumériques
    (espaces, apostrophes, virgules...) -> un seul tiret. L'apostrophe compte
    comme séparateur (ex. "Zénon d'Élée" -> "zenon-d-elee", pas "zenon-delee")."""
    s = unicodedata.normalize('NFD', name)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = re.sub(r'-+', '-', s).strip('-')
    return s


def get_col_indices(ws):
    indices = {}
    for i, cell in enumerate(next(ws.iter_rows(min_row=3, max_row=3))):
        if cell.value:
            indices[normalize_header(cell.value)] = i
    return indices


def lire_xlsx(nom_fichier):
    """Lit un xlsx et retourne la liste des entrées (dicts), format commun
    philosophes/courants, sans frise_source/frise_label/_id (ajoutés ensuite)."""
    xlsx_path = os.path.join(XLSX_DIR, nom_fichier + '.xlsx')
    if not os.path.exists(xlsx_path):
        print(f'  [!] Fichier introuvable : {xlsx_path}')
        return None

    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    ws = wb.active
    cols = get_col_indices(ws)

    C = {
        'year':         cols.get('annee_naissance', 0),
        'end_year':     cols.get('annee_deces', 1),
        'display_date': cols.get('dates_affichage', 2),
        'name':         cols.get('nom', 3),
        'text':         cols.get('texte_html', 4),
        'yt_id':        cols.get('youtube_id', 5),
        'media_credit': cols.get('credit_media', 6),
        'thumbnail':    cols.get('thumbnail_url', 7),
        'image_media':  cols.get('image_media', 8),
        'actif':        cols.get('actif', 9),
        'nationalite':  cols.get('nationalite'),
        'branche':      cols.get('branche'),
        'courant':      cols.get('courant'),
        'description':  cols.get('description'),
        'figures_cles': cols.get('figures_cles'),
        'traditions':   cols.get('traditions'),
        'groupe':       cols.get('groupe'),
        'importance':   cols.get('importance'),
    }

    entrees = []
    ignorees = 0

    for row in ws.iter_rows(min_row=4, values_only=True):
        max_idx = max((v for v in C.values() if v is not None), default=0)
        row = list(row) + [None] * max(0, max_idx + 1 - len(row))

        if row[C['year']] is None and row[C['name']] is None:
            continue

        if to_str(row[C['actif']]).upper() == 'NON':
            ignorees += 1
            continue

        year = to_int(row[C['year']])
        if year is None:
            print(f'    [!] Ligne ignorée (année invalide) : {to_str(row[C["name"]])}')
            ignorees += 1
            continue

        end_year = to_int(row[C['end_year']])
        name = to_str(row[C['name']])

        entry = {
            'year': year,
            'end_year': end_year if end_year is not None else to_str(row[C['end_year']]),
            'display_date': to_str(row[C['display_date']]),
            'name': name,
            'text': wrap_dd(to_str(row[C['text']])),
            'yt_id': to_str(row[C['yt_id']]),
            'media_credit': to_str(row[C['media_credit']]),
            'thumbnail': url_relative(row[C['thumbnail']]),
            'image_media': url_relative(row[C['image_media']]),
        }

        if C['nationalite'] is not None:
            v = to_str(row[C['nationalite']]) if C['nationalite'] < len(row) else ''
        else:
            v = ''
        nat_fixe = NAT_DEFAUT.get(nom_fichier, '')
        if nat_fixe and not v:
            v = nat_fixe
        if v:
            entry['nationalite'] = v

        if C['branche'] is not None:
            v = to_str(row[C['branche']]) if C['branche'] < len(row) else ''
            if v:
                branches = [b.strip() for b in v.split(';') if b.strip()]
                if branches:
                    entry['branches'] = branches

        if C['courant'] is not None:
            v = to_str(row[C['courant']]) if C['courant'] < len(row) else ''
            if v:
                courants = [c.strip() for c in v.split(';') if c.strip()]
                if courants:
                    entry['courants'] = courants

        if C['description'] is not None:
            v = to_str(row[C['description']]) if C['description'] < len(row) else ''
            if v:
                entry['description'] = v

        if C['figures_cles'] is not None:
            v = to_str(row[C['figures_cles']]) if C['figures_cles'] < len(row) else ''
            if v:
                figures = [x.strip() for x in v.split(';') if x.strip()]
                if figures:
                    entry['figures_cles'] = figures

        if C['traditions'] is not None:
            v = to_str(row[C['traditions']]) if C['traditions'] < len(row) else ''
            if v:
                traditions = [t.strip().lower() for t in v.split(';') if t.strip()]
                if traditions:
                    entry['traditions'] = traditions

        if C['groupe'] is not None:
            v = to_str(row[C['groupe']]) if C['groupe'] < len(row) else ''
            if v:
                entry['groupe'] = v.strip().lower()

        if C['importance'] is not None:
            v = to_int(row[C['importance']]) if C['importance'] < len(row) else None
            if v in (2, 3):
                entry['importance'] = v

        entry['_fichier'] = nom_fichier
        entrees.append(entry)

    print(f'  OK  {nom_fichier} : {len(entrees)} entrées ({ignorees} ignorées)')
    return entrees


def construire(fichiers_map, dest_name):
    """Lit tous les xlsx d'un groupe (philosophes ou courants), assigne
    frise_source/frise_label/_id, dédoublonne les _id en cas de collision."""
    toutes = []
    slugs_vus = {}

    for nom_fichier, (frise_source, frise_label) in fichiers_map.items():
        entrees = lire_xlsx(nom_fichier)
        if entrees is None:
            continue
        for e in entrees:
            e['frise_source'] = frise_source
            e['frise_label'] = frise_label
            base_slug = slugify(e['name'])
            slug = base_slug
            n = slugs_vus.get(base_slug, 0)
            if n > 0:
                slug = f'{base_slug}-{n + 1}'
                print(f'    [!] Slug en collision, renommé : {base_slug} -> {slug} ({e["name"]})')
            slugs_vus[base_slug] = n + 1
            e['_id'] = slug
            toutes.append(e)

    os.makedirs(DATA_DIR, exist_ok=True)
    dest_path = os.path.join(DATA_DIR, dest_name)
    propres = [{k: v for k, v in e.items() if k != '_fichier'} for e in toutes]
    with open(dest_path, 'w', encoding='utf-8') as f:
        json.dump(propres, f, ensure_ascii=False)
    DERNIERES[dest_name] = toutes

    print(f'\n  -> {dest_name} : {len(toutes)} entrées écrites dans {dest_path}\n')
    return len(toutes)


DERNIERES = {}


def nombres(s):
    return [int(n) for n in re.findall(r'\d+', s)]


def verifier(philosophes, courants):
    """Liste les erreurs de saisie probables. Ne modifie rien."""
    alertes = []
    noms_courants = {c['name'] for c in courants}
    vus = {}
    for p in philosophes:
        ou = f"{p['_fichier']}.xlsx"
        nom = p['name']
        # Dates affichées cohérentes avec les colonnes d'années
        nums = nombres(p['display_date'])
        if nums and nums[0] != abs(p['year']):
            alertes.append(f"{nom} ({ou}) : date affichée « {p['display_date']} » mais année de naissance {p['year']}")
        elif isinstance(p['end_year'], int) and len(nums) >= 2 and nums[-1] != abs(p['end_year']):
            alertes.append(f"{nom} ({ou}) : date affichée « {p['display_date']} » mais année de décès {p['end_year']}")
        # Même personne dans deux fichiers
        cle = slugify(nom)
        if cle in vus:
            alertes.append(f"{nom} : présent dans {vus[cle]}.xlsx et dans {ou} (doublon)")
        vus.setdefault(cle, p['_fichier'])
        if not p.get('nationalite'):
            alertes.append(f"{nom} ({ou}) : nationalité manquante")
        if not p.get('groupe'):
            alertes.append(f"{nom} ({ou}) : groupe manquant")
        elif p['groupe'] not in GROUPES:
            alertes.append(f"{nom} ({ou}) : groupe « {p['groupe']} » inconnu (codes : {', '.join(GROUPES)})")
        for c in p.get('courants', []):
            if c not in noms_courants:
                alertes.append(f"{nom} ({ou}) : courant « {c} » introuvable dans les fichiers de courants")
    return alertes


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    print('\n=== Génération des données Astro depuis les xlsx ===\n')

    print('--- Philosophes ---')
    n_phi = construire(PHILOSOPHE_FICHIERS, 'philosophes.json')

    print('--- Courants ---')
    n_cur = construire(COURANT_FICHIERS, 'courants.json')

    print('=' * 50)
    print(f'  Total : {n_phi} philosophes, {n_cur} courants de pensée')
    print('=' * 50)

    alertes = verifier(DERNIERES.get('philosophes.json', []), DERNIERES.get('courants.json', []))
    traditions = sorted({t for p in DERNIERES.get('philosophes.json', []) for t in p.get('traditions', [])})
    if traditions:
        print()
        print(f"  Traditions utilisées : {', '.join(traditions)}")
    print()
    print(f'=== Vérifications : {len(alertes)} point(s) à relire ===')
    for a in alertes:
        print(f'  - {a}')
