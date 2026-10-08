"""
Contrôle des dates des philosophes par Wikidata, pour l'éditeur (bouton « Dates »).

Repris de groupes/audit_dates.py (audit du 7 octobre 2026) : la page Wikipédia du lien
du nom (première balise <a> du texte) donne l'élément Wikidata, qui donne P569
(naissance) et P570 (décès). Seuls les éléments « être humain » (Q5) sont comparés.

Ce que Wikidata répond est gardé par fiche (slug) dans dates-etat.json (non publié) ;
la comparaison avec les xlsx se fait à la lecture : une date corrigée dans l'éditeur
cesse aussitôt d'être signalée, sans nouveau contrôle.

Signalé :
  - « décédé » : fiche sans année de décès, née en 1900 ou après, et Wikidata donne un
    décès (rouge) ;
  - « naissance » / « décès » : année différente de Wikidata (orange) d'au moins 1 an
    depuis 1500 (2 si la date est « vers »), 5 ans de 500 à 1500, 20 ans avant 500 : les
    historiens divergent souvent de quelques années sur les dates anciennes. Une date à la
    décennie ou au siècle près chez Wikidata laisse la marge correspondante.
L'utilisateur peut ignorer un écart (« la fiche a raison ») : il n'est plus signalé tant
que Wikidata donne la même valeur.
"""

import datetime
import json
import os
import re
import threading
import time
import urllib.parse
import urllib.request
import html as H

ICI = os.path.dirname(os.path.abspath(__file__))
FICHIER_ETAT = os.path.join(ICI, 'dates-etat.json')
UA = 'laphilo-editeur/1.0 (contact@laphilo.fr)'
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

verrou = threading.Lock()
_etat = None
progression = {'en_cours': False, 'fait': 0, 'total': 0, 'phase': '', 'erreur': ''}


def etat():
    global _etat
    if _etat is None:
        try:
            _etat = json.load(open(FICHIER_ETAT, encoding='utf-8'))
        except (OSError, ValueError):
            _etat = {'date': '', 'wd': {}, 'sans': {}, 'ignores': []}
    return _etat


def sauver():
    with verrou:
        tmp = FICHIER_ETAT + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(etat(), f, ensure_ascii=False, indent=0)
        os.replace(tmp, FICHIER_ETAT)


def get(url):
    for essai in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception:
            time.sleep(5 * (essai + 1))
    raise RuntimeError(f'Wikipédia / Wikidata ne répond pas ({url[:80]}…)')


def lien_du_nom(texte):
    m = re.search(r'<a\s[^>]*?href="([^"]*)"', str(texte or ''))
    return H.unescape(m.group(1)) if m else ''


def dates_wd(claims, prop):
    """[[année, précision, date lisible]] (précision Wikidata : 11 jour, 10 mois, 9 année, 8 décennie, 7 siècle)."""
    res = []
    for c in claims.get(prop, []):
        if c.get('rank') == 'deprecated':
            continue
        v = c.get('mainsnak', {}).get('datavalue', {}).get('value', {})
        t = v.get('time') if isinstance(v, dict) else None
        m = re.match(r'([+-])0*(\d+)-(\d\d)-(\d\d)', t or '')
        if not m:
            continue
        y = int(m.group(2)) * (-1 if m.group(1) == '-' else 1)
        p = v.get('precision', 9)
        mois, jour = int(m.group(3)), int(m.group(4))
        an = f'{-y} av. J.-C.' if y < 0 else str(y)
        lisible = (f'{jour} {MOIS[mois - 1]} {an}' if p >= 11 and jour and mois else
                   f'{MOIS[mois - 1]} {an}' if p == 10 and mois else
                   an if p == 9 else f'vers {an}')
        res.append([y, p, lisible])
    return res


# ── Contrôle complet (en arrière-plan) ─────────────────────────────────────
def lancer_controle(fiches_philosophes):
    """fiches_philosophes() -> [(slug, texte)]. Renvoie False si déjà en cours."""
    if progression['en_cours']:
        return False
    progression.update(en_cours=True, fait=0, total=0, phase='lecture des fiches', erreur='')

    def travail():
        try:
            F = fiches_philosophes()
            progression['total'] = len(F)
            par_wiki, sans, wd_fiche = {}, {}, {}
            for slug, texte in F:
                p = urllib.parse.urlsplit(lien_du_nom(texte))
                if 'wikipedia.org' in p.netloc and '/wiki/' in p.path:
                    titre = urllib.parse.unquote(p.path.split('/wiki/', 1)[1]).replace('_', ' ')
                    par_wiki.setdefault(p.netloc.replace('.m.', '.'), []).append((slug, titre))
                else:
                    sans[slug] = 'pas de lien Wikipédia sur le nom'
            # 1. page Wikipédia -> élément Wikidata (paquets de 50)
            progression['phase'] = 'Wikipédia'
            qid = {}
            for hote, xs in par_wiki.items():
                for i in range(0, len(xs), 50):
                    paquet = xs[i:i + 50]
                    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'formatversion': 2, 'redirects': 1,
                                                'prop': 'pageprops', 'ppprop': 'wikibase_item',
                                                'titles': '|'.join(t for _, t in paquet)})
                    d = get(f'https://{hote}/w/api.php?{q}').get('query', {})
                    norm = {n['from']: n['to'] for n in d.get('normalized', [])}
                    red = {n['from']: n['to'] for n in d.get('redirects', [])}
                    pages = {p['title']: p for p in d.get('pages', [])}
                    for slug, t in paquet:
                        t2 = norm.get(t, t)
                        q_ = pages.get(red.get(t2, t2), {}).get('pageprops', {}).get('wikibase_item')
                        if q_:
                            qid[slug] = q_
                        else:
                            sans[slug] = 'page Wikipédia sans élément Wikidata (ou page introuvable)'
                    progression['fait'] += len(paquet) // 2
                    time.sleep(1)
            # 2. éléments Wikidata
            progression['phase'] = 'Wikidata'
            ids = sorted(set(qid.values()))
            ent = {}
            for i in range(0, len(ids), 50):
                q = urllib.parse.urlencode({'action': 'wbgetentities', 'format': 'json', 'ids': '|'.join(ids[i:i + 50]),
                                            'props': 'claims|labels', 'languages': 'fr|en'})
                ent.update(get(f'https://www.wikidata.org/w/api.php?{q}').get('entities', {}))
                progression['fait'] = min(progression['total'], progression['fait'] + 25)
                time.sleep(1)
            for slug, q_ in qid.items():
                e = ent.get(q_, {})
                cl = e.get('claims', {})
                humain = any(c.get('mainsnak', {}).get('datavalue', {}).get('value', {}).get('id') == 'Q5'
                             for c in cl.get('P31', []))
                if not humain:
                    sans[slug] = f'l’élément Wikidata {q_} n’est pas une personne (œuvre, groupe…)'
                    continue
                lab = (e.get('labels', {}).get('fr') or e.get('labels', {}).get('en') or {}).get('value', '')
                wd_fiche[slug] = {'q': q_, 'lab': lab, 'n': dates_wd(cl, 'P569'), 'd': dates_wd(cl, 'P570')}
            etat()['wd'], etat()['sans'] = wd_fiche, sans
            etat()['date'] = datetime.datetime.now().isoformat(timespec='minutes')
            progression['fait'] = progression['total']
            sauver()
        except Exception as e:
            progression['erreur'] = f'{e.__class__.__name__} : {e}'
        finally:
            progression.update(en_cours=False, phase='')

    threading.Thread(target=travail, daemon=True).start()
    return True


# ── Comparaison avec la fiche ──────────────────────────────────────────────
def ecart(mien, valeurs, affichage):
    """Plus petit écart (en années) entre l'année de la fiche et celles de Wikidata, marge de précision déduite."""
    marge = {9: 0, 8: 10, 7: 100}
    return min(max(0, abs(mien - y) - marge.get(p, 0 if p > 9 else 100)) for y, p, _ in valeurs)


def anomalies(slug, naissance, deces, affichage):
    """Écarts entre la fiche et Wikidata d'après le dernier contrôle."""
    w = etat()['wd'].get(slug)
    if not w:
        return []
    ign = set(etat().get('ignores', []))
    vers = 'vers' in str(affichage or '').lower()
    res = []
    lien = f"https://www.wikidata.org/wiki/{w['q']}"
    if deces is None and w['d'] and naissance is not None and naissance >= 1900:
        y, p, lisible = w['d'][0]
        res.append({'type': 'decede', 'statut': 'MORT', 'annee': y, 'wikidata': lisible, 'lien': lien,
                    'detail': f"décédé(e) selon Wikidata : {lisible}"})
    for quoi, mien, valeurs in (('naissance', naissance, w['n']), ('deces', deces, w['d'])):
        if mien is None or not valeurs:
            continue
        e = ecart(mien, valeurs, affichage)
        # dates anciennes : les historiens divergent de quelques années, seuls les gros écarts comptent
        seuil = (1 if not vers else 2) if mien >= 1500 else 6 if mien >= 500 else 20
        if e >= seuil:
            wd = ' ou '.join(dict.fromkeys(l for _, _, l in valeurs))
            cle = f"{slug}|{quoi}|{wd}"
            if cle in ign:
                continue
            res.append({'type': quoi, 'statut': 'A VERIFIER', 'annee': valeurs[0][0], 'mien': mien, 'wikidata': wd,
                        'lien': lien, 'cle': cle,
                        'detail': f"{'naissance' if quoi == 'naissance' else 'décès'} : {mien if mien >= 0 else str(-mien) + ' av. J.-C.'} "
                                  f"sur la fiche, {wd} selon Wikidata"})
    return res


def ignorer(cle):
    L = etat().setdefault('ignores', [])
    if cle not in L:
        L.append(cle)
    sauver()


def resume():
    return {'date': etat().get('date', ''), 'progression': dict(progression),
            'compares': len(etat().get('wd', {})), 'sans': len(etat().get('sans', {}))}
