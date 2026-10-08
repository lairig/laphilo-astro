"""
Publication du site depuis l'éditeur (bouton « Publier »).

1. Préparation : build-data, puis liste de ce qui part (fiches ajoutées, modifiées,
   retirées, d'après philosophes.json / courants.json comparés au dernier commit ;
   images nouvelles ou changées). Les autres fichiers modifiés (code du site) ne
   sont jamais publiés par ce bouton : ils sont seulement signalés.
2. Publication (en arrière-plan, étapes suivies par la page) :
   données vérifiées (build-data : 0 point à relire, sinon arrêt) → site construit
   (astro build, comme Cloudflare) → commit + envoi sur GitHub (nouvel essai si
   GitHub refuse, mise à jour si le dépôt a avancé) → construction Cloudflare
   (check-runs GitHub) → en ligne (public/publication.txt porte un jeton unique,
   attendu sur laphilo.fr) → Bing prévenu (scripts/indexnow.py).
"""

import datetime
import json
import os
import re
import secrets
import subprocess
import sys
import threading
import time
import urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(os.path.dirname(ICI))
SITE = 'https://laphilo.fr'
DEPOT = 'lairig/laphilo-astro'
JETON = os.path.join(BASE, 'public', 'publication.txt')
UA = {'User-Agent': 'Mozilla/5.0 (laphilo editeur)'}
SIGNATURE = '\n\nPublié depuis l\'éditeur des fiches.'

# Fichiers que le bouton publie : données, images, réglages tenus par l'éditeur
CONTENU = [
    re.compile(r'^data/frise-[^/]+\.xlsx$'),
    re.compile(r'^src/data/(philosophes|courants|chaines-youtube|dates-modif)\.json$'),
    re.compile(r'^public/(pho|photo)/[^/]+\.(webp|jpg|jpeg|png)$'),
    re.compile(r'^public/data/iframe-blocked-domains\.json$'),
    re.compile(r'^scripts/indexnow-dernier\.json$'),
    re.compile(r'^public/publication\.txt$'),
]
IGNORES = re.compile(r'(^|/)__pycache__/|^scripts/editeur/liens-etat\.json')

ETAPES = [('donnees', 'Données vérifiées'), ('build', 'Site construit'), ('envoi', 'Envoyé sur GitHub'),
          ('cloudflare', 'Construction sur Cloudflare'), ('en_ligne', 'En ligne sur laphilo.fr'),
          ('bing', 'Bing prévenu (IndexNow)')]
suivi = {'en_cours': False, 'etapes': {}, 'detail': '', 'erreur': '', 'fin': '', 'commit': '', 'debut': ''}
verrou = threading.Lock()


def git(*args, check=True):
    r = subprocess.run(['git', *args], cwd=BASE, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and r.returncode != 0:
        raise RuntimeError(f'git {args[0]} : {(r.stderr or r.stdout).strip()[-600:]}')
    return r


def lancer(cmd, timeout=600):
    r = subprocess.run(cmd, cwd=BASE, capture_output=True, text=True, encoding='utf-8', errors='replace',
                       shell=isinstance(cmd, str), timeout=timeout, env={**os.environ, 'PYTHONIOENCODING': 'utf-8'})
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def build_data():
    """(nombre de points à relire, résumé)"""
    code, sortie = lancer([sys.executable, os.path.join(BASE, 'scripts', 'build-data.py')])
    m = re.search(r'=== Vérifications : (\d+)', sortie)
    i = sortie.find('=== Vérifications')
    return (int(m.group(1)) if m else -1), (sortie[i:] if i >= 0 else sortie[-2000:]), code


def fichiers_modifies():
    """[(code git, chemin)] du dossier de travail (chemins avec accents et espaces gérés)."""
    r = git('status', '--porcelain', '-z', '--untracked-files=all')
    out = []
    for e in r.stdout.split('\0'):
        if len(e) > 3:
            out.append((e[:2], e[3:]))
    return [(c, p) for c, p in out if not IGNORES.search(p)]


def est_contenu(p):
    return any(rx.match(p) for rx in CONTENU)


def fiches_changees():
    """{'ajoutees': [...], 'modifiees': [...], 'retirees': [...]} (noms), philosophes et courants."""
    res = {'ajoutees': [], 'modifiees': [], 'retirees': []}
    for genre in ('philosophes', 'courants'):
        chemin = f'src/data/{genre}.json'
        try:
            avant = {e['_id']: e for e in json.loads(git('show', f'HEAD:{chemin}').stdout)}
        except (RuntimeError, ValueError):
            avant = {}
        apres = {e['_id']: e for e in json.load(open(os.path.join(BASE, chemin), encoding='utf-8'))}
        suffixe = ' (courant)' if genre == 'courants' else ''
        for k, e in apres.items():
            if k not in avant:
                res['ajoutees'].append(e['name'] + suffixe)
            elif e != avant[k]:
                res['modifiees'].append(e['name'] + suffixe)
        res['retirees'] += [e['name'] + suffixe for k, e in avant.items() if k not in apres]
    return res


def preparer():
    """État avant publication (lance build-data pour être à jour des xlsx)."""
    if suivi['en_cours']:
        return {'suivi': suivi_public()}
    alertes, resume, code = build_data()
    fichiers = fichiers_modifies()
    contenu = [p for c, p in fichiers if est_contenu(p)]
    images = [p.split('/', 1)[1] for c, p in fichiers if re.match(r'^public/(pho|photo)/', p)]
    fiches = fiches_changees()
    statut = (git('status', '-sb').stdout.splitlines() or [''])[0]
    return {
        'alertes': alertes, 'resume': resume if alertes else '',
        'fiches': fiches, 'images': images,
        'contenu': contenu, 'autres': [p for c, p in fichiers if not est_contenu(p)],
        'en_avance': 'ahead' in statut,  # commits déjà faits mais pas encore envoyés
        'message': message_par_defaut(fiches, images),
        'suivi': suivi_public(),
    }


def message_par_defaut(fiches, images):
    parts = []
    for cle, mot in (('ajoutees', 'nouvelle'), ('modifiees', 'modifiée'), ('retirees', 'retirée')):
        L = fiches[cle]
        if L:
            noms = ', '.join(L[:6]) + (f' et {len(L) - 6} autre(s)' if len(L) > 6 else '')
            parts.append(f"{len(L)} fiche{'s' if len(L) > 1 else ''} {mot}{'s' if len(L) > 1 else ''} : {noms}")
    if images:
        parts.append(f"{len(images)} image{'s' if len(images) > 1 else ''}")
    return ('Fiches — ' + ' ; '.join(parts)) if parts else 'Mise à jour des fiches'


def suivi_public():
    return {**suivi, 'liste': [{'cle': k, 'titre': t, 'etat': suivi['etapes'].get(k, '')} for k, t in ETAPES]}


def etape(cle, etat, detail=''):
    suivi['etapes'][cle] = etat
    if detail:
        suivi['detail'] = detail


def lire_url(url, timeout=20):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read().decode('utf-8', 'replace')


def etat_cloudflare(sha):
    """'en_cours', 'ok', 'echec' ou '' (inconnu) d'après les check-runs GitHub du commit."""
    try:
        d = json.loads(lire_url(f'https://api.github.com/repos/{DEPOT}/commits/{sha}/check-runs'))
    except Exception:
        return ''
    runs = d.get('check_runs', [])
    if not runs:
        return ''
    if any(r.get('status') != 'completed' for r in runs):
        return 'en_cours'
    if any(r.get('conclusion') in ('failure', 'cancelled', 'timed_out') for r in runs):
        return 'echec'
    return 'ok'


def envoyer_github():
    """push ; si le dépôt a avancé ailleurs : pull --rebase puis push ; GitHub en panne : nouveaux essais."""
    derniere = ''
    for essai in range(6):
        r = git('push', check=False)
        if r.returncode == 0:
            return
        derniere = (r.stderr or r.stdout).strip()
        if 'rejected' in derniere or 'fetch first' in derniere or 'non-fast-forward' in derniere:
            git('pull', '--rebase', '--autostash')  # fichiers en cours (non publiés) mis de côté puis remis
            continue
        etape('envoi', 'en_cours', f'GitHub ne répond pas, nouvel essai ({essai + 2}/6)…')
        time.sleep(20)
    raise RuntimeError('Envoi sur GitHub impossible : ' + derniere[-400:])


def attendre_en_ligne(jeton, sha):
    """Attend le jeton sur laphilo.fr (20 min au plus) ; surveille la construction Cloudflare."""
    debut, dernier_cf, cf = time.time(), 0, ''
    while time.time() - debut < 20 * 60:
        if time.time() - dernier_cf > 30:
            dernier_cf = time.time()
            cf = etat_cloudflare(sha) or cf
            if cf == 'echec':
                raise RuntimeError("La construction sur Cloudflare a échoué. Le bouton « Relancer la construction » "
                                   "suffit souvent (échec passager) ; sinon, demandez à Claude.")
            if cf == 'ok':
                etape('cloudflare', 'ok')
        try:
            if lire_url(f'{SITE}/publication.txt?t={int(time.time())}', 10).strip() == jeton:
                etape('cloudflare', 'ok')
                return
        except Exception:
            pass
        minutes = int((time.time() - debut) // 60)
        etape('en_ligne', 'en_cours', f'Mise en ligne en cours ({minutes} min ; souvent 2 à 5 min)…')
        time.sleep(10)
    raise RuntimeError("Le site n'est pas à jour après 20 minutes. La publication est partie : vérifiez plus tard, "
                       "ou demandez à Claude.")


def publier(message, relance=False):
    """Lance la publication en arrière-plan. relance=True : commit vide pour relancer Cloudflare."""
    with verrou:
        if suivi['en_cours']:
            return False
        suivi.update(en_cours=True, etapes={}, detail='', erreur='', fin='', commit='',
                     debut=datetime.datetime.now().isoformat(timespec='seconds'))
    threading.Thread(target=_publier, args=(message, relance), daemon=True).start()
    return True


def _publier(message, relance):
    try:
        jeton = secrets.token_hex(8)
        if relance:
            for k in ('donnees', 'build'):
                etape(k, 'saute')
            with open(JETON, 'w', encoding='utf-8', newline='\n') as f:
                f.write(jeton + '\n')
            etape('envoi', 'en_cours', 'Envoi sur GitHub…')
            git('add', '--', 'public/publication.txt')
            git('commit', '-m', 'Relance de la construction du site' + SIGNATURE)
        else:
            etape('donnees', 'en_cours', 'Vérification des données (build-data)…')
            alertes, resume, code = build_data()
            if code != 0 or alertes != 0:
                etape('donnees', 'echec')
                raise RuntimeError(f'{alertes} point(s) à relire : corrigez-les avant de publier.\n\n{resume}')
            etape('donnees', 'ok')

            etape('build', 'en_cours', 'Construction du site, comme sur Cloudflare (environ 1 minute)…')
            code, sortie = lancer('npx astro build', timeout=900)
            if code != 0:
                etape('build', 'echec')
                raise RuntimeError('La construction du site a échoué : rien n\'a été publié. Demandez à Claude.\n\n'
                                   + sortie[-1500:])
            etape('build', 'ok')

            etape('envoi', 'en_cours', 'Envoi sur GitHub…')
            with open(JETON, 'w', encoding='utf-8', newline='\n') as f:
                f.write(jeton + '\n')
            a_publier = [p for c, p in fichiers_modifies() if est_contenu(p)]
            git('add', '--', *a_publier)
            git('commit', '-m', (message.strip() or 'Mise à jour des fiches') + SIGNATURE)
        envoyer_github()
        sha = git('rev-parse', 'HEAD').stdout.strip()  # après un éventuel rebase
        suivi['commit'] = sha[:7]
        etape('envoi', 'ok')

        etape('cloudflare', 'en_cours', 'Construction sur Cloudflare…')
        etape('en_ligne', 'en_cours')
        attendre_en_ligne(jeton, sha)
        etape('en_ligne', 'ok', '')

        etape('bing', 'en_cours', 'Signalement des fiches modifiées à Bing…')
        code, sortie = lancer([sys.executable, os.path.join(BASE, 'scripts', 'indexnow.py')], timeout=120)
        etape('bing', 'ok' if code == 0 and 'Refusé' not in sortie else 'echec',
              '' if code == 0 else 'Bing n\'a pas pu être prévenu (sans gravité : il passera de lui-même).')
        suivi['fin'] = datetime.datetime.now().isoformat(timespec='seconds')
        suivi['detail'] = f"Publié : le site est à jour (commit {suivi['commit']})."
    except Exception as e:
        for k, _ in ETAPES:
            if suivi['etapes'].get(k) == 'en_cours':
                suivi['etapes'][k] = 'echec'
        suivi['erreur'] = str(e)
        suivi['detail'] = ''
    finally:
        suivi['en_cours'] = False
