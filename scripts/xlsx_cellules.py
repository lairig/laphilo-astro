"""
xlsx_cellules.py — Modifie des cellules précises d'un xlsx sans réécrire le
classeur : seul le XML de ces cellules change, le reste (styles, largeurs de
colonnes, hauteurs de lignes, mises en forme, autres feuilles) reste intact.

Pourquoi : ouvrir puis réenregistrer un xlsx avec openpyxl perd une partie de
la mise en forme. Ce script sert aux corrections ciblées (un nom, une date,
une colonne Traditions…) dans les fichiers de data/.

Agit sur la 1re feuille du classeur (celle que lit build-data.py).
Le texte est écrit en « chaîne en ligne » (inlineStr) : Excel l'affiche
normalement et le convertit à la prochaine sauvegarde.

En ligne de commande (depuis la racine laphilo-astro) :
  python scripts/xlsx_cellules.py data/frise-philosophes-orientaux.xlsx D34="HILLEL Hazaken" A76=1139
  (une valeur composée uniquement de chiffres est écrite comme nombre ;
   préfixer par ' pour forcer du texte : A2="'1654")

Depuis Python :
  from xlsx_cellules import set_cells
  set_cells('data/x.xlsx', {'N3': 'Traditions'}, style_from={'N3': 'M3'})

Fermer le fichier dans Excel avant de lancer le script.
"""

import re
import shutil
import sys
import zipfile
from xml.sax.saxutils import escape


def col_num(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return n


def split_ref(ref):
    m = re.match(r'([A-Z]+)(\d+)$', ref)
    if not m:
        raise ValueError(f'Référence de cellule invalide : {ref}')
    return m.group(1), int(m.group(2))


def first_sheet_path(z):
    """Chemin, dans l'archive, du XML de la 1re feuille du classeur."""
    wb = z.read('xl/workbook.xml').decode('utf-8')
    rid = re.search(r'<sheet [^>]*r:id="([^"]+)"', wb).group(1)
    rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8')
    tgt = (re.search(r'<Relationship [^>]*Id="%s"[^>]*Target="([^"]+)"' % rid, rels)
           or re.search(r'<Relationship [^>]*Target="([^"]+)"[^>]*Id="%s"' % rid, rels))
    t = tgt.group(1).lstrip('/')
    return t if t.startswith('xl/') else 'xl/' + t


def cell_xml(ref, value, style=''):
    st = f' s="{style}"' if style else ''
    if value is None or value == '':
        return f'<c r="{ref}"{st}/>'
    if isinstance(value, (int, float)):
        return f'<c r="{ref}"{st}><v>{value}</v></c>'
    return f'<c r="{ref}"{st} t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>'


CELL_RE = re.compile(r'<c r="([A-Z]+)(\d+)"([^>]*?)(?:/>|>.*?</c>)', re.S)


def set_cells(path, values, style_from=None):
    """values : {'D34': 'texte', 'A76': 1139, 'B2': None (vide la cellule)}.
    style_from : {'N3': 'M3'} donne à une nouvelle cellule le style d'une voisine.
    La ligne doit déjà exister dans la feuille (c'est le cas des lignes déjà
    utilisées ou mises en forme)."""
    tmp = path + '.tmp'
    with zipfile.ZipFile(path) as zi:
        sheet = first_sheet_path(zi)
        xml = zi.read(sheet).decode('utf-8')
        styles = {}
        for m in CELL_RE.finditer(xml):
            s = re.search(r'\bs="(\d+)"', m.group(3))
            styles[m.group(1) + m.group(2)] = s.group(1) if s else ''
        by_row = {}
        for ref, v in values.items():
            c, r = split_ref(ref)
            by_row.setdefault(r, {})[c] = v
        for r, cells in by_row.items():
            rm = re.search(r'<row [^>]*r="%d"[^>]*?(?:/>|>(.*?)</row>)' % r, xml, re.S)
            if not rm:
                raise ValueError(f'Ligne {r} absente de {path}')
            inner = rm.group(1) or ''
            existing = {m.group(1): m.group(0) for m in CELL_RE.finditer(inner)}
            for c, v in cells.items():
                ref = f'{c}{r}'
                st = styles.get(ref) or (styles.get(style_from[ref], '') if style_from and ref in style_from else '')
                existing[c] = cell_xml(ref, v, st)
            new_inner = ''.join(existing[c] for c in sorted(existing, key=col_num))
            head = re.match(r'<row [^>]*?(?=/?>)', rm.group(0)).group(0)
            head = re.sub(r'\s+spans="[^"]*"', '', head)
            xml = xml[:rm.start()] + head + '>' + new_inner + '</row>' + xml[rm.end():]
        with zipfile.ZipFile(tmp, 'w') as zo:
            for it in zi.infolist():
                data = zi.read(it.filename)
                if it.filename == sheet:
                    data = xml.encode('utf-8')
                zo.writestr(it, data)
    shutil.move(tmp, path)


def _valeur(s):
    if s.startswith("'"):
        return s[1:]
    if re.fullmatch(r'-?\d+', s):
        return int(s)
    return s


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    fichier = sys.argv[1]
    valeurs = {}
    for arg in sys.argv[2:]:
        ref, _, v = arg.partition('=')
        valeurs[ref.strip().upper()] = _valeur(v)
    shutil.copy(fichier, fichier + '.bak')
    set_cells(fichier, valeurs)
    print(f'{len(valeurs)} cellule(s) modifiée(s) dans {fichier} (copie de sauvegarde : {fichier}.bak)')
