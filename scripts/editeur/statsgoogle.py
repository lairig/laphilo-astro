"""
Statistiques Google Search Console des fiches, pour l'éditeur (bouton « Google »).

Accès : le compte de service de scripts/gsc-credentials.json (mis en place pour
scripts/seo-monitor.py, propriété sc-domain:laphilo.fr, lecture seule).

Deux relevés, gardés dans stats-google-etat.json (non publié), par chemin de page
(« /philosophes/emmanuel-kant/ ») :
  - les chiffres des 90 derniers jours (affichages, clics, position moyenne) et les
    requêtes qui ont amené chaque page : deux appels, quelques secondes ;
  - l'état d'indexation de chaque fiche (inspection d'URL : indexée, détectée mais pas
    indexée, inconnue de Google…). Google n'en permet que 2 000 par jour : chaque
    contrôle reprend les fiches jamais vérifiées, puis celles vérifiées depuis le plus
    longtemps, et s'arrête au quota du jour.
"""

import datetime
import json
import os
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

ICI = os.path.dirname(os.path.abspath(__file__))
FICHIER_ETAT = os.path.join(ICI, 'stats-google-etat.json')
CLE = os.path.join(os.path.dirname(ICI), 'gsc-credentials.json')
SITE = 'sc-domain:laphilo.fr'
JOURS = 90
QUOTA_JOUR = 1900  # Google : 2 000 inspections par jour et par propriété, on garde une marge

verrou = threading.Lock()
_etat = None
progression = {'en_cours': False, 'fait': 0, 'total': 0, 'phase': '', 'erreur': ''}


def etat():
    global _etat
    if _etat is None:
        try:
            _etat = json.load(open(FICHIER_ETAT, encoding='utf-8'))
        except (OSError, ValueError):
            _etat = {}
        for k, v in (('date', ''), ('periode', []), ('pages', {}), ('requetes', {}), ('index', {}), ('quota', {})):
            _etat.setdefault(k, v)
    return _etat


def sauver():
    with verrou:
        tmp = FICHIER_ETAT + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(etat(), f, ensure_ascii=False, indent=0)
        os.replace(tmp, FICHIER_ETAT)


def service():
    """Un client par fil : ceux de googleapiclient ne se partagent pas entre fils."""
    if not os.path.exists(CLE):
        raise RuntimeError('Clé d’accès à Search Console introuvable (scripts/gsc-credentials.json).')
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    c = service_account.Credentials.from_service_account_file(CLE, scopes=['https://www.googleapis.com/auth/webmasters.readonly'])
    return build('searchconsole', 'v1', credentials=c, cache_discovery=False)


def chemin(url):
    """https://laphilo.fr/philosophes/x/?a=b -> /philosophes/x/ (les adresses avec paramètres comptent pour la page)."""
    p = urllib.parse.urlsplit(url)
    return urllib.parse.unquote(p.path) or '/'


def adresse(ch):
    return 'https://laphilo.fr' + urllib.parse.quote(ch)


def aujourdhui():
    return datetime.date.today().isoformat()


def quota_restant():
    return max(0, QUOTA_JOUR - etat()['quota'].get(aujourdhui(), 0))


# ── Chiffres des 90 derniers jours ─────────────────────────────────────────
def lire(s, dimensions, debut, fin):
    lignes, depart = [], 0
    while True:
        r = s.searchanalytics().query(siteUrl=SITE, body={
            'startDate': debut, 'endDate': fin, 'dimensions': dimensions, 'rowLimit': 25000,
            'startRow': depart, 'dataState': 'all'}).execute().get('rows', [])
        lignes += r
        if len(r) < 25000:
            return lignes
        depart += 25000


def actualiser_chiffres():
    s = service()
    fin = datetime.date.today() - datetime.timedelta(days=1)
    debut = fin - datetime.timedelta(days=JOURS - 1)
    d, f = debut.isoformat(), fin.isoformat()
    pages = {}
    for r in lire(s, ['page'], d, f):
        ch = chemin(r['keys'][0])
        x = pages.setdefault(ch, {'i': 0, 'c': 0, 'pp': 0})  # pp : somme des positions × affichages
        x['i'] += r['impressions']; x['c'] += r['clicks']; x['pp'] += r['position'] * r['impressions']
    for x in pages.values():
        x['p'] = round(x.pop('pp') / x['i'], 1) if x['i'] else None
        x['i'], x['c'] = int(x['i']), int(x['c'])
    requetes = {}
    for r in lire(s, ['page', 'query'], d, f):
        requetes.setdefault(chemin(r['keys'][0]), []).append(
            [r['keys'][1], int(r['impressions']), int(r['clicks']), round(r['position'], 1)])
    for L in requetes.values():
        L.sort(key=lambda q: (-q[2], -q[1]))
        del L[30:]
    e = etat()
    # plan du site actuel : quand Google l'a reçu, lu, combien d'adresses
    e['plans'] = [{'adresse': p['path'], 'envoye': p.get('lastSubmitted', ''), 'lu': p.get('lastDownloaded', ''),
                   'adresses': sum(int(c.get('submitted', 0)) for c in p.get('contents', [])), 'erreurs': int(p.get('errors', 0))}
                  for p in s.sitemaps().list(siteUrl=SITE).execute().get('sitemap', [])
                  if p['path'].startswith('https://laphilo.fr/sitemap-index')]
    e['pages'], e['requetes'], e['periode'] = pages, requetes, [d, f]
    e['date'] = datetime.datetime.now().isoformat(timespec='minutes')
    sauver()


# ── Indexation (inspection d'URL) ──────────────────────────────────────────
def categorie(x):
    """Classement simple de l'état renvoyé par Google."""
    if not x:
        return 'non_verifiee'
    if x.get('v') == 'PASS':
        return 'indexee'
    e = (x.get('etat') or '').lower()
    if 'détectée' in e or 'detected' in e:
        return 'detectee'
    if 'explorée' in e or 'crawled' in e:
        return 'exploree'
    if 'ne reconnaît pas' in e or 'unknown' in e:
        return 'inconnue'
    return 'autre'


LIBELLES = {'indexee': 'Indexée', 'detectee': 'Détectée, pas encore indexée', 'exploree': 'Explorée, pas indexée',
            'inconnue': 'Inconnue de Google', 'autre': 'Autre état', 'non_verifiee': 'Pas encore vérifiée'}


def inspecter(s, ch):
    r = s.urlInspection().index().inspect(body={'inspectionUrl': adresse(ch), 'siteUrl': SITE, 'languageCode': 'fr'}).execute()
    ir = r.get('inspectionResult', {}).get('indexStatusResult', {})
    x = {'v': ir.get('verdict', ''), 'etat': ir.get('coverageState', ''), 'crawl': ir.get('lastCrawlTime', ''),
         'date': datetime.datetime.now().isoformat(timespec='minutes')}
    canon = ir.get('googleCanonical')
    if canon and chemin(canon) != ch:
        x['canon'] = canon  # Google a choisi une autre adresse comme page de référence
    return x


def ordre_controle(chemins):
    """Jamais vérifiées d'abord, puis non indexées, puis indexées ; à égalité, la plus ancienne vérification."""
    idx = etat()['index']
    return sorted(chemins, key=lambda ch: (ch in idx, categorie(idx.get(ch)) == 'indexee', (idx.get(ch) or {}).get('date', '')))


def lancer_controle(chemins_fiches):
    """chemins_fiches() -> [chemin de chaque fiche]. Renvoie False si déjà en cours."""
    if progression['en_cours']:
        return False
    progression.update(en_cours=True, fait=0, total=0, phase='chiffres des 90 derniers jours', erreur='')

    def travail():
        try:
            actualiser_chiffres()
            a_faire = ordre_controle(chemins_fiches())[:quota_restant()]
            progression.update(phase='indexation des fiches', total=len(a_faire))
            local = threading.local()

            def un(ch):
                if progression['erreur']:
                    return
                if not hasattr(local, 's'):
                    local.s = service()
                try:
                    for essai in range(3):  # Google répond parfois « 500 Internal error » : on réessaie
                        try:
                            x = inspecter(local.s, ch)
                            break
                        except Exception as e:
                            if essai == 2 or not any(c in str(e) for c in ('500', '502', '503', 'timed out')):
                                raise
                            time.sleep(10 * (essai + 1))
                except Exception as e:
                    if 'quota' in str(e).lower() or '429' in str(e):
                        progression['erreur'] = 'Quota Google du jour atteint : le contrôle reprendra là où il s’est arrêté.'
                        etat()['quota'][aujourdhui()] = QUOTA_JOUR
                    else:
                        progression['erreur'] = f'{e.__class__.__name__} : {e}'
                    return
                with verrou:
                    etat()['index'][ch] = x
                    q = etat()['quota']
                    q[aujourdhui()] = q.get(aujourdhui(), 0) + 1
                    progression['fait'] += 1
                if progression['fait'] % 25 == 0:  # éditeur fermé en route : le travail fait est gardé
                    sauver()

            # chaque inspection prend ~6 s chez Google ; 16 à la fois restent loin de la limite de 600 par minute
            with ThreadPoolExecutor(16) as ex:
                list(ex.map(un, a_faire))
            etat()['quota'] = {k: v for k, v in etat()['quota'].items() if k >= (datetime.date.today() - datetime.timedelta(days=7)).isoformat()}
            sauver()
        except Exception as e:
            progression['erreur'] = f'{e.__class__.__name__} : {e}'
        finally:
            progression.update(en_cours=False, phase='')

    threading.Thread(target=travail, daemon=True).start()
    return True


def lancer_chiffres():
    """Seulement les chiffres (rapide, ne consomme pas le quota d'inspection)."""
    if progression['en_cours']:
        return False
    progression.update(en_cours=True, fait=0, total=0, phase='chiffres des 90 derniers jours', erreur='')

    def travail():
        try:
            actualiser_chiffres()
        except Exception as e:
            progression['erreur'] = f'{e.__class__.__name__} : {e}'
        finally:
            progression.update(en_cours=False, phase='')

    threading.Thread(target=travail, daemon=True).start()
    return True


# ── Lecture pour une fiche ─────────────────────────────────────────────────
def de_la_page(ch):
    e = etat()
    x = e['index'].get(ch)
    return {'chiffres': e['pages'].get(ch), 'requetes': e['requetes'].get(ch, [])[:15],
            'index': x, 'categorie': categorie(x), 'libelle': LIBELLES[categorie(x)]}


def resume():
    e = etat()
    return {'date': e['date'], 'periode': e['periode'], 'plans': e.get('plans', []), 'progression': dict(progression),
            'quota_restant': quota_restant(), 'verifiees': len(e['index'])}
