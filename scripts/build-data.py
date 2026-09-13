"""
build-data.py — Genere src/data/philosophes.json et courants.json depuis les
xlsx sources (data/*.xlsx), sans dependance a l'ancien site SITE-FINAL-01.

Usage : python scripts/build-data.py   (depuis la racine laphilo-astro)

Colonnes attendues en ligne 3 de chaque xlsx :
  Annee_naissance | Annee_deces | Dates_affichage | Nom | Texte_HTML
  YouTube_ID | Credit_media | Thumbnail_URL | Image_media | Actif
  (+ Nationalite | Branche | Courant | Description | Figures_cles selon le fichier)
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


def to_str(v):
    if v is None:
        return ''
    return str(v).strip()


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
            'text': to_str(row[C['text']]),
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
        if nat_fixe:
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
    with open(dest_path, 'w', encoding='utf-8') as f:
        json.dump(toutes, f, ensure_ascii=False)

    print(f'\n  -> {dest_name} : {len(toutes)} entrées écrites dans {dest_path}\n')
    return len(toutes)


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
