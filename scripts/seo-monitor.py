"""
seo-monitor.py — Suivi Search Console pour laphilo.fr

Interroge l'API Google Search Console (Search Analytics) pour :
  - suivre les positions/impressions/clics des requêtes stratégiques
  - détecter les baisses significatives par rapport au dernier relevé
  - garder un historique local (scripts/seo-history.json)

Configuration requise (une seule fois) :
  1. Créer un projet sur https://console.cloud.google.com/
  2. Activer l'API "Google Search Console API"
  3. Créer un compte de service (IAM & Admin > Comptes de service),
     télécharger la clé JSON, la placer dans scripts/gsc-credentials.json
     (déjà exclu du upload FTP et à ne jamais committer/publier)
  4. Dans Search Console (search.google.com/search-console) > Paramètres
     > Utilisateurs et autorisations > Ajouter un utilisateur, coller
     l'adresse e-mail du compte de service (finit par
     ...@...iam.gserviceaccount.com, visible dans le JSON téléchargé),
     rôle "Propriétaire" ou "Complet" suffit pour la lecture.

Usage :
    python scripts/seo-monitor.py                rapport complet
    python scripts/seo-monitor.py --queries       uniquement les requêtes suivies
    python scripts/seo-monitor.py --days 90       fenêtre d'analyse (défaut 28)
"""

import json
import os
import sys
from datetime import date, timedelta

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, "gsc-credentials.json")
HISTORY_FILE = os.path.join(SCRIPT_DIR, "seo-history.json")

SITE_URL = "sc-domain:laphilo.fr"

# Requêtes stratégiques à suivre dans le temps (issues du diagnostic initial :
# ce sont celles qui génèrent déjà des impressions mais restent mal positionnées).
TRACKED_QUERIES = [
    "philosophe américain",
    "philosophes français actuels",
    "philosophe américain connu",
    "philosophe francais actuels",
    "philosophe français contemporain",
    "pascal engel",
    "la philo",
    "philosophe americain",
    "philosophe francais actuel",
    "philosophe francais",
    "philosophie",
    "philosophes",
    "frise chronologique philosophes",
    "courants de pensée philosophie",
]


def _load_client():
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        sys.exit(
            "Bibliotheques manquantes. Installez-les avec :\n"
            "  python -m pip install google-api-python-client google-auth\n"
        )

    if not os.path.exists(CREDENTIALS_FILE):
        sys.exit(
            f"Fichier introuvable : {CREDENTIALS_FILE}\n"
            "Suivez les instructions en haut de ce script pour créer et placer "
            "la clé de compte de service Google."
        )

    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_FILE,
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
    )
    return build("searchconsole", "v1", credentials=creds)


def _query_search_analytics(service, start_date, end_date, dimensions, row_limit=250, filters=None):
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }
    if filters:
        body["dimensionFilterGroups"] = [{"filters": filters}]
    resp = service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
    return resp.get("rows", [])


def _load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"runs": []}


def _save_history(history):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def fetch_tracked_queries(service, days):
    end_date = date.today() - timedelta(days=2)  # GSC a ~2j de latence
    start_date = end_date - timedelta(days=days)
    results = {}
    for q in TRACKED_QUERIES:
        rows = _query_search_analytics(
            service,
            start_date.isoformat(),
            end_date.isoformat(),
            dimensions=["query"],
            filters=[{"dimension": "query", "operator": "equals", "expression": q}],
        )
        if rows:
            r = rows[0]
            results[q] = {
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
                "ctr": round(r.get("ctr", 0) * 100, 2),
                "position": round(r.get("position", 0), 1),
            }
        else:
            results[q] = {"clicks": 0, "impressions": 0, "ctr": 0, "position": None}
    return results


def fetch_top_pages(service, days, limit=30):
    end_date = date.today() - timedelta(days=2)
    start_date = end_date - timedelta(days=days)
    rows = _query_search_analytics(
        service, start_date.isoformat(), end_date.isoformat(),
        dimensions=["page"], row_limit=limit,
    )
    return [
        {
            "page": r["keys"][0],
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1),
        }
        for r in rows
    ]


def _last_distinct_run(history):
    """Dernier relevé antérieur à aujourd'hui. Comparer à un run du jour même
    donnerait un delta nul et masquerait toute évolution."""
    today = date.today().isoformat()
    for run in reversed(history["runs"]):
        if run.get("date") != today:
            return run
    return None


def compare_with_last_run(history, current_queries):
    last_run = _last_distinct_run(history)
    if not last_run:
        return []
    last = last_run["queries"]
    alerts = []
    for q, cur in current_queries.items():
        prev = last.get(q)
        if not prev or prev.get("position") is None or cur.get("position") is None:
            continue
        delta = cur["position"] - prev["position"]
        if delta >= 5:  # position qui recule de 5+ rangs
            alerts.append(
                f"  [BAISSE] '{q}' : position {prev['position']} -> {cur['position']} "
                f"(recul de {delta:.1f})"
            )
        imp_prev = prev.get("impressions", 0)
        if imp_prev and cur["impressions"] < imp_prev * 0.5:
            alerts.append(
                f"  [IMPRESSIONS] '{q}' : {imp_prev} -> {cur['impressions']} impressions "
                f"(chute de {100 - 100*cur['impressions']//max(imp_prev,1)}%)"
            )
    return alerts


def print_daily_trend(service, days=28):
    """Vue jour par jour : c'est elle qui rend une bascule brutale visible,
    là où une moyenne sur 28 jours la dilue."""
    end_date = date.today() - timedelta(days=2)
    start_date = end_date - timedelta(days=days)
    rows = _query_search_analytics(
        service, start_date.isoformat(), end_date.isoformat(),
        dimensions=["date"], row_limit=200,
    )
    if not rows:
        return
    print(f"Tendance jour par jour ({days} derniers jours) :")
    for r in rows:
        impressions = r.get("impressions", 0)
        bar = "#" * min(int(impressions / 10), 40)
        print(
            f"  {r['keys'][0]}  {r.get('clicks', 0):>3.0f} clics "
            f"{impressions:>6.0f} impr  pos {r.get('position', 0):>5.1f}  {bar}"
        )

    half = len(rows) // 2
    if half:
        def avg(subset, key):
            return sum(x.get(key, 0) for x in subset) / len(subset)
        older, recent = rows[:half], rows[half:]
        imp_o, imp_r = avg(older, "impressions"), avg(recent, "impressions")
        pos_o, pos_r = avg(older, "position"), avg(recent, "position")
        trend = "REMONTEE" if imp_r > imp_o * 1.3 else (
            "DEGRADATION" if imp_r < imp_o * 0.7 else "STABLE")
        print(
            f"\n  -> {trend} : impressions/jour {imp_o:.0f} -> {imp_r:.0f}, "
            f"position moyenne {pos_o:.1f} -> {pos_r:.1f}\n"
        )


def _evolution_marker(current_queries, last_queries, q):
    """Retourne un symbole ▲/▼/= comparant la position actuelle à celle
    du dernier relevé, pour une lecture rapide de la tendance."""
    if not last_queries:
        return ""
    cur = current_queries.get(q, {})
    prev = last_queries.get(q, {})
    cur_pos, prev_pos = cur.get("position"), prev.get("position")
    if cur_pos is None or prev_pos is None:
        return ""
    delta = prev_pos - cur_pos  # positif = progression (position plus basse = mieux classé)
    if abs(delta) < 0.3:
        return "  ="
    arrow = "▲" if delta > 0 else "▼"
    return f"  {arrow}{abs(delta):.1f}"


def main():
    days = 28
    if "--days" in sys.argv:
        idx = sys.argv.index("--days")
        days = int(sys.argv[idx + 1])

    service = _load_client()
    history = _load_history()

    print(f"\n-- Suivi SEO laphilo.fr — fenêtre {days} jours -----------------------\n")

    print_daily_trend(service)

    queries = fetch_tracked_queries(service, days)
    last_run = _last_distinct_run(history)
    last_queries = last_run["queries"] if last_run else None
    last_date = last_run["date"] if last_run else None
    if last_date:
        print(f"Requêtes suivies (position / impressions / clics / CTR / évolution vs {last_date}) :")
    else:
        print("Requêtes suivies (position / impressions / clics / CTR) — premier relevé, pas d'évolution encore :")
    for q, d in sorted(queries.items(), key=lambda kv: -(kv[1]["impressions"] or 0)):
        pos = d["position"] if d["position"] is not None else "—"
        evo = _evolution_marker(queries, last_queries, q)
        print(f"  {q:38s}  pos {pos!s:>6}  {d['impressions']:>6} impr.  {d['clicks']:>4} clics  {d['ctr']}% CTR{evo}")

    alerts = compare_with_last_run(history, queries)
    if alerts:
        print("\nAlertes vs dernier relevé :")
        for a in alerts:
            print(a)
    else:
        print("\nAucune alerte vs dernier relevé (ou premier relevé).")

    if "--queries" not in sys.argv:
        print("\nTop pages (par impressions) :")
        pages = fetch_top_pages(service, days)
        for p in pages[:15]:
            print(f"  pos {p['position']:>5}  {p['impressions']:>6} impr.  {p['clicks']:>4} clics  {p['page']}")

    history["runs"].append({
        "date": date.today().isoformat(),
        "days_window": days,
        "queries": queries,
    })
    history["runs"] = history["runs"][-52:]  # garde ~1 an d'historique hebdomadaire
    _save_history(history)
    print(f"\nHistorique mis à jour -> {HISTORY_FILE}")


if __name__ == "__main__":
    main()
