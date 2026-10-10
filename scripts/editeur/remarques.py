"""
Modération de la page « Vos remarques » de laphilo.fr, pour l'éditeur (bouton « Remarques »).

Les messages des visiteurs sont gardés en ligne, dans la base D1 du Worker Cloudflare
(worker/remarques.js). L'éditeur les lit et les modère par /api/remarques/admin, avec la
clé de remarques-cle.txt (non publiée) : la même clé doit être enregistrée dans Cloudflare
comme secret ADMIN_TOKEN du Worker laphilo-astro.

Chaque lecture garde une copie de tous les messages dans
../groupes/sauvegarde/remarques/remarques-AAAA-MM-JJ.json (une par jour).
"""

import datetime
import json
import os
import secrets
import urllib.error
import urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
FICHIER_CLE = os.path.join(ICI, 'remarques-cle.txt')
SAUVEGARDES = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(ICI))), 'groupes', 'sauvegarde', 'remarques')
# LAPHILO_REMARQUES_API : essai sur un Worker local (http://127.0.0.1:8787/api/remarques/admin)
ADRESSE = os.environ.get('LAPHILO_REMARQUES_API', 'https://laphilo.fr/api/remarques/admin')
# laphilo.fr refuse l'agent « Python-urllib » par défaut : on se présente comme l'éditeur
AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EditeurLaPhilo/1.0'


def cle():
    """Clé de l'éditeur, créée au premier usage."""
    if not os.path.exists(FICHIER_CLE):
        with open(FICHIER_CLE, 'w', encoding='utf-8') as f:
            f.write(secrets.token_urlsafe(32))
    return open(FICHIER_CLE, encoding='utf-8').read().strip()


def appel(methode, donnees=None):
    corps = json.dumps(donnees).encode('utf-8') if donnees is not None else None
    req = urllib.request.Request(ADRESSE, data=corps, method=methode, headers={
        'Authorization': 'Bearer ' + cle(), 'Content-Type': 'application/json', 'User-Agent': AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            message = json.loads(e.read().decode('utf-8')).get('erreur', '')
        except ValueError:
            message = ''
        if e.code == 401:
            raise RuntimeError('Le site refuse la clé de l’éditeur : la clé enregistrée dans Cloudflare (secret ADMIN_TOKEN) '
                               'doit être celle de scripts/editeur/remarques-cle.txt.')
        if e.code == 404 and not message:
            raise RuntimeError('La page « Vos remarques » n’est pas encore en ligne.')
        raise RuntimeError(message or f'Le site a répondu {e.code}.')
    except urllib.error.URLError as e:
        raise RuntimeError(f'Site injoignable ({e.reason}). Vérifiez la connexion à Internet.')


def lister():
    d = appel('GET')
    try:
        os.makedirs(SAUVEGARDES, exist_ok=True)
        chemin = os.path.join(SAUVEGARDES, f'remarques-{datetime.date.today().isoformat()}.json')
        with open(chemin, 'w', encoding='utf-8') as f:
            json.dump(d['remarques'], f, ensure_ascii=False, indent=1)
    except OSError:
        pass
    return {'remarques': d['remarques'], 'attente': sum(1 for x in d['remarques'] if x['etat'] == 'attente')}


def agir(d):
    """d = {id, action: publier|refuser|archiver|attente|modifier|supprimer, champs: {nom, message, categorie, reponse}}"""
    return appel('POST', {'id': d.get('id'), 'action': d.get('action'), 'champs': d.get('champs') or {}})
