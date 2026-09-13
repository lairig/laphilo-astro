"""
update-site.py — Met a jour et deploie le site apres modification des xlsx.

Enchaine :
  1. build-data.py   (xlsx -> src/data/philosophes.json + courants.json)
  2. astro build     (verifie que le site se genere sans erreur)
  3. git add + commit + push  (Cloudflare Pages reconstruit et deploie
     automatiquement a la reception du push, aucune etape manuelle
     supplementaire cote hebergement)

Usage : python scripts/update-site.py "Message de commit optionnel"
        (depuis la racine laphilo-astro)

Si aucun message n'est fourni, un message par defaut est utilise.
Si `git status` ne montre aucun changement apres la generation des
donnees, le script s'arrete sans rien committer ni pousser.
"""

import subprocess
import sys
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd, **kwargs):
    print(f'\n$ {" ".join(cmd)}')
    result = subprocess.run(cmd, cwd=BASE, **kwargs)
    if result.returncode != 0:
        print(f'\n[!] Échec de la commande (code {result.returncode}), arrêt.')
        sys.exit(result.returncode)
    return result


def main():
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    commit_message = sys.argv[1] if len(sys.argv) > 1 else 'Met à jour les données (xlsx)'

    print('=== 1/4 — Génération des données depuis les xlsx ===')
    run([sys.executable, os.path.join(BASE, 'scripts', 'build-data.py')])

    print('\n=== 2/4 — Vérification du build Astro ===')
    npx = 'npx.cmd' if os.name == 'nt' else 'npx'
    run([npx, 'astro', 'build'])
    dist_dir = os.path.join(BASE, 'dist')
    if os.path.isdir(dist_dir):
        import shutil
        shutil.rmtree(dist_dir)

    print('\n=== 3/4 — Vérification des changements git ===')
    tracked_paths = ['data/', 'src/data/philosophes.json', 'src/data/courants.json']
    status = subprocess.run(
        ['git', 'status', '--porcelain', '--'] + tracked_paths,
        cwd=BASE, capture_output=True, text=True,
    )
    if not status.stdout.strip():
        print('  Aucun changement détecté sur les données — rien à déployer.')
        return

    print(status.stdout)

    print('\n=== 4/4 — Commit et push ===')
    run(['git', 'add', '--'] + tracked_paths)
    run(['git', 'commit', '-m', commit_message])
    run(['git', 'push'])

    print('\nTerminé. Cloudflare Pages va reconstruire et déployer automatiquement.')
    print('Suivre le déploiement : dashboard Cloudflare Pages du projet laphilo-astro.')


if __name__ == '__main__':
    main()
