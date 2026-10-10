/*
 * Worker Cloudflare de laphilo.fr : seules les adresses /api/* passent par ici
 * (wrangler.jsonc, run_worker_first) ; tout le reste du site est servi tel quel
 * depuis dist/, avec ses fichiers _redirects et _headers.
 *
 * Page « Vos remarques » (/vos-remarques/) : les messages des visiteurs sont
 * gardés dans la base D1 « laphilo-remarques » (liaison DB). Rien n'est publié
 * sans relecture : l'éditeur des fiches (scripts/editeur) les modère par
 * /api/remarques/admin, avec la clé ADMIN_TOKEN.
 *
 * Secrets (tableau de bord Cloudflare, Worker laphilo-astro, Paramètres) :
 *   ADMIN_TOKEN      clé de l'éditeur (la même que scripts/editeur/remarques-cle.txt)
 *   TURNSTILE_SECRET clé secrète de la vérification anti-robot Turnstile
 *                    (sans elle, seuls le champ piège et la limite par heure filtrent)
 */

const CATEGORIES = ['erreur', 'suggestion', 'question', 'autre'];
const ETATS = ['attente', 'publie', 'refuse', 'archive'];
const PAR_PAGE = 20;
const MAX_PAR_HEURE = 5; // messages par visiteur (adresse IP) et par heure

const SCHEMA = `CREATE TABLE IF NOT EXISTS remarques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cree TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  categorie TEXT NOT NULL DEFAULT 'autre',
  fiche TEXT NOT NULL DEFAULT '',
  fiche_nom TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  prive INTEGER NOT NULL DEFAULT 0,
  etat TEXT NOT NULL DEFAULT 'attente',
  publie_le TEXT NOT NULL DEFAULT '',
  reponse TEXT NOT NULL DEFAULT '',
  reponse_le TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT ''
)`;
const INDEX = 'CREATE INDEX IF NOT EXISTS remarques_etat ON remarques (etat, prive, id)';

let schemaPret = false; // une fois par instance du Worker

async function base(env) {
  if (!env.DB) throw new Erreur(503, 'Base de données non reliée au Worker.');
  if (!schemaPret) {
    await env.DB.batch([env.DB.prepare(SCHEMA), env.DB.prepare(INDEX)]);
    schemaPret = true;
  }
  return env.DB;
}

class Erreur extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

const json = (donnees, statut = 200, cache = 'no-store') =>
  new Response(JSON.stringify(donnees), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });

const maintenant = () => new Date().toISOString();

/* Texte saisi : espaces superflus retirés, longueur bornée. */
function texte(v, max) {
  return String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/* Adresse IP gardée seulement sous forme d'empreinte (limite par heure). */
async function empreinte(ip, sel) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sel}|${ip}`));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifierTurnstile(env, jeton, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!jeton) return false;
  const corps = new FormData();
  corps.append('secret', env.TURNSTILE_SECRET);
  corps.append('response', jeton);
  if (ip) corps.append('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: corps });
  const d = await r.json().catch(() => ({}));
  return d.success === true;
}

/* ── Côté public ───────────────────────────────────────── */

const CHAMPS_PUBLICS = 'id, cree, nom, categorie, fiche, fiche_nom, message, reponse, reponse_le';

async function lister(env, url) {
  const db = await base(env);
  const cat = url.searchParams.get('categorie') || '';
  const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10) || 0);
  const filtre = CATEGORIES.includes(cat) ? ' AND categorie = ?1' : '';
  const params = filtre ? [cat] : [];
  const [total, lignes, parCat] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS n FROM remarques WHERE etat = 'publie' AND prive = 0${filtre}`).bind(...params),
    db.prepare(`SELECT ${CHAMPS_PUBLICS} FROM remarques WHERE etat = 'publie' AND prive = 0${filtre}
                ORDER BY id DESC LIMIT ${PAR_PAGE} OFFSET ${page * PAR_PAGE}`).bind(...params),
    db.prepare(`SELECT categorie, COUNT(*) AS n FROM remarques WHERE etat = 'publie' AND prive = 0 GROUP BY categorie`),
  ]);
  return json(
    {
      total: total.results[0].n,
      par_categorie: Object.fromEntries(parCat.results.map((x) => [x.categorie, x.n])),
      page,
      par_page: PAR_PAGE,
      remarques: lignes.results,
    },
    200,
    'public, max-age=30',
  );
}

async function deposer(env, requete) {
  const d = await requete.json().catch(() => null);
  if (!d || typeof d !== 'object') throw new Erreur(400, 'Message illisible.');
  if (d.site) return json({ ok: true }); // champ piège rempli : un robot, on fait semblant d'accepter

  const nom = texte(d.nom, 60);
  const email = texte(d.email, 120);
  const message = texte(d.message, 4000);
  const categorie = CATEGORIES.includes(d.categorie) ? d.categorie : 'autre';
  let fiche = texte(d.fiche, 160);
  let ficheNom = texte(d.fiche_nom, 120);
  if (!/^\/(philosophes|courants)\/[a-z0-9-]+\/$/.test(fiche)) fiche = ficheNom = '';
  const prive = d.prive ? 1 : 0;

  if (nom.length < 2) throw new Erreur(400, 'Indiquez votre nom ou un pseudo.');
  if (message.length < 5) throw new Erreur(400, 'Le message est vide ou trop court.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Erreur(400, 'Adresse e-mail incorrecte.');
  if (prive && !email) throw new Erreur(400, 'Pour un message privé, indiquez votre e-mail : c’est par là que la réponse vous parviendra.');

  const ip = requete.headers.get('CF-Connecting-IP') || '';
  if (!(await verifierTurnstile(env, d.turnstile, ip))) {
    throw new Erreur(403, 'La vérification anti-robot n’a pas abouti. Rechargez la page et réessayez.');
  }

  const db = await base(env);
  const marque = await empreinte(ip, env.ADMIN_TOKEN || 'laphilo');
  const depuis = new Date(Date.now() - 3600e3).toISOString();
  const recents = await db.prepare('SELECT COUNT(*) AS n FROM remarques WHERE ip = ?1 AND cree > ?2').bind(marque, depuis).first();
  if (recents.n >= MAX_PAR_HEURE) throw new Erreur(429, 'Vous avez déjà envoyé plusieurs messages : réessayez dans une heure.');

  await db
    .prepare(`INSERT INTO remarques (cree, nom, email, categorie, fiche, fiche_nom, message, prive, ip)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
    .bind(maintenant(), nom, email, categorie, fiche, ficheNom, message, prive, marque)
    .run();
  return json({ ok: true });
}

/* ── Modération (éditeur des fiches) ───────────────────── */

function autorise(env, requete) {
  const attendu = env.ADMIN_TOKEN || '';
  const recu = (requete.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (attendu.length < 20 || recu.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ recu.charCodeAt(i);
  return diff === 0;
}

async function adminLister(env) {
  const db = await base(env);
  const r = await db
    .prepare(`SELECT id, cree, nom, email, categorie, fiche, fiche_nom, message, prive, etat, publie_le, reponse, reponse_le
              FROM remarques ORDER BY (etat = 'attente') DESC, id DESC LIMIT 1000`)
    .all();
  return json({ remarques: r.results });
}

async function adminAgir(env, requete) {
  const d = await requete.json().catch(() => null);
  const id = parseInt(d?.id, 10);
  if (!id) throw new Erreur(400, 'Message non précisé.');
  const db = await base(env);
  const x = await db.prepare('SELECT * FROM remarques WHERE id = ?1').bind(id).first();
  if (!x) throw new Erreur(404, 'Ce message n’existe plus.');

  if (d.action === 'supprimer') {
    await db.prepare('DELETE FROM remarques WHERE id = ?1').bind(id).run();
    return json({ ok: true });
  }

  const c = d.champs || {};
  const maj = {
    nom: c.nom !== undefined ? texte(c.nom, 60) || x.nom : x.nom,
    message: c.message !== undefined ? texte(c.message, 4000) || x.message : x.message,
    categorie: CATEGORIES.includes(c.categorie) ? c.categorie : x.categorie,
    reponse: c.reponse !== undefined ? texte(c.reponse, 4000) : x.reponse,
    etat: x.etat,
    publie_le: x.publie_le,
    reponse_le: x.reponse_le,
  };
  if (maj.reponse !== x.reponse) maj.reponse_le = maj.reponse ? maintenant() : '';
  const etats = { publier: 'publie', refuser: 'refuse', archiver: 'archive', attente: 'attente' };
  if (d.action in etats) {
    maj.etat = etats[d.action];
    if (maj.etat === 'publie' && x.prive) throw new Erreur(400, 'Message privé : il ne peut pas être publié.');
    if (maj.etat === 'publie' && !x.publie_le) maj.publie_le = maintenant();
  } else if (d.action !== 'modifier') {
    throw new Erreur(400, 'Action inconnue.');
  }
  if (!ETATS.includes(maj.etat)) throw new Erreur(400, 'État inconnu.');

  await db
    .prepare(`UPDATE remarques SET nom = ?2, message = ?3, categorie = ?4, reponse = ?5, reponse_le = ?6, etat = ?7, publie_le = ?8
              WHERE id = ?1`)
    .bind(id, maj.nom, maj.message, maj.categorie, maj.reponse, maj.reponse_le, maj.etat, maj.publie_le)
    .run();
  return json({ ok: true });
}

/* ── Aiguillage ─────────────────────────────────────────── */

export default {
  async fetch(requete, env) {
    const url = new URL(requete.url);
    const p = url.pathname.replace(/\/+$/, '');
    try {
      if (p === '/api/remarques') {
        if (requete.method === 'GET') return await lister(env, url);
        if (requete.method === 'POST') return await deposer(env, requete);
        throw new Erreur(405, 'Méthode non permise.');
      }
      if (p === '/api/remarques/admin') {
        if (!autorise(env, requete)) throw new Erreur(401, 'Clé de l’éditeur absente ou incorrecte.');
        if (requete.method === 'GET') return await adminLister(env);
        if (requete.method === 'POST') return await adminAgir(env, requete);
        throw new Erreur(405, 'Méthode non permise.');
      }
      if (p.startsWith('/api/')) throw new Erreur(404, 'Adresse inconnue.');
      return env.ASSETS.fetch(requete);
    } catch (e) {
      if (e instanceof Erreur) return json({ erreur: e.message }, e.statut);
      console.error(e);
      return json({ erreur: 'Erreur du serveur, réessayez plus tard.' }, 500);
    }
  },
};
