"""
indexnow.py — Signale à Bing (et aux autres moteurs IndexNow) les pages
nouvelles ou modifiées, pour qu'elles soient réexplorées sans attendre.

À lancer APRÈS la mise en ligne (les pages doivent déjà être à jour sur le site).

Usage (depuis la racine laphilo-astro) :
  python scripts/indexnow.py            fiches modifiées depuis le dernier envoi
                                        (d'après src/data/dates-modif.json)
  python scripts/indexnow.py --tout     toutes les pages du sitemap en ligne
  python scripts/indexnow.py URL…       les adresses données (ex. /ressources/)
  python scripts/indexnow.py --essai    affiche ce qui serait envoyé, n'envoie rien

Google n'utilise pas IndexNow : pour lui, le <lastmod> du sitemap suffit.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://laphilo.fr'
CLE = '887fb10321d99cd88f61f2e13ba09957'  # fichier public/<CLE>.txt
DERNIER = os.path.join(BASE, 'scripts', 'indexnow-dernier.json')
UA = {'User-Agent': 'Mozilla/5.0 (laphilo indexnow)'}


def lire(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode('utf-8')


def toutes_les_pages():
    urls = []
    for plan in re.findall(r'<loc>(.*?)</loc>', lire(f'{SITE}/sitemap-index.xml')):
        urls += re.findall(r'<loc>(.*?)</loc>', lire(plan))
    return urls


def fiches_modifiees(depuis):
    dates = json.load(open(os.path.join(BASE, 'src', 'data', 'dates-modif.json'), encoding='utf-8'))
    return [f'{SITE}/{cle}/' for cle, v in dates.items() if not depuis or v['d'] >= depuis], max(v['d'] for v in dates.values())


def envoyer(urls):
    for i in range(0, len(urls), 10000):
        corps = json.dumps({'host': 'laphilo.fr', 'key': CLE, 'keyLocation': f'{SITE}/{CLE}.txt',
                            'urlList': urls[i:i + 10000]}).encode('utf-8')
        req = urllib.request.Request('https://api.indexnow.org/indexnow', data=corps, method='POST',
                                     headers={**UA, 'Content-Type': 'application/json; charset=utf-8'})
        try:
            r = urllib.request.urlopen(req, timeout=30)
            print(f'  {len(urls[i:i + 10000])} adresse(s) envoyée(s) : réponse {r.status} (200 ou 202 = reçu)')
        except urllib.error.HTTPError as e:
            print(f'  Refusé : {e.code} {e.read().decode("utf-8", "replace")[:300]}')
            return False
    return True


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    args = sys.argv[1:]
    essai = '--essai' in args
    args = [a for a in args if a != '--essai']
    try:
        dernier = json.load(open(DERNIER, encoding='utf-8')).get('date')
    except (OSError, ValueError):
        dernier = None
    nouvelle_date = None

    if '--tout' in args:
        urls = toutes_les_pages()
        nouvelle_date = fiches_modifiees(None)[1]
    elif args:
        urls = [a if a.startswith('http') else SITE + '/' + a.lstrip('/') for a in args]
    else:
        urls, nouvelle_date = fiches_modifiees(dernier)
        print(f'Fiches modifiées depuis le {dernier or "début"} : {len(urls)}')

    if not urls:
        print('Rien à envoyer.')
        sys.exit(0)
    for u in urls[:10]:
        print('  ' + u)
    if len(urls) > 10:
        print(f'  … et {len(urls) - 10} autre(s)')
    if essai:
        sys.exit(0)

    if lire(f'{SITE}/{CLE}.txt').strip() != CLE:
        sys.exit('La clé n\'est pas encore en ligne : publier d\'abord le site.')
    if envoyer(urls) and nouvelle_date:
        json.dump({'date': nouvelle_date}, open(DERNIER, 'w', encoding='utf-8'))
