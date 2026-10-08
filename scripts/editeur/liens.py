"""
Contrôle des liens des fiches pour l'éditeur : liens du texte (Texte_HTML), fichier du
lecteur audio (<audio> du texte, podcasts Radio France) et vidéo principale (YouTube_ID),
philosophes et courants.

Le résultat est gardé par adresse dans liens-etat.json (à côté de ce fichier, non publié) :
  {"date": "...", "urls": {adresse: [statut, détail]}}
statut : MORT (sûr), A VERIFIER (site qui bloque les robots, vidéo privée…), OK,
         OK_MAIN (« à vérifier » que l'utilisateur a ouvert et trouvé bon).
Une adresse corrigée dans une fiche n'a plus d'état : elle est vérifiée à l'enregistrement.

Règles reprises de groupes/audit_liens.py (audit du 7 octobre 2026) :
  Wikipédia : API query par paquets de 50 titres (page manquante = MORT).
  YouTube : oEmbed (404/400 = vidéo supprimée ; 401/403 = privée ou intégration
            désactivée : « à vérifier » dans un texte, MORT pour la vidéo principale,
            qui ne s'affiche alors pas sur la fiche).
  Autres : HEAD puis GET ; 404/410 ou domaine disparu = MORT ; 403/429/5xx = à vérifier.
"""

import datetime
import html as H
import json
import os
import re
import ssl
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ICI = os.path.dirname(os.path.abspath(__file__))
FICHIER_ETAT = os.path.join(ICI, 'liens-etat.json')
SITE = 'https://laphilo.fr'
UA_API = 'laphilo-editeur/1.0 (contact@laphilo.fr)'
UA_NAV = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
CTX = ssl.create_default_context()
DEFAUTS = ('MORT', 'A VERIFIER')

verrou = threading.Lock()
_etat = None
progression = {'en_cours': False, 'fait': 0, 'total': 0, 'phase': '', 'erreur': ''}


# ── État enregistré ────────────────────────────────────────────────────────
def etat():
    global _etat
    if _etat is None:
        try:
            _etat = json.load(open(FICHIER_ETAT, encoding='utf-8'))
        except (OSError, ValueError):
            _etat = {'date': '', 'urls': {}}
    return _etat


def sauver():
    with verrou:
        tmp = FICHIER_ETAT + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(etat(), f, ensure_ascii=False, indent=0)
        os.replace(tmp, FICHIER_ETAT)


def statut(url):
    return etat()['urls'].get(url)


def marquer_bon(url):
    """« À vérifier » ouvert à la main et trouvé bon : on ne le signale plus."""
    etat()['urls'][url] = ['OK_MAIN', 'vérifié à la main']
    sauver()


# ── Liens d'une fiche ──────────────────────────────────────────────────────
def video_url(vid):
    return f'https://www.youtube.com/watch?v={vid}'


def liens_de(texte, yt_id=''):
    """[(adresse, mots, genre)] d'une fiche, sans doublon d'adresse ;
    genre : 'video' (vidéo principale), 'audio' (lecteur audio du texte) ou '' (lien du texte)."""
    out, vus = [], set()
    texte = str(texte or '')
    vid = str(yt_id or '').strip()
    if vid:
        out.append((video_url(vid), 'Vidéo principale', 'video')); vus.add(video_url(vid))
    for m in re.finditer(r'<audio\b(.*?)</audio>', texte, re.S | re.I):
        src = re.search(r'\bsrc="([^"]*)"', m.group(1))
        url = H.unescape(src.group(1).strip()) if src else ''
        if url and url not in vus:
            vus.add(url)
            t = re.search(r'\btitle="([^"]*)"', m.group(1))
            out.append((url, 'Audio : ' + (H.unescape(t.group(1)).strip() if t else 'sans titre'), 'audio'))
    texte = re.sub(r'<audio\b.*?</audio>', '', texte, flags=re.S | re.I)
    for m in re.finditer(r'<a\s[^>]*?href="([^"]*)"[^>]*>(.*?)</a>', texte, re.S | re.I):
        url = H.unescape(m.group(1).strip())
        if url in vus or url.startswith(('mailto:', '#')):
            continue
        vus.add(url)
        mots = re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', m.group(2)))).strip()
        out.append((url, mots, ''))
    return out


def defauts_de(texte, yt_id=''):
    """Liens en défaut d'une fiche d'après le dernier contrôle."""
    res = []
    for url, mots, genre in liens_de(texte, yt_id):
        s = statut(url)
        if s and s[0] in DEFAUTS:
            res.append({'url': url, 'mots': mots, 'video': genre == 'video', 'audio': genre == 'audio',
                        'statut': s[0], 'detail': s[1]})
    return res


# ── Vérifications ──────────────────────────────────────────────────────────
def lire(url, ua=UA_NAV, methode='GET', timeout=20, max_octets=None):
    """max_octets : ne lit que le début de la réponse (pages et fichiers audio : seul le code compte)."""
    req = urllib.request.Request(url, method=methode, headers={'User-Agent': ua, 'Accept-Language': 'fr,en;q=0.8'})
    with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
        return r.status, r.geturl(), (r.read(max_octets) if methode == 'GET' else b'')


def est_wiki(u):
    return 'wikipedia.org' in u


def youtube_id(u):
    p = urllib.parse.urlsplit(u)
    if 'youtube.com' not in p.netloc and 'youtu.be' not in p.netloc:
        return None
    if 'youtu.be' in p.netloc:
        return p.path.strip('/').split('/')[0]
    qs = urllib.parse.parse_qs(p.query)
    if 'v' in qs:
        return qs['v'][0]
    m = re.match(r'/(?:embed|shorts|live)/([^/?]+)', p.path)
    return m.group(1) if m else None


def verifier_wiki(urls, avance=lambda n: None):
    res, par_hote = {}, {}
    for u in urls:
        p = urllib.parse.urlsplit(u)
        if '/wiki/' not in p.path:
            res[u] = ('A VERIFIER', 'adresse Wikipédia sans /wiki/'); avance(1)
            continue
        titre = urllib.parse.unquote(p.path.split('/wiki/', 1)[1]).replace('_', ' ')
        par_hote.setdefault(p.netloc.replace('.m.', '.'), []).append((u, titre))
    for hote, items in par_hote.items():
        for i in range(0, len(items), 50):
            paquet = items[i:i + 50]
            q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'redirects': 1, 'formatversion': 2,
                                        'titles': '|'.join(t for _, t in paquet)})
            d = None
            for essai in range(3):
                try:
                    d = json.loads(lire(f'https://{hote}/w/api.php?{q}', UA_API)[2])
                    break
                except Exception:
                    time.sleep(4)
            if d is None:
                for u, _ in paquet:
                    res[u] = ('A VERIFIER', 'Wikipédia ne répond pas (réessayer plus tard)')
                avance(len(paquet))
                continue
            q2 = d.get('query', {})
            norm = {n['from']: n['to'] for n in q2.get('normalized', [])}
            redir = {n['from']: n['to'] for n in q2.get('redirects', [])}
            pages = {p['title']: p for p in q2.get('pages', [])}
            for u, t in paquet:
                t2 = norm.get(t, t)
                p = pages.get(redir.get(t2, t2))
                if p is None:
                    res[u] = ('A VERIFIER', 'titre non reconnu par Wikipédia')
                elif p.get('missing'):
                    res[u] = ('MORT', f'page Wikipédia inexistante ({hote.split(".")[0]})')
                elif p.get('invalid'):
                    res[u] = ('MORT', 'titre Wikipédia invalide')
                else:
                    res[u] = ('OK', '')
            avance(len(paquet))
            if len(items) > 50:
                time.sleep(1.5)
    return res


def verifier_youtube(u, principale=False):
    vid = youtube_id(u)
    if not vid:  # chaîne, playlist…
        return verifier_autre(u)
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}', vid):
        return ('MORT', f'identifiant de vidéo invalide « {vid} »')
    q = urllib.parse.quote(f'https://www.youtube.com/watch?v={vid}', safe='')
    for essai in range(2):
        try:
            lire(f'https://www.youtube.com/oembed?url={q}&format=json', UA_API)
            return ('OK', '')
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                return ('MORT', 'vidéo supprimée ou introuvable')
            if e.code in (401, 403):
                return ('MORT' if principale else 'A VERIFIER',
                        "vidéo privée ou intégration désactivée : elle ne s'affiche pas sur la fiche" if principale
                        else 'vidéo privée ou intégration désactivée')
            if essai == 0:
                time.sleep(3); continue
            return ('A VERIFIER', f'YouTube répond {e.code}')
        except Exception as e:
            if essai == 0:
                time.sleep(3); continue
            return ('A VERIFIER', f'vérification impossible ({e.__class__.__name__})')


def verifier_autre(u):
    if u.startswith('/'):
        u = SITE + u
    if not re.match(r'https?://', u):
        return ('MORT', 'adresse vide' if not u else "l'adresse ne commence pas par http")
    for essai in range(2):
        try:
            try:
                lire(u, methode='HEAD')
            except urllib.error.HTTPError as e:
                if e.code in (403, 405, 400, 501):
                    lire(u, max_octets=65536)
                else:
                    raise
            return ('OK', '')
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                return ('MORT', f'page introuvable ({e.code})')
            if essai == 0 and e.code in (429, 503):
                time.sleep(5); continue
            return ('A VERIFIER', f'le site répond {e.code} (il bloque peut-être les vérifications automatiques)')
        except Exception as e:
            if essai == 0:
                time.sleep(3); continue
            msg = str(e)
            if any(x in msg for x in ('getaddrinfo', 'Name or service', 'nodename')):
                return ('MORT', 'site disparu (domaine introuvable)')
            if 'CERTIFICATE' in msg:
                return ('A VERIFIER', "certificat de sécurité du site invalide (la page s'ouvre souvent quand même)")
            if 'timed out' in msg:
                return ('A VERIFIER', 'le site ne répond pas (trop lent ou en panne)')
            return ('A VERIFIER', f'vérification impossible ({msg[:100]})')


def verifier_audio(u):
    """Fichier audio (podcasts Radio France) : seul le code de réponse compte."""
    st, det = verifier_autre(u)
    # le stockage de Radio France répond 403 (AccessDenied) pour un fichier supprimé
    if st == 'MORT' or det.startswith('le site répond 403'):
        return ('MORT', 'fichier audio introuvable : podcast retiré ou déplacé par la radio')
    return (st, det.replace('le site répond', 'le serveur audio répond'))


def verifier(urls, videos=(), avance=lambda n: None, audios=()):
    """{url: (statut, détail)} ; videos = adresses des vidéos principales, audios = fichiers des lecteurs audio."""
    videos, audios = set(videos), set(audios)
    wk = [u for u in urls if est_wiki(u)]
    yt = [u for u in urls if u not in wk and youtube_id(u) is not None]
    au = [u for u in urls if u not in wk and u not in yt]
    res = {}
    progression['phase'] = 'Wikipédia'
    res.update(verifier_wiki(wk, avance))

    def un(u, f):
        r = f(u)
        avance(1)
        return r
    progression['phase'] = 'YouTube'
    with ThreadPoolExecutor(4) as ex:
        res.update(zip(yt, ex.map(lambda u: un(u, lambda x: verifier_youtube(x, x in videos)), yt)))
    progression['phase'] = 'autres sites'
    with ThreadPoolExecutor(8) as ex:
        res.update(zip(au, ex.map(lambda u: un(u, verifier_audio if u in audios else verifier_autre), au)))
    return res


def enregistrer(res):
    urls = etat()['urls']
    for u, (st, det) in res.items():
        if urls.get(u, [''])[0] == 'OK_MAIN' and st == 'A VERIFIER':
            continue  # déjà vérifié à la main
        urls[u] = [st, det]


# ── Contrôle complet (en arrière-plan) ─────────────────────────────────────
def lancer_controle(toutes_les_fiches):
    """toutes_les_fiches() -> [(texte, yt_id)] de toutes les fiches. Renvoie False si déjà en cours."""
    if progression['en_cours']:
        return False
    progression.update(en_cours=True, fait=0, total=0, phase='lecture des fiches', erreur='')

    def travail():
        try:
            urls, videos, audios = [], set(), set()
            for texte, yt in toutes_les_fiches():
                for u, _, genre in liens_de(texte, yt):
                    (videos if genre == 'video' else audios if genre == 'audio' else set()).add(u)
                    urls.append(u)
            urls = list(dict.fromkeys(urls))
            progression['total'] = len(urls)

            def avance(n):
                progression['fait'] += n
            res = verifier(urls, videos, avance, audios)
            # les adresses qui ne sont plus dans aucune fiche sont oubliées
            garder = set(urls)
            etat()['urls'] = {u: v for u, v in etat()['urls'].items() if u in garder}
            enregistrer(res)
            etat()['date'] = datetime.datetime.now().isoformat(timespec='minutes')
            sauver()
        except Exception as e:
            progression['erreur'] = f'{e.__class__.__name__} : {e}'
        finally:
            progression.update(en_cours=False, phase='')

    threading.Thread(target=travail, daemon=True).start()
    return True


def controler_fiche(texte, yt_id=''):
    """Vérifie les adresses d'une fiche jamais vérifiées ou en défaut (après un enregistrement)."""
    L = liens_de(texte, yt_id)
    a_voir = [u for u, _, _ in L if (statut(u) or ['?'])[0] not in ('OK', 'OK_MAIN')]
    if a_voir:
        enregistrer(verifier(a_voir, [u for u, _, g in L if g == 'video'], audios=[u for u, _, g in L if g == 'audio']))
        sauver()
    return defauts_de(texte, yt_id)


def resume():
    urls = etat()['urls']
    return {'date': etat().get('date', ''), 'progression': dict(progression),
            'morts': sum(1 for v in urls.values() if v[0] == 'MORT'),
            'a_verifier': sum(1 for v in urls.values() if v[0] == 'A VERIFIER'),
            'total': len(urls)}
