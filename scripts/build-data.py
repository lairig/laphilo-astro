"""
build-data.py — Genere src/data/philosophes.json et courants.json depuis les
xlsx sources (data/*.xlsx), sans dependance a l'ancien site SITE-FINAL-01.

Usage : python scripts/build-data.py   (depuis la racine laphilo-astro)

Colonnes attendues en ligne 3 de chaque xlsx :
  Annee_naissance | Annee_deces | Dates_affichage | Nom | Texte_HTML
  YouTube_ID | Credit_media | Thumbnail_URL | Image_media | Actif
  (+ Nationalite | Branche | Courant | Description | Figures_cles | Traditions
   | Groupe | Importance | Thèmes selon le fichier)

Nationalite : dans les fichiers à nationalité imposée (NAT_DEFAUT), une cellule
remplie l'emporte (ex. les Latino-Américains du fichier américains).

Traditions : étiquettes transversales, indépendantes de la nationalité, séparées
par « ; » (ex. « juive », « russe », « occident »). Elles alimentent les frises
qui regroupent des fiches de plusieurs fichiers (ex. pensee-juive-toutes-epoques)
et servent de groupe secondaire pour la frise du monde.

Groupe : grande tradition du philosophe pour la frise du monde (codes dans
GROUPES ci-dessous). Importance : 3 = incontournable, 2 = important, vide = 1.

Thèmes : sujets de travail des philosophes vivants (codes dans THEMES
ci-dessous, séparés par « ; »), dans les deux fichiers d'actifs. Ils alimentent
les frises « vivants-… » et les pastilles « Sujet de travail » de la recherche.

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
    'frise-courant-pensee-oriental':   ('oriental',   'Courants des autres traditions du monde'),
}
# La frise complète d'un courant suit sa colonne Groupe (validée le 2026-10-02),
# pas le fichier où il est rangé : Occident -> occidental, le reste -> oriental.
FRISE_COURANT_PAR_GROUPE = {'occident': 'occidental'}
LIBELLES_FRISE_COURANT = {src: lab for src, lab in COURANT_FICHIERS.values()}

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
    'sud':           'Les pensées du Sud et de la décolonisation',
    'russe':         'La pensée russe',
    'orient-ancien': 'Le Proche-Orient ancien',
}

# ── Sujets de travail des philosophes vivants (colonne Thèmes des deux xlsx
#    d'actifs, codes séparés par « ; ») ; libellés dans src/data/themes-vivants.ts
THEMES = {
    'esprit-ia':   'Esprit, IA & technique',
    'ecologie':    'Écologie & vivant',
    'justice':     'Justice & démocratie',
    'critique':    'Critique sociale & capitalisme',
    'genre':       'Féminisme & genre',
    'decolonial':  'Décolonisation & pensées du Sud',
    'sens':        'Sens & spiritualité',
    'reel':        'Réel & connaissance',
    'art':         'Art & esthétique',
    'continental': 'Héritiers de la pensée continentale',
}
FICHIERS_VIVANTS = ('frise-philosophes-france-actif', 'frise-philosophes-autre-actif')


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


def image_presente(url):
    """Portrait local absent de public/ (image pas encore fournie) : pas de
    vignette plutôt qu'une image cassée ; il apparaîtra au prochain build-data."""
    if url.startswith('/') and not os.path.exists(os.path.join(BASE, 'public', url.lstrip('/'))):
        return ''
    return url


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
    # lettres liées ou barrées que NFD ne décompose pas (« Arne NÆSS » -> arne-naess)
    for a, b in (('æ', 'ae'), ('œ', 'oe'), ('ø', 'o'), ('ß', 'ss'), ('đ', 'd'), ('ł', 'l'), ('ı', 'i')):
        s = s.replace(a, b)
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
        'themes':       cols.get('themes'),
        # courants : mouvement ou position, famille (ou grande question), courants parents
        'nature':       cols.get('nature'),
        'famille':      cols.get('famille'),
        'issu_de':      cols.get('issu_de'),
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
            'thumbnail': image_presente(url_relative(row[C['thumbnail']])),
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

        for cle in ('nature', 'famille'):
            if C[cle] is not None:
                v = to_str(row[C[cle]]) if C[cle] < len(row) else ''
                if v:
                    entry[cle] = v.strip()

        if C['issu_de'] is not None:
            v = to_str(row[C['issu_de']]) if C['issu_de'] < len(row) else ''
            if v:
                parents = [x.strip() for x in v.split(';') if x.strip()]
                if parents:
                    entry['issu_de'] = parents

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

        if C['themes'] is not None:
            v = to_str(row[C['themes']]) if C['themes'] < len(row) else ''
            if v:
                themes = [t.strip().lower() for t in v.split(';') if t.strip()]
                if themes:
                    entry['themes'] = themes

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
            if fichiers_map is COURANT_FICHIERS and e.get('groupe'):
                frise_source = FRISE_COURANT_PAR_GROUPE.get(e['groupe'], 'oriental')
                frise_label = LIBELLES_FRISE_COURANT[frise_source]
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
        for t in p.get('themes', []):
            if t not in THEMES:
                alertes.append(f"{nom} ({ou}) : thème « {t} » inconnu (codes : {', '.join(THEMES)})")
        if p['_fichier'] in FICHIERS_VIVANTS and not p.get('themes'):
            alertes.append(f"{nom} ({ou}) : thème manquant (colonne Thèmes)")
    # Courants : Groupe = grande tradition (mêmes codes que les philosophes),
    # Traditions = traditions secondaires, en codes de groupe aussi
    for c in courants:
        ou = f"{c['_fichier']}.xlsx"
        if not c.get('groupe'):
            alertes.append(f"courant {c['name']} ({ou}) : groupe manquant")
        elif c['groupe'] not in GROUPES:
            alertes.append(f"courant {c['name']} ({ou}) : groupe « {c['groupe']} » inconnu (codes : {', '.join(GROUPES)})")
        for t in c.get('traditions', []):
            if t not in GROUPES:
                alertes.append(f"courant {c['name']} ({ou}) : tradition « {t} » inconnue (codes de groupe : {', '.join(GROUPES)})")
    # Familles : Nature = mouvement ou position, Issu_de = noms exacts d'autres courants
    noms_courants = {c['name'] for c in courants}
    for c in courants:
        ou = f"{c['_fichier']}.xlsx"
        if c.get('nature') and c['nature'] not in ('mouvement', 'position'):
            alertes.append(f"courant {c['name']} ({ou}) : nature « {c['nature']} » inconnue (mouvement ou position)")
        if c.get('nature') and not c.get('famille'):
            alertes.append(f"courant {c['name']} ({ou}) : famille manquante")
        for p in c.get('issu_de', []):
            if p not in noms_courants:
                alertes.append(f"courant {c['name']} ({ou}) : « issu de » {p} n'est pas un courant connu")
    return alertes


CHAINES_CLASSEMENT = 20  # /ressources/ affiche les 15 chaînes qui ont le plus de vidéos : on connaît d'avance l'adresse des 20 premières


def cle_chaine(credit):
    """Chaîne d'un crédit vidéo ou d'un titre de lien « "Titre" par Chaîne » : sans guillemets ni point final,
    sans majuscules ni accents (même règle que nomDe()/cleDe() dans src/pages/ressources.astro)."""
    c = (credit or '').replace('&quot;', '"').replace('&#39;', "'").replace('&apos;', "'").replace('&amp;', '&')
    m = re.search(r'\bpar\s+(.+?)\s*$', c, re.S)
    if not m:
        return ''
    nom = re.sub(r'^[\s"\'«»]+|[\s"\'«».]+$', '', m.group(1))
    nom = ''.join(ch for ch in unicodedata.normalize('NFD', nom) if not unicodedata.combining(ch))
    return re.sub(r'\s+', ' ', nom.lower()).strip()


def videos_de(fiche):
    """(chaîne, identifiant YouTube) de la vidéo principale et des liens YouTube du texte d'une fiche."""
    out = []
    if fiche.get('yt_id'):
        out.append((cle_chaine(fiche.get('media_credit')), fiche['yt_id']))
    for tag in re.findall(r'<a\b[^>]*href="https?://(?:www\.)?(?:youtube\.com|youtu\.be)[^"]*"[^>]*>', fiche.get('text') or ''):
        href = re.search(r'href="([^"]+)"', tag).group(1).replace('&amp;', '&')
        vid = re.search(r'[?&]v=([\w-]{11})', href) or re.search(r'youtu\.be/([\w-]{11})', href)
        titre = re.search(r'title="([^"]*)"', tag)
        out.append((cle_chaine(titre.group(1) if titre else ''), vid.group(1) if vid else ''))
    return out


def chaines_youtube(fiches):
    """Adresse YouTube des chaînes assez utilisées pour figurer sur /ressources/ : demandée une fois à
    YouTube (oEmbed d'une de leurs vidéos) et gardée dans src/data/chaines-youtube.json. Sans réseau,
    rien n'est bloqué : la page renvoie alors vers une recherche YouTube du nom de la chaîne."""
    import collections, urllib.request
    chemin = os.path.join(DATA_DIR, 'chaines-youtube.json')
    try:
        cache = json.load(open(chemin, encoding='utf-8'))
    except (OSError, ValueError):
        cache = {}
    try:
        res = json.load(open(os.path.join(DATA_DIR, 'ressources.json'), encoding='utf-8'))
        connues = {cle_chaine('par ' + n) for c in res.get('chaines', []) for n in [c['nom'], *c.get('alias', [])]}
        connues |= {cle_chaine('par ' + m) for m in res.get('medias', [])}
    except (OSError, ValueError):
        connues = set()
    videos = collections.defaultdict(list)
    for f in fiches:
        for k, vid in videos_de(f):
            if k and vid:
                videos[k].append(vid)
    classement = sorted((k for k in videos if k not in connues), key=lambda k: -len(videos[k]))[:CHAINES_CLASSEMENT]
    a_chercher = [k for k in classement if not (cache.get(k) or {}).get('url')]
    if not a_chercher:
        return
    print(f'\n  Chaînes YouTube parmi les {CHAINES_CLASSEMENT} premières, adresse demandée à YouTube : {len(a_chercher)}')
    for k in a_chercher[:15]:
        for vid in videos[k][:2]:
            try:
                req = urllib.request.Request(f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json',
                                             headers={'User-Agent': 'laphilo-build-data'})
                d = json.load(urllib.request.urlopen(req, timeout=8))
                cache[k] = {'url': d.get('author_url'), 'nom_youtube': d.get('author_name')}
                print(f'    {k} → {cache[k]["url"]}')
                break
            except Exception:
                continue
    with open(chemin, 'w', encoding='utf-8') as fh:
        json.dump(dict(sorted(cache.items())), fh, ensure_ascii=False, indent=1)


def dates_modif(philosophes, courants):
    """Tient à jour src/data/dates-modif.json : pour chaque fiche, une empreinte
    de son contenu et la date du jour où elle a changé pour la dernière fois.
    Le sitemap en tire le <lastmod> des pages /philosophes/… et /courants/…,
    et scripts/indexnow.py la liste des pages à signaler à Bing."""
    import datetime
    import hashlib
    chemin = os.path.join(DATA_DIR, 'dates-modif.json')
    try:
        ancien = json.load(open(chemin, encoding='utf-8'))
    except (OSError, ValueError):
        ancien = {}
    aujourdhui = datetime.date.today().isoformat()
    nouveau = {}
    for rubrique, fiches in (('philosophes', philosophes), ('courants', courants)):
        for e in fiches:
            contenu = {k: v for k, v in e.items() if k not in ('_fichier', '_id', 'frise_label')}
            h = hashlib.sha1(json.dumps(contenu, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:10]
            cle = f"{rubrique}/{e['_id']}"
            avant = ancien.get(cle)
            nouveau[cle] = avant if avant and avant['h'] == h else {'h': h, 'd': aujourdhui}
    changees = sum(1 for k, v in nouveau.items() if v['d'] == aujourdhui and ancien.get(k) != v)
    with open(chemin, 'w', encoding='utf-8') as fh:
        json.dump(dict(sorted(nouveau.items())), fh, ensure_ascii=False, indent=0)
    print(f'\n  Dates de modification : {changees} fiche(s) modifiée(s) ou nouvelle(s) aujourd\'hui')


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

    chaines_youtube(DERNIERES.get('philosophes.json', []) + DERNIERES.get('courants.json', []))
    dates_modif(DERNIERES.get('philosophes.json', []), DERNIERES.get('courants.json', []))
