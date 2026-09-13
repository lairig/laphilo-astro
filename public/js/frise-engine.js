/* ══════════════════════════════════════════════════════════════════════════════
   frise-engine.js  —  Moteur commun à toutes les frises  LaPhilo.fr
   Déposer dans  /js/frise-engine.js
   ──────────────────────────────────────────────────────────────────────────────
   Chaque frise HTML doit déclarer AVANT de charger ce fichier un objet
   window.FRISE_CONFIG contenant les paramètres spécifiques à la frise.

   ── Configuration minimale (frises philosophes) ──────────────────────────────
   <script>
   window.FRISE_CONFIG = {
     jsonUrl:      '/data/json/frise-philosophes-france-actif.json',
     defaultIndex: 40,
   };
   </script>
   <script src="/js/frise-engine.js"></script>

   ── Configuration étendue (frises courants de pensée) ────────────────────────
   <script>
   window.FRISE_CONFIG = {
     jsonUrl:      '/data/json/frise-courant-pensee-occidental.json',
     defaultIndex: 20,
     mode:         'courant',   // active les badges couleur au lieu des portraits
     pxPerYear:    22,          // espacement initial (défaut : 80)
     pxMin:        4,           // zoom minimum      (défaut : 20)
     pxMax:        80,          // zoom maximum      (défaut : 200)
     zoomSteps:    [2, 4, 8, 15], // pas de zoom aux seuils 20/40/80 (défaut : [10,20,40,∞])
   };
   </script>
   <script src="/js/frise-engine.js"></script>

   ── Toutes les options disponibles ───────────────────────────────────────────
   jsonUrl      (requis)  Chemin vers le fichier JSON depuis la racine du site
   defaultIndex (opt.)    Position de départ (défaut : 0)
   mode         (opt.)    'philosophe' (défaut) ou 'courant'
   scale_factor (opt.)    Espacement 1→20 (défaut : 9 ≈ 80 px/an). Ignoré si pxPerYear présent.
   pxPerYear    (opt.)    Espacement initial en px/an (défaut : 80)
   pxMin        (opt.)    Zoom minimum (défaut : 20)
   pxMax        (opt.)    Zoom maximum (défaut : 200)
   zoomSteps    (opt.)    Tableau [step1, step2, step3, step4] aux 4 paliers de zoom
   frisePad     (opt.)    Marge gauche/droite de la frise en px (défaut : 200)
   thumbW       (opt.)    Largeur du cartouche en px (défaut : 110)
   thumbH       (opt.)    Hauteur du cartouche / diamètre portrait (défaut : 28)
   gapRow       (opt.)    Espace vertical entre rangées en px (défaut : 6)
   ruleH        (opt.)    Hauteur de la règle temporelle en px (défaut : 42)
   ──────────────────────────────────────────────────────────────────────────────
   Règle / buildRule :
   • mode 'philosophe' : graduations toutes les 10 ans + marques de naissance
   • mode 'courant'    : graduations tous les 100 ans + 50 ans + marques de début
══════════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════
     1. LECTURE DE LA CONFIG
  ══════════════════════════════════════════════════════ */
  const CFG = Object.assign({
    jsonUrl:      '',
    defaultIndex: 0,
    mode:         'philosophe',
    scale_factor: 9,
    pxPerYear:    80,
    pxMin:        20,
    pxMax:        200,
    zoomSteps:    [10, 20, 40, 80],  // paliers : ≤30 / ≤60 / ≤120 / >120
    frisePad:     200,
    thumbW:       110,
    thumbH:       28,
    gapRow:       6,
    ruleH:        42,
  }, window.FRISE_CONFIG || {});

  /* scale_factor (1-20, défaut 9) → convertit en pxPerYear
     Ignoré si pxPerYear est explicitement fourni dans FRISE_CONFIG */
  if (window.FRISE_CONFIG && 'scale_factor' in window.FRISE_CONFIG
      && !('pxPerYear' in window.FRISE_CONFIG)) {
    CFG.pxPerYear = Math.round(CFG.scale_factor * 80 / 9);
  }

  /* Compat : accepte xlsxUrl comme alias de jsonUrl (migration XLSX → JSON) */
  if (!CFG.jsonUrl && CFG.xlsxUrl) CFG.jsonUrl = CFG.xlsxUrl;

  if (!CFG.jsonUrl) {
    console.error('[frise-engine] window.FRISE_CONFIG.jsonUrl est manquant.');
    return;
  }

  /* ── Constantes dérivées ── */
  const PX_DEFAULT = CFG.pxPerYear;
  const PX_MIN     = CFG.pxMin;
  const PX_MAX     = CFG.pxMax;
  const FRISE_PAD  = CFG.frisePad;
  const THUMB_W    = CFG.thumbW;
  const THUMB_H    = CFG.thumbH;
  const LABEL_H    = 0;
  const GAP_ROW    = CFG.gapRow;
  const RULE_H     = CFG.ruleH;
  const ROW_H      = THUMB_H + LABEL_H + GAP_ROW;
  const MODE       = CFG.mode;         // 'philosophe' | 'courant'

  let PX_PER_YEAR  = PX_DEFAULT;       // modifié par zoomFrise()

  const _isEN = (document.documentElement.lang || '').toLowerCase().startsWith('en')
             || new URLSearchParams(location.search).get('lang') === 'en';

  /* ══════════════════════════════════════════════════════
     2. ÉTAT GLOBAL
  ══════════════════════════════════════════════════════ */
  let DATA    = [];
  let current = 0;
  let _initialized = false;
  let IFRAME_BLOCKED_DOMAINS = [];
  let SEARCH_INDEX = [];
  function isLandscapeMobile() {
    return window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
  }

  /* ══════════════════════════════════════════════════════
     3. LOADER UI
  ══════════════════════════════════════════════════════ */
  function setProgress(pct, msg) {
    const fill = document.getElementById('loaderFill');
    const msgEl = document.getElementById('loaderMsg');
    if (fill)  fill.style.width = pct + '%';
    if (msgEl && msg) msgEl.textContent = msg;
  }

  function hideLoader() {
    const l = document.getElementById('loader');
    if (!l) return;
    l.classList.add('hidden');
    setTimeout(() => l.remove(), 600);
    const body = document.getElementById('friseBody');
    if (body) body.style.visibility = 'visible';
  }

  /* ══════════════════════════════════════════════════════
     4. PALETTE & HELPERS COURANTS
  ══════════════════════════════════════════════════════ */
  const PALETTE = [
    '#8b3a0f','#1a4a6a','#3a5a2a','#5a2a6a','#1a5a5a',
    '#6a4a1a','#2a5a3a','#4a1a5a','#1a3a6a','#5a3a1a',
    '#3a1a5a','#6a2a2a','#1a5a3a','#4a5a1a','#2a2a5a',
    '#7a3a0f','#0a4a7a','#2a6a2a','#6a1a5a','#0a6a5a',
  ];

  function eraIcon(year) {
    if (year < -300) return '🏛️';
    if (year < 500)  return '⚖️';
    if (year < 1400) return '✝️';
    if (year < 1650) return '🌿';
    if (year < 1800) return '💡';
    if (year < 1900) return '🔭';
    return '🧠';
  }
  function eraLabel(year) {
    if (_isEN) {
      if (year < -300) return 'Antiquity';
      if (year < 500)  return 'Hellenistic period';
      if (year < 1400) return 'Middle Ages';
      if (year < 1650) return 'Renaissance';
      if (year < 1800) return 'Enlightenment';
      if (year < 1900) return '19th century';
      return 'Contemporary period';
    }
    if (year < -300) return 'Antiquité';
    if (year < 500)  return 'Époque hellénistique';
    if (year < 1400) return 'Moyen Âge';
    if (year < 1650) return 'Renaissance';
    if (year < 1800) return 'Lumières';
    if (year < 1900) return 'XIXe siècle';
    return 'Époque contemporaine';
  }

  /* ══════════════════════════════════════════════════════
     5. LECTURE DU FICHIER JSON
  ══════════════════════════════════════════════════════ */
  async function loadJSON() {
    setProgress(10, _isEN ? 'Loading data…' : 'Chargement des données…');

    let json;
    try {
      const [respData, respBlocked, respIndex] = await Promise.all([
        fetch(CFG.jsonUrl),
        fetch('/data/iframe-blocked-domains.json').catch(() => null),
        fetch('/data/json/search-index.json').catch(() => null)
      ]);
      if (!respData.ok) throw new Error('HTTP ' + respData.status);
      json = await respData.json();
      if (respBlocked && respBlocked.ok) {
        IFRAME_BLOCKED_DOMAINS = await respBlocked.json();
      }
      if (respIndex && respIndex.ok) {
        const idxData = await respIndex.json();
        SEARCH_INDEX = (idxData && idxData.index) || [];
      }
    } catch (e) {
      const msgEl = document.getElementById('loaderMsg');
      if (msgEl) msgEl.textContent = '⚠ Impossible de charger le fichier — ' + e.message;
      return;
    }

    /* Champs supplémentaires pour le mode 'courant' (calculés à partir de year) */
    DATA = json.map((entry, idx) => {
      if (MODE === 'courant') {
        entry.marker_color = PALETTE[idx % PALETTE.length];
        entry.era_icon     = eraIcon(entry.year);
        entry.era_label    = eraLabel(entry.year);
      }
      return entry;
    });

    setProgress(85, _isEN ? 'Building the timeline…' : 'Construction de la frise…');
    buildNav();
    buildSlides();

    /* ── Démarrage : lire le paramètre URL ?p=Nom ── */
    (function () {
      const params = new URLSearchParams(window.location.search);
      const nom    = params.get('p');
      if (nom) {
        const idx = DATA.findIndex(d =>
          d.name.toLowerCase().includes(nom.toLowerCase()));
        goTo(idx >= 0 ? idx : CFG.defaultIndex);
        _initialized = true;
        setProgress(100, _isEN ? 'Ready' : 'Prêt');
        setTimeout(hideLoader, 300);
      } else {
        /* Pas de cible précise : afficher l'écran d'accueil de la frise
           plutôt que de sauter à un index arbitraire (defaultIndex). */
        goTo(0);
        _initialized = true;
        setProgress(100, _isEN ? 'Ready' : 'Prêt');
        setTimeout(hideLoader, 300);
        showIntroScreen();
      }
    })();
  }

  /* ══════════════════════════════════════════════════════
     5b. ÉCRAN D'ACCUEIL DE LA FRISE
     Affiché uniquement quand on arrive sans ?p=Nom (URL nue,
     résultat de recherche Google, lien de nav interne…).
     Laisse choisir un point d'entrée plutôt que de tomber sur
     defaultIndex, une position arbitraire au milieu de la frise.
  ══════════════════════════════════════════════════════ */
  function showIntroScreen() {
    const first = DATA[0];
    const last  = DATA[DATA.length - 1];
    const titleEl = document.querySelector('.frise-header h1');
    const title   = titleEl ? titleEl.textContent.trim() : '';

    const overlay = document.createElement('div');
    overlay.className = 'frise-intro-overlay';
    overlay.innerHTML = `
      <div class="frise-intro-card">
        <div class="frise-intro-eyebrow">${_isEN ? 'Choose your starting point' : 'Choisissez votre point de départ'}</div>
        <h2 class="frise-intro-title">${title}</h2>
        <p class="frise-intro-range">${first.display_date} — ${last.display_date} · ${DATA.length} ${MODE === 'courant' ? (_isEN ? 'movements' : 'courants') : (_isEN ? 'thinkers' : 'penseurs')}</p>
        <div class="frise-intro-actions">
          <button type="button" class="frise-intro-btn frise-intro-btn--start">
            ⟵ ${_isEN ? 'Start from the oldest' : 'Commencer par les plus anciens'}
          </button>
          <button type="button" class="frise-intro-btn frise-intro-btn--end">
            ${_isEN ? 'Most recent' : 'Les plus récents'} ⟶
          </button>
          <button type="button" class="frise-intro-btn frise-intro-btn--list">
            ☰ ${_isEN ? 'Full list' : 'Voir la liste complète'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    function dismiss() {
      overlay.remove();
    }

    overlay.querySelector('.frise-intro-btn--start').addEventListener('click', () => {
      dismiss();
      goTo(0);
    });
    overlay.querySelector('.frise-intro-btn--end').addEventListener('click', () => {
      dismiss();
      goTo(DATA.length - 1);
    });
    overlay.querySelector('.frise-intro-btn--list').addEventListener('click', () => {
      dismiss();
      showFriseListDrawer(title);
    });
  }

  /* ── Mini-drawer "Liste de cette frise" : seulement les entrées de DATA,
     dans l'ordre chronologique (contrairement au drawer "Listes" du footer
     qui montre le corpus entier du site). ── */
  function showFriseListDrawer(title) {
    if (!DATA.length) return;
    const overlay = document.createElement('div');
    overlay.className = 'frise-mini-list-overlay';

    const panel = document.createElement('div');
    panel.className = 'frise-mini-list-panel';
    panel.innerHTML = `
      <div class="frise-mini-list-header">
        <p class="frise-mini-list-eyebrow">${title}</p>
        <h2 class="frise-mini-list-title">${_isEN ? 'All entries' : 'Toutes les entrées'} (${DATA.length})</h2>
        <button type="button" class="frise-mini-list-close" aria-label="${_isEN ? 'Close' : 'Fermer'}">&times;</button>
      </div>
      <div class="frise-mini-list-sort" role="tablist">
        <button type="button" class="frise-mini-list-sort-btn frise-mini-list-sort-btn--active" data-sort="date" role="tab" aria-selected="true">🕐 ${_isEN ? 'Date' : 'Date'}</button>
        <button type="button" class="frise-mini-list-sort-btn" data-sort="alpha" role="tab" aria-selected="false">🔤 ${_isEN ? 'A–Z' : 'A–Z'}</button>
      </div>
      <ul class="frise-mini-list-ul"></ul>`;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const ul       = panel.querySelector('.frise-mini-list-ul');
    const sortBtns = panel.querySelectorAll('.frise-mini-list-sort-btn');

    function render(sort) {
      const order = DATA.map((p, i) => i);
      if (sort === 'alpha') {
        order.sort((a, b) => shortName(DATA[a].name).localeCompare(shortName(DATA[b].name), _isEN ? 'en' : 'fr'));
      }
      ul.innerHTML = order.map(i => `
        <li>
          <button type="button" class="frise-mini-list-item" data-index="${i}">
            <span class="frise-mini-list-name">${DATA[i].name}</span>
            <span class="frise-mini-list-date">${DATA[i].display_date}</span>
          </button>
        </li>`).join('');
      ul.querySelectorAll('.frise-mini-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
          dismiss();
          goTo(parseInt(btn.dataset.index, 10));
        });
      });
    }

    function dismiss() { overlay.remove(); }

    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
    panel.querySelector('.frise-mini-list-close').addEventListener('click', dismiss);
    sortBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sortBtns.forEach(b => {
          b.classList.toggle('frise-mini-list-sort-btn--active', b === btn);
          b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
        });
        render(btn.dataset.sort);
      });
    });

    render('date');
  }

  /* ══════════════════════════════════════════════════════
     6. UTILITAIRES
  ══════════════════════════════════════════════════════ */
  function yearToX(year) {
    return FRISE_PAD + (year - DATA[0].year) * PX_PER_YEAR;
  }

  /* Extrait le nom de famille (partie en MAJUSCULES) pour l'affichage compact */
  function shortName(name) {
    const parts = name.split(/\s+/);
    const upper = parts.filter(p => p.length > 1 && p === p.toUpperCase() && !/\d/.test(p));
    return upper.length ? upper[0] : parts[parts.length - 1];
  }

  function ytThumb(id) {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }

  /* ══════════════════════════════════════════════════════
     7. CONSTRUCTION DE LA FRISE (nav-markers)
  ══════════════════════════════════════════════════════ */
  function buildNav() {
    const wrap  = document.getElementById('navWrap');
    const track = document.getElementById('navTrack');
    track.innerHTML = '';

    const totalW = yearToX(DATA[DATA.length - 1].year) + FRISE_PAD;
    track.style.width = totalW + 'px';

    /* ── Calcul des rangées (algorithme anti-collision) ── */
    const rowMaxX = [];
    const assignments = DATA.map(p => {
      const x    = yearToX(p.year);
      const xMin = x - THUMB_W / 2 - 2;
      let row = 0;
      while (row < rowMaxX.length && rowMaxX[row] > xMin) row++;
      rowMaxX[row] = x + THUMB_W / 2;
      return row;
    });

    const nbRows = rowMaxX.length;
    const trackH = nbRows * ROW_H + GAP_ROW;
    const friseH = trackH + RULE_H;

    wrap.style.height = friseH + 'px';
    track.style.bottom = RULE_H + 'px';
    track.style.height = trackH + 'px';

    /* ── Création des marqueurs ── */
    DATA.forEach((p, i) => {
      const row  = assignments[i];
      const x    = yearToX(p.year);
      const topY = trackH - (row + 1) * ROW_H;
      const filH = trackH - topY - THUMB_H - LABEL_H;

      const m = document.createElement('div');
      m.className     = 'nav-marker';
      m.dataset.index = i;
      m.dataset.year  = p.year;
      m.title = `${p.name} (${p.display_date})`;
      m.setAttribute('role', 'button');
      m.setAttribute('tabindex', '0');
      m.setAttribute('aria-label', `${p.name} (${p.display_date})`);

      if (MODE === 'courant') {
        /* Pas de portrait : cartouche texte seul avec couleur CSS custom property */
        m.style.cssText = `left:${x}px; top:${topY}px; --mc:${p.marker_color};`;
        m.innerHTML = `
          <div class="nav-name">${p.name}</div>
          <div class="nav-tick" style="top:${THUMB_H}px; height:${filH}px;"></div>`;
      } else {
        /* Portrait circulaire + nom tronqué */
        m.style.cssText = `left:${x}px; top:${topY}px;`;
        m.innerHTML = `
          <img class="nav-thumb" ${p.thumbnail ? `src="${p.thumbnail}"` : ''} alt="${p.name}"
               loading="lazy" onerror="this.style.opacity='.3'">
          <div class="nav-name">${shortName(p.name)}</div>
          <div class="nav-tick" style="top:${THUMB_H}px; height:${filH}px;"></div>`;
      }

      m.addEventListener('click', () => goTo(i));
      m.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goTo(i);
        }
      });
      track.appendChild(m);
    });

    buildRule(totalW);
  }

  /* ══════════════════════════════════════════════════════
     8. RÈGLE TEMPORELLE
  ══════════════════════════════════════════════════════ */
  function buildRule(totalW) {
    const rt = document.getElementById('timeRuleTrack');
    if (!rt) return;
    rt.innerHTML = '';
    rt.style.width = totalW + 'px';

    const minY = DATA[0].year;
    const maxY = DATA[DATA.length - 1].year;

    if (MODE === 'courant') {
      /* ── Graduations larges (siècles + demi-siècles) pour les courants ── */
      for (let y = Math.floor(minY / 100) * 100; y <= maxY + 100; y += 100) {
        const div = document.createElement('div');
        div.className  = 'yr century';
        div.style.left = yearToX(y) + 'px';
        div.innerHTML  = `<div class="yr-tick"></div><div class="yr-label">${y}</div>`;
        rt.appendChild(div);
      }
      for (let y = Math.floor(minY / 50) * 50; y <= maxY + 50; y += 50) {
        if (y % 100 === 0) continue;
        const div = document.createElement('div');
        div.className  = 'yr decade';
        div.style.left = yearToX(y) + 'px';
        div.innerHTML  = `<div class="yr-tick"></div><div class="yr-label">${y}</div>`;
        rt.appendChild(div);
      }
      /* Marques de début de courant */
      new Set(DATA.map(p => p.year)).forEach(y => {
        if (y % 50 === 0) return;
        const div = document.createElement('div');
        div.className    = 'yr birth';
        div.dataset.year = y;
        div.style.left   = yearToX(y) + 'px';
        div.innerHTML    = `<div class="yr-tick"></div><div class="yr-label">${y}</div>`;
        rt.appendChild(div);
      });
    } else {
      /* ── Graduations fines (décennies + années de naissance) pour les philosophes ── */
      for (let y = Math.floor(minY / 10) * 10; y <= maxY + 10; y += 10) {
        const div = document.createElement('div');
        div.className  = 'yr ' + (y % 100 === 0 ? 'century' : 'decade');
        div.style.left = yearToX(y) + 'px';
        div.innerHTML  = `<div class="yr-tick"></div><div class="yr-label">${y}</div>`;
        rt.appendChild(div);
      }
      /* Marques de naissance individuelles (hors décennies) */
      new Set(DATA.map(p => p.year)).forEach(y => {
        if (y % 10 === 0) return;
        const div = document.createElement('div');
        div.className    = 'yr birth';
        div.dataset.year = y;
        div.style.left   = yearToX(y) + 'px';
        div.innerHTML    = `<div class="yr-tick"></div><div class="yr-label">${y}</div>`;
        rt.appendChild(div);
      });
    }

    syncRule();
  }

  /* ══════════════════════════════════════════════════════
     9. SYNCHRONISATION RÈGLE / TRACK
  ══════════════════════════════════════════════════════ */
  function syncRule() {
    const nav  = document.getElementById('navTrack');
    const rule = document.getElementById('timeRuleTrack');
    if (!nav || !rule) return;
    rule.style.transition = nav.style.transition || '';
    rule.style.transform  = nav.style.transform  || '';
  }

  function updateRuleDot() {
    document.querySelectorAll('#timeRuleTrack .yr.birth').forEach(el => {
      el.classList.toggle('active-yr', parseInt(el.dataset.year) === DATA[current].year);
    });
  }

  /* ══════════════════════════════════════════════════════
     9bis. LIENS CROISÉS COURANTS ⇄ PHILOSOPHES
  ══════════════════════════════════════════════════════ */

  /* Parseur d'années depuis un champ date ("1818 - 1883", "-334 A JC - 262 A JC", "1845"…) */
  function _parseYears(d) {
    if (!d) return null;
    var s = String(d).replace(/–|—/g, '|');
    var parts = s.split(/\||\s+-\s+/);
    if (parts.length === 1) {
      parts = s.replace(/(\d)-(\d)/g, '$1|$2').split('|');
    }
    var segRe = /(-\s*)?(\d+)\s*(A\s*JC|AJC|av\.\s*J\.-C\.|BC|bc)?/i;
    var years = [];
    for (var i = 0; i < parts.length; i++) {
      var m = segRe.exec(parts[i].trim());
      if (!m) continue;
      var yr = parseInt(m[2], 10);
      if (m[1] || m[3]) yr = -Math.abs(yr);
      years.push(yr);
    }
    if (!years.length) return null;
    return { born: years[0], died: years.length > 1 ? years[years.length - 1] : years[0] };
  }

  /* Retourne les N philosophes du site les plus représentatifs d'un courant.
     Priorité 1 : figures_cles éditoriales (entry.fc), dans l'ordre indiqué —
     un tri chronologique ne peut pas deviner qui sont les figures les plus
     emblématiques d'un courant qui s'étale sur plusieurs générations
     (ex. Marxisme : Marx lui-même perdait face à ses disciples plus proches
     dans le temps de la date de fondation du courant).
     Priorité 2 (complément) : période de 40 ans la plus dense en naissances
     parmi les philosophes restants — capture "l'âge d'or" du courant plutôt
     que sa seule date d'origine. */
  function _getRepresentants(courantName, figuresCles, n) {
    if (!SEARCH_INDEX.length) return { total: 0, top: [] };
    var matches = SEARCH_INDEX.filter(function (p) {
      return p.y !== 'courant' && p.cur && p.cur.indexOf(courantName) !== -1;
    });
    if (!matches.length) return { total: 0, top: [] };

    var top = [];
    var used = {};
    (figuresCles || []).forEach(function (name) {
      if (top.length >= n) return;
      var found = matches.find(function (p) { return p.n === name && !used[p.n]; });
      if (found) { top.push(found); used[found.n] = true; }
    });

    if (top.length < n) {
      var rest = matches.filter(function (p) { return !used[p.n]; });
      var withDates = rest.map(function (p) {
        var dt = _parseYears(p.d) || { born: 0, died: 0 };
        return { p: p, born: dt.born };
      }).filter(function (r) { return r.born; });

      if (withDates.length) {
        var windowSize = 40, best = null;
        withDates.forEach(function (r) {
          var lo = r.born - windowSize / 2, hi = r.born + windowSize / 2;
          var count = withDates.filter(function (q) { return q.born >= lo && q.born <= hi; }).length;
          if (!best || count > best.count) best = { center: r.born, count: count };
        });
        withDates.forEach(function (r) { r._dist = Math.abs(r.born - best.center); });
        withDates.sort(function (a, b) { return a._dist - b._dist; });
        withDates.forEach(function (r) {
          if (top.length >= n) return;
          top.push(r.p); used[r.p.n] = true;
        });
      }
      /* Reliquat sans date exploitable : complète en dernier recours */
      if (top.length < n) {
        rest.filter(function (p) { return !used[p.n]; }).forEach(function (p) {
          if (top.length >= n) return;
          top.push(p); used[p.n] = true;
        });
      }
    }

    return { total: matches.length, top: top };
  }

  /* Retourne l'entrée d'index (avec .u = URL de la frise) pour un nom de courant exact */
  function _getCourantEntry(courantName) {
    if (!SEARCH_INDEX.length) return null;
    return SEARCH_INDEX.find(function (p) { return p.y === 'courant' && p.n === courantName; }) || null;
  }

  /* Construit le HTML des badges de liens croisés pour une entrée (philosophe ou courant) */
  function _buildCrossLinksHtml(entry) {
    /* Astro : le HTML est déjà pré-calculé à la build (voir [frise].json.ts) */
    if (typeof entry.crossLinksHtml === 'string') return entry.crossLinksHtml;

    if (!SEARCH_INDEX.length) return '';

    if (MODE === 'philosophe') {
      /* Philosophe → ses courants (liens cliquables vers la frise du courant) */
      var courants = entry.courants || entry.cur || [];
      if (!courants.length) return '';
      var links = courants.map(function (c) {
        var ce = _getCourantEntry(c);
        if (!ce) return '<span class="cross-link-badge cross-link-badge--plain">' + c + '</span>';
        var sep = ce.u.indexOf('?') !== -1 ? '&' : '?';
        var href = ce.u + sep + 'p=' + encodeURIComponent(c) + (_isEN ? '&lang=en' : '');
        return '<a class="cross-link-badge" href="' + href + '">' + c + '</a>';
      }).join('');
      var label = _isEN ? 'Schools of thought' : 'Courants de pensée';
      return '<div class="cross-links"><span class="cross-links-label">' + label + '</span><div class="cross-links-list">' + links + '</div></div>';
    }

    if (MODE === 'courant') {
      /* Courant → ses principaux représentants (max 4, liens cliquables vers la fiche du philosophe) */
      var res = _getRepresentants(entry.name, entry.figures_cles, 4);
      if (!res || !res.top.length) return '';
      var repLinks = res.top.map(function (p) {
        var sep = p.u.indexOf('?') !== -1 ? '&' : '?';
        var href = p.u + sep + 'p=' + encodeURIComponent(p.n) + (_isEN ? '&lang=en' : '');
        return '<a class="cross-link-badge" href="' + href + '">' + p.n + '</a>';
      }).join('');
      var label2 = _isEN ? 'Key representatives' : 'Principaux représentants';
      return '<div class="cross-links"><span class="cross-links-label">' + label2 + '</span><div class="cross-links-list">' + repLinks + '</div></div>';
    }

    return '';
  }

  /* ══════════════════════════════════════════════════════
     10. CONSTRUCTION DES SLIDES
  ══════════════════════════════════════════════════════ */
  function buildSlides() {
    const container = document.getElementById('slidesContainer');
    container.innerHTML = '';

    DATA.forEach((p, i) => {
      const slide = document.createElement('div');
      slide.className   = 'slide';
      slide.dataset.index = i;

      /* ── Bloc média ── */
      let mediaHtml = '';
      if (p.yt_id) {
        const thumb = ytThumb(p.yt_id);
        mediaHtml = `
        <div class="yt-lazy" data-ytid="${p.yt_id}" role="button"
             tabindex="0" aria-label="Lire la vidéo — ${p.name}">
          <img src="${thumb}" alt="Vidéo — ${p.name}" loading="lazy"
               onerror="this.closest('.yt-lazy').style.display='none'">
          <div class="yt-play-btn">
            <div class="yt-play-icon">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <iframe title="Vidéo — ${p.name}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"></iframe>
        </div>`;
      } else if (p.image_media) {
        /* Pas de vidéo mais image_media renseignée → cadre identique à la vidéo (16:9), image non rognée */
        mediaHtml = `
        <div class="slide-media-frame">
          <img class="slide-media-img" src="${p.image_media}" alt="${p.name}"
               loading="lazy" onerror="this.closest('.slide-media-frame').style.display='none'">
        </div>`;
      } else if (MODE === 'courant') {
        /* Bandeau couleur pleine avec nom du courant en vertical */
        mediaHtml = `
        <div class="slide-era-badge" style="--mc:${p.marker_color}">
          <div class="slide-era-name">${p.name}</div>
          <div class="slide-era-period">${p.era_label}</div>
        </div>`;
      }

      /* ── Extraction des balises <audio> du texte ── */
      const audioBlocks = [];
      const textWithoutAudio = p.text.replace(/<audio[\s\S]*?<\/audio>/gi, match => {
        const tmp = document.createElement('div');
        tmp.innerHTML = match;
        const audioEl = tmp.querySelector('audio');
        const src     = audioEl?.querySelector('source')?.getAttribute('src') || '';
        const title   = audioEl?.getAttribute('title') || (_isEN ? 'Listen to the podcast' : 'Écouter le podcast');
        if (src) audioBlocks.push({ src, title });
        return '';
      });
      const audioBlock = audioBlocks.length ? `
      <div class="slide-audio">
        ${audioBlocks.map(a => `
        <button class="audio-lazy-btn"
                data-src="${a.src}"
                data-title="${a.title.replace(/"/g, '&quot;')}">
          <span class="audio-lazy-btn-icon">🎧</span>
          <span>${a.title}</span>
        </button>`).join('')}
      </div>` : '';

      slide.innerHTML = `
      <div class="slide-media${MODE === 'philosophe' && !mediaHtml ? ' no-media' : ''}">
        ${MODE === 'philosophe' ? `<img class="slide-portrait" src="${p.thumbnail}" alt="${p.name}"
             onerror="this.style.display='none'">` : ''}
        ${mediaHtml}
        ${p.media_credit  ? `<div class="slide-credit">${p.media_credit}</div>`  : ''}
      </div>
      <div class="slide-text">
        <div class="slide-text-inner">
          <h2 class="slide-headline">${p.name}</h2>
          <div class="slide-dates">${p.display_date}</div>
          <div class="slide-body">${textWithoutAudio}</div>
        </div>
        ${audioBlock}
        ${_buildCrossLinksHtml(p)}
      </div>`;

      container.appendChild(slide);
      _buildDrawer(slide.querySelector('.slide-media')); /* drawer injecté dans le DOM dès la construction */

      /* Nettoyer les couleurs inline héritées d'Excel + interception drawer */
      slide.querySelectorAll('.slide-body a').forEach(a => {
        a.style.removeProperty('color');
        a.setAttribute('rel', 'noopener noreferrer');
        a.addEventListener('click', e => {
          e.preventDefault();
          var href = a.href;
          var _popup = function(u) {
            window.open(u, 'popup',
              'width=900,height=600,left=50,top=550,' +
              'scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes');
          };
          /* PDF → popup en bas à gauche */
          if (/\.pdf(\?.*)?$/i.test(href)) {
            _popup(href);
            return;
          }
          /* Domaines iframe-hostiles → popup en bas à gauche */
          try {
            var host = new URL(href).hostname.replace(/^www\./, '');
            if (IFRAME_BLOCKED_DOMAINS.some(function(d){ return host === d || host.endsWith('.' + d); })) {
              _popup(href);
              return;
            }
          } catch(e) {}
          /* Cas général → drawer interne */
          var label = a.textContent.trim() || href;
          openDrawer(href, label);
        });
      });
    });

    /* ── Délégation : boutons YouTube ── */
    container.addEventListener('click', e => {
      const lazy = e.target.closest('.yt-lazy');
      if (!lazy || lazy.classList.contains('loaded')) return;
      const ifr = lazy.querySelector('iframe');
      ifr.src = `https://www.youtube-nocookie.com/embed/${lazy.dataset.ytid}?autoplay=1&rel=0&modestbranding=1`;
      lazy.classList.add('loaded');
      /* Arrêter France Culture si actif */
      document.querySelectorAll('.audio-player-bar').forEach(bar => {
        const a = bar.querySelector('audio');
        if (a) { a.pause(); a.src = ''; }
        bar.remove();
      });
      if (window.AudioManager) window.AudioManager.onSiteYouTubeStart();
    });

    /* ── Délégation : boutons audio lazy → lecteur audio dédié ── */
    container.addEventListener('click', e => {
      const btn = e.target.closest('.audio-lazy-btn');
      if (!btn) return;
      openAudioPlayer(btn.dataset.src, btn.dataset.title);
    });
    container.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const lazy = e.target.closest('.yt-lazy');
      if (!lazy || lazy.classList.contains('loaded')) return;
      lazy.click();
    });

    /* ── Délégation : liens croisés (Courants de pensée / Principaux représentants)
       → coupe les médias en cours avant de quitter la page ── */
    container.addEventListener('click', e => {
      const link = e.target.closest('.cross-link-badge');
      if (!link || !link.href) return;
      if (window.AudioManager) window.AudioManager.stopAll();
    });
  }

  /* ══════════════════════════════════════════════════════
     10b. DRAWER — panneau latéral gauche
  ══════════════════════════════════════════════════════ */

  /* Références DOM du drawer (initialisées par initDrawer) */
  let _drawerEl      = null;
  let _drawerOverlay = null;
  let _drawerContent = null;
  let _drawerTitle   = null;
  let _drawerLabel   = null;

  const _BLOCKED_STATIC = new Set(['persee.fr', 'academia.edu', 'jstor.org', 'cairn.info']);

  function initDrawer() {
    /* Fermeture au clavier (Échap) */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _drawerEl && _drawerEl.classList.contains('open')) closeDrawer();
    });
  }

  /* ── Crée un drawer complet et l'injecte dans une .slide-media ── */
  function _buildDrawer(slideMedia) {
    const drawer = document.createElement('div');
    drawer.className = 'link-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', _isEN ? 'Link information' : 'Informations sur le lien');

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(180,130,20,.5);margin-bottom:.15rem;';

    const labelEl = document.createElement('div');
    labelEl.className = 'drawer-label';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'drawer-title';
    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(labelEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'drawer-close';
    closeBtn.setAttribute('aria-label', _isEN ? 'Close' : 'Fermer');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', closeDrawer);

    const header = document.createElement('div');
    header.className = 'drawer-header';
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'drawer-content';

    drawer.appendChild(header);
    drawer.appendChild(content);
    slideMedia.appendChild(drawer); /* injecté dans le DOM dès la construction du slide */
  }

  function closeDrawer() {
    if (!_drawerEl) return;
    _drawerEl.classList.remove('open');

    /* Stopper l'audio en cours */
    const audio = _drawerContent.querySelector('audio');
    if (audio) { audio.pause(); audio.src = ''; }

    /* Stopper toutes les iframes (YouTube + externe) */
    if (_drawerContent.querySelector('iframe')) {
      if (window.AudioManager) window.AudioManager.onSiteYouTubeStop();
    }
    _drawerContent.querySelectorAll('iframe').forEach(f => { f.src = ''; });

    /* Vider le contenu après la transition */
    setTimeout(() => {
      if (!_drawerEl.classList.contains('open')) _drawerContent.innerHTML = '';
    }, 340);
  }

  /* ── Détection du type de lien ── */
  function detectLinkType(url) {
    try {
      const u = new URL(url);
      const h = u.hostname.replace(/^www\./, '');
      if (h.includes('wikipedia.org'))          return 'wikipedia';
      if (h === 'youtube.com' || h === 'youtu.be') return 'youtube';
      if (h.includes('radiofrance') ||
          h.includes('france.culture') ||
          u.pathname.match(/\.mp3(\?|$)/i))     return 'audio';
    } catch (_) { /* URL relative ou invalide → externe */ }
    return 'external';
  }

  /* ── Extraction de l'ID YouTube depuis n'importe quel format d'URL ── */
  function extractYtId(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
      return u.searchParams.get('v') || u.pathname.split('/').pop();
    } catch (_) { return null; }
  }

  /* ── Ouverture du drawer avec le bon contenu ── */
  function openDrawer(url, label) {
    const type = detectLinkType(url);

    /* ── Lien externe bloqué : banderole. Sinon : iframe dans le drawer ── */
    if (type === 'external') {
      try {
        const h = new URL(url).hostname;
        if ([..._BLOCKED_STATIC].some(d => h === d || h.endsWith('.' + d))) {
          _showLinkBanner(url, label); return;
        }
      } catch (_) {}
    }

    /* Trouver le drawer déjà injecté dans la .slide-media du slide actif */
    const slideMedia = document.querySelector(`.slide[data-index="${current}"] .slide-media`);
    if (!slideMedia) return;
    _drawerEl      = slideMedia.querySelector('.link-drawer');
    if (!_drawerEl) return;
    _drawerContent = _drawerEl.querySelector('.drawer-content');
    _drawerTitle   = _drawerEl.querySelector('.drawer-title > div:first-child');
    _drawerLabel   = _drawerEl.querySelector('.drawer-label');

    /* Labels du type dans l'en-tête */
    const typeLabels = _isEN ? {
      wikipedia: 'Wikipedia',
      youtube:   'YouTube Video',
      audio:     'France Culture — Audio',
      external:  'External link',
    } : {
      wikipedia: 'Wikipédia',
      youtube:   'Vidéo YouTube',
      audio:     'France Culture — Audio',
      external:  'Lien externe',
    };
    _drawerTitle.textContent = typeLabels[type] || 'Lien';
    _drawerLabel.textContent = label || url;

    /* Réinitialiser les classes d'état du contenu */
    _drawerContent.classList.remove('flush', 'centered');

    /* Spinner initial */
    _drawerContent.innerHTML = `
      <div class="drawer-loading">
        <div class="drawer-spinner"></div>
        <div class="drawer-loading-label">${_isEN ? 'Loading…' : 'Chargement…'}</div>
      </div>`;

    /* Ouvrir */
    _drawerEl.classList.add('open');

    /* ── Audio : lecteur dédié, pas de drawer ── */
    if (type === 'audio') { openAudioPlayer(url, label); return; }

    /* Mobile portrait : .slide-media est empilé au-dessus de .slide-text,
       donc le drawer s'ouvre hors champ si on ne scrolle pas vers lui */
    slideMedia.scrollIntoView({ behavior: 'smooth', block: 'start' });

    /* ── Contenu selon le type ── */
    if (type === 'youtube')   _drawerContent.classList.add('flush');
    if (type === 'wikipedia') _drawerContent.classList.add('flush');

    if (type === 'wikipedia') {
      _loadWikipedia(url, label);
    } else if (type === 'youtube') {
      _loadYoutube(url, label);
    } else if (type === 'audio') {
      _loadAudio(url, label);
    } else {
      _loadExternal(url, label);
    }
  }

  /* ── Wikipedia : page complète via action=parse ── */
  function _loadWikipedia(url, label) {
    try {
      const u    = new URL(url);
      const lang = u.hostname.split('.')[0];
      const title = decodeURIComponent(u.pathname.replace(/^\/wiki\//, ''));
      const apiUrl = `https://${lang}.wikipedia.org/w/api.php`
        + `?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;

      fetch(apiUrl)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
          const rawHtml = data.parse && data.parse.text && data.parse.text['*'];
          if (!rawHtml) throw new Error('empty');

          /* Réécriture des liens et images dans un fragment temporaire */
          const tmp = document.createElement('div');
          tmp.innerHTML = rawHtml;

          tmp.querySelectorAll('a[href]').forEach(a => {
            const h = a.getAttribute('href');
            if (!h) return;
            if (h.startsWith('/wiki/'))
              a.setAttribute('href', `https://${lang}.wikipedia.org${h}`);
            else if (h.startsWith('/w/'))
              a.setAttribute('href', `https://${lang}.wikipedia.org${h}`);
            else if (h.startsWith('//'))
              a.setAttribute('href', 'https:' + h);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });

          /* Images : src "//upload..." → "https://upload..." */
          tmp.querySelectorAll('img[src]').forEach(img => {
            const s = img.getAttribute('src');
            if (s && s.startsWith('//')) img.setAttribute('src', 'https:' + s);
          });

          /* Supprimer éléments parasites */
          tmp.querySelectorAll(
            '.mw-editsection, #toc, .toc, .navbox, .noprint, ' +
            '.mw-jump-link, .sistersitebox, .ambox, .mbox-small'
          ).forEach(el => el.remove());

          _drawerContent.innerHTML = `
            <div class="drawer-wiki-full" style="padding:.9rem 1rem 1.2rem">
              ${tmp.innerHTML}
            </div>
            <div class="drawer-wiki-source" style="padding:.6rem 1rem .8rem">
              <a href="${url}" target="_blank" rel="noopener noreferrer">
                ${_isEN ? 'View full article on Wikipedia ↗' : 'Voir l\'article complet sur Wikipédia ↗'}
              </a>
            </div>`;
        })
        .catch(() => _showExternalFallback(url, label, _isEN ? 'Unable to load Wikipedia article.' : 'Impossible de charger l\'article Wikipédia.'));
    } catch (_) {
      _showExternalFallback(url, label);
    }
  }

  /* ── YouTube : iframe nocookie avec autoplay ── */
  function _loadYoutube(url, label) {
    const ytId = extractYtId(url);
    if (!ytId) { _loadExternal(url, label); return; }

    _drawerContent.innerHTML = `
      <div class="drawer-yt-wrap">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1"
          title="${label || 'Vidéo YouTube'}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen">
        </iframe>
      </div>`;
    if (window.AudioManager) window.AudioManager.onSiteYouTubeStart();
  }

  /* ── Helper : formate un temps en "M:SS" ── */
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    const m  = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  const SVG_PLAY  = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const SVG_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  /* ── Lecteur audio custom (barre bas du panneau texte) ── */
  function openAudioPlayer(src, label) {
    /* Fermer tout lecteur déjà ouvert */
    document.querySelectorAll('.audio-player-bar').forEach(bar => {
      const a = bar.querySelector('audio');
      if (a) { a.pause(); a.src = ''; }
      bar.remove();
    });
    /* Arrêter les iframes YouTube du site */
    document.querySelectorAll('.link-drawer iframe, .yt-lazy iframe, .youtube-container iframe, .drawer-yt-wrap iframe').forEach(f => { f.src = ''; });

    /* Trouver .slide-text du slide actif */
    const slideText = document.querySelector(`.slide[data-index="${current}"] .slide-text`);
    if (!slideText) return;
    const slideAudio = slideText.querySelector('.slide-audio');

    /* Créer la barre */
    const bar = document.createElement('div');
    bar.className = 'audio-player-bar';
    bar.innerHTML = `
      <button class="audio-player-close" aria-label="Fermer">&#10005;</button>
      <div class="audio-player-controls">
        <button class="audio-player-play" aria-label="${_isEN ? 'Play / Pause' : 'Lecture / Pause'}">${SVG_PLAY}</button>
        <div class="audio-player-progress" role="slider" tabindex="0" aria-label="${_isEN ? 'Progress' : 'Progression'}">
          <div class="audio-player-progress-fill"></div>
        </div>
        <div class="audio-player-time">0:00 / 0:00</div>
      </div>`;

    /* Créer l'élément <audio> maintenant (lazy — au clic bouton) */
    const audio = document.createElement('audio');
    audio.src     = src;
    audio.preload = 'metadata';
    bar.appendChild(audio);

    const playBtn  = bar.querySelector('.audio-player-play');
    const fill     = bar.querySelector('.audio-player-progress-fill');
    const timeEl   = bar.querySelector('.audio-player-time');
    const progress = bar.querySelector('.audio-player-progress');
    const closeBtn = bar.querySelector('.audio-player-close');

    /* Play / Pause */
    playBtn.addEventListener('click', () => {
      if (audio.paused) audio.play();
      else audio.pause();
    });
    audio.addEventListener('play',  () => { playBtn.innerHTML = SVG_PAUSE; if (window.AudioManager) window.AudioManager.onFranceCultureStart(); });
    audio.addEventListener('pause', () => { playBtn.innerHTML = SVG_PLAY; });
    audio.addEventListener('ended', () => { playBtn.innerHTML = SVG_PLAY; fill.style.width = '0%'; if (window.AudioManager) window.AudioManager.onFranceCultureEnd(); });

    /* Progression */
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
      timeEl.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
    });
    audio.addEventListener('loadedmetadata', () => {
      timeEl.textContent = `0:00 / ${fmtTime(audio.duration)}`;
    });

    /* Seek (clic sur la barre) */
    progress.addEventListener('click', e => {
      if (!audio.duration) return;
      const rect = progress.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });

    /* Fermer */
    closeBtn.addEventListener('click', () => {
      audio.pause(); audio.src = '';
      bar.remove();
    });

    if (slideAudio) slideAudio.after(bar);
    else slideText.appendChild(bar);
    audio.play().catch(() => { /* autoplay bloqué par le navigateur — l'utilisateur clique play */ });
  }

  /* ── Lien externe autorisé : iframe pleine zone ── */
  function _loadExternal(url, label) {
    _drawerContent.classList.add('flush');
    _drawerContent.innerHTML = `
      <div class="drawer-iframe-wrap">
        <iframe class="drawer-iframe"
          src="${url}"
          title="${(label || url).replace(/"/g, '&quot;')}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
        </iframe>
      </div>`;
  }

  /* ── Lien externe bloqué : banderole au bas de .slide-media ── */
  function _showLinkBanner(url, label) {
    const slideMedia = document.querySelector(`.slide[data-index="${current}"] .slide-media`);
    if (!slideMedia) return;

    /* Supprimer une banderole précédente si elle existe */
    const old = slideMedia.querySelector('.link-banner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.className = 'link-banner';
    banner.innerHTML = `
      <span class="link-banner-icon">🔗</span>
      <span class="link-banner-label">${label || url}</span>
      <button class="link-banner-visit">Visiter →</button>
      <button class="link-banner-close" aria-label="Fermer">✕</button>`;

    banner.querySelector('.link-banner-visit').addEventListener('click', () => {
      window.open(
        url, 'popup',
        'width=900,height=600,left=50,top=550,' +
        'scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes'
      );
    });

    banner.querySelector('.link-banner-close').addEventListener('click', () => {
      banner.classList.remove('open');
      setTimeout(() => banner.remove(), 300);
    });

    slideMedia.appendChild(banner);
    banner.getBoundingClientRect(); /* reflow pour déclencher la transition */
    banner.classList.add('open');

    /* Mobile portrait : .slide-media est empilé au-dessus de .slide-text */
    slideMedia.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Message "site bloqué" + bouton popup navigateur ── */
  function _showExternalFallback(url, label, message) {
    _drawerContent.classList.remove('flush');
    _drawerContent.classList.add('centered');

    _drawerContent.innerHTML = `
      <div class="drawer-blocked-inline">
        <div class="drawer-blocked-inline-icon">🔒</div>
        <p class="drawer-blocked-inline-text">
          ${message || (_isEN ? 'This site cannot be displayed here.' : 'Ce site ne peut pas être affiché ici.')}
        </p>
        <button class="drawer-blocked-visit">${_isEN ? 'Open in a window' : 'Ouvrir dans une fenêtre'}</button>
      </div>`;

    _drawerContent.querySelector('.drawer-blocked-visit')
      .addEventListener('click', () => {
        const popupWidth  = 900;
        const popupHeight = 600;
        const left = 50;
        const top  = 550;
        window.open(
          url, 'popup',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},` +
          'scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes'
        );
      });
  }

  /* ══════════════════════════════════════════════════════
     11. NAVIGATION
  ══════════════════════════════════════════════════════ */
  function goTo(index) {
    if (index < 0 || index >= DATA.length) return;

    /* Fermer le drawer immédiatement si ouvert */
    if (_drawerEl && _drawerEl.classList.contains('open')) {
      const audio = _drawerContent.querySelector('audio');
      if (audio) { audio.pause(); audio.src = ''; }
      _drawerContent.querySelectorAll('iframe').forEach(f => { f.src = ''; });
      _drawerEl.classList.remove('open');
      _drawerContent.innerHTML = '';
    }

    /* Couper tout média en cours (audio France Culture + vidéos YouTube) avant de changer de fiche */
    if (window.AudioManager) window.AudioManager.stopAll();

    current = index;
    /* Suggérer le morceau Lairig correspondant à l'ère du philosophe */
    if (window.LairigPlayer && DATA[index]) {
      const _lairigEra = (window.FRISE_CONFIG && window.FRISE_CONFIG.lairigEra)
        ? window.FRISE_CONFIG.lairigEra
        : eraLabel(DATA[index].year);
      window.LairigPlayer.setEra(_lairigEra);
    }
    updateNav();
    updateSlides();
  }

  function updateNav() {
    document.querySelectorAll('.nav-marker').forEach((m, i) =>
      m.classList.toggle('active', i === current));

    const track = document.getElementById('navTrack');
    const wrap  = document.getElementById('navWrap');
    if (!track || !wrap) return;

    /* Centrage : l'année active vient au milieu de la zone visible */
    const centerX = yearToX(DATA[current].year);
    const offset  = wrap.offsetWidth / 2 - centerX;
    track.style.transition = 'transform .35s cubic-bezier(.25,.46,.45,.94)';
    track.style.transform  = `translateX(${offset}px)`;

    syncRule();
    updateRuleDot();

    const counter = document.getElementById('navCounter');
    if (counter) counter.textContent = `${current + 1} / ${DATA.length}`;

    /* ── Barre de contrôle : ⏮ ‹  NOM / DATES  › ⏭  − zoom% + ── */
    const mh = document.getElementById('mobileHeader');
    if (mh) {
      const hp      = current > 0;
      const hn      = current < DATA.length - 1;
      const zoomPct = Math.round(PX_PER_YEAR / PX_DEFAULT * 100);
      mh.innerHTML = `
        <button class="mh-btn first" aria-label="${_isEN ? 'First' : 'Premier'}"
          onclick="window._frise.goTo(0)" ${hp ? '' : 'disabled'}>&#9664;&#9664;</button>
        <button class="mh-btn prev" aria-label="${_isEN ? 'Previous' : 'Précédent'}"
          onclick="window._frise.goTo(${current}-1)" ${hp ? '' : 'disabled'}>&#8249;</button>
        <div class="mh-center">
          <div class="mh-name">${DATA[current].name}</div>
          <div class="mh-dates">${DATA[current].display_date}</div>
        </div>
        <button class="mh-btn next" aria-label="${_isEN ? 'Next' : 'Suivant'}"
          onclick="window._frise.goTo(${current}+1)" ${hn ? '' : 'disabled'}>&#8250;</button>
        <button class="mh-btn last" aria-label="${_isEN ? 'Last' : 'Dernier'}"
          onclick="window._frise.goTo(${DATA.length - 1})" ${hn ? '' : 'disabled'}>&#9654;&#9654;</button>
        <div class="mh-zoom-wrap">
          <button class="mh-btn zoom-out" title="${_isEN ? 'Zoom out' : 'Dézoomer'}"
            onclick="window._frise.zoomFrise(-1)" ${PX_PER_YEAR > PX_MIN ? '' : 'disabled'}>&#8722;</button>
          <div class="mh-zoom-label">${zoomPct}%</div>
          <button class="mh-btn zoom-in" title="${_isEN ? 'Zoom in' : 'Zoomer'}"
            onclick="window._frise.zoomFrise(1)" ${PX_PER_YEAR < PX_MAX ? '' : 'disabled'}>&#43;</button>
        </div>`;
    }
  }

  function updateSlides() {
    const isMobile    = window.innerWidth <= 900;
    const isLandscape = window.innerWidth > window.innerHeight;
    const container   = document.getElementById('slidesContainer');
    const area        = document.getElementById('slideArea');

    if (isMobile && isLandscape) {
      /* ── Paysage mobile : un slide à la fois, layout horizontal ── */
      document.querySelectorAll('.slide').forEach((s, i) => {
        s.style.display    = i === current ? 'flex'   : 'none';
        s.style.flexDirection = 'row';
        s.style.height     = '100%';
        s.style.overflowY  = 'hidden';
      });
      if (area) {
        area.style.overflowY = 'hidden';
        area.scrollTop = 0;
      }
      /* Remettre le container en position normale */
      container.style.transform = 'none';

    } else if (isMobile && !isLandscape) {
      /* ── Portrait mobile : un slide à la fois, layout vertical ── */
      document.querySelectorAll('.slide').forEach((s, i) => {
        s.style.display       = i === current ? 'flex' : 'none';
        s.style.flexDirection = 'column';
        s.style.height        = 'auto';
        s.style.overflowY     = 'auto';
      });
      if (area) {
        area.style.overflowY = 'auto';
        area.scrollTop = 0;
      }
      container.style.transform = 'none';

    } else {
      /* ── Desktop : scroll de page, un slide à la fois (comme portrait mobile) ── */
      document.querySelectorAll('.slide').forEach((s, i) => {
        s.style.display       = i === current ? 'flex' : 'none';
        s.style.flexDirection = 'row';
        s.style.height        = 'auto';
        s.style.overflowY     = 'auto';
      });
      if (area) {
        area.style.overflowY = 'auto';
      }
      container.style.transform = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }


  /* ══════════════════════════════════════════════════════
     12. ZOOM
  ══════════════════════════════════════════════════════ */
  function zoomFrise(dir) {
    const [s1, s2, s3, s4] = CFG.zoomSteps;
    const step = PX_PER_YEAR <= 30  ? s1
               : PX_PER_YEAR <= 60  ? s2
               : PX_PER_YEAR <= 120 ? s3
               : s4;
    PX_PER_YEAR = Math.max(PX_MIN, Math.min(PX_MAX, PX_PER_YEAR + dir * step));
    buildNav();
    updateNav();
  }

  /* ══════════════════════════════════════════════════════
     13. DRAG SOURIS
  ══════════════════════════════════════════════════════ */
  (function () {
    const wrap = document.getElementById('navWrap');
    const trk  = document.getElementById('navTrack');
    let drag = false, sx = 0, startOff = 0;

    function getOff() {
      const m = (trk.style.transform || '').match(/translateX\((-?[\d.]+)px\)/);
      return m ? parseFloat(m[1]) : 0;
    }
    function snap() {
      const off = getOff(), mid = wrap.offsetWidth / 2;
      let best = 0, bestD = Infinity;
      DATA.forEach((p, i) => {
        const d = Math.abs(yearToX(p.year) + off - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      goTo(best);
    }

    wrap.addEventListener('mousedown', e => {
      drag = true; sx = e.clientX; startOff = getOff();
      trk.style.transition = 'none'; syncRule(); wrap.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      trk.style.transform = `translateX(${startOff + e.clientX - sx}px)`;
      syncRule();
    });
    document.addEventListener('mouseup', () => {
      if (!drag) return;
      drag = false; wrap.style.cursor = 'grab'; snap();
    });
  })();

  /* ══════════════════════════════════════════════════════
     14. SWIPE TOUCH
  ══════════════════════════════════════════════════════ */
  (function () {
    /* ── Touch sur la frise ── */
    const wrap = document.getElementById('navWrap');
    const trkT = document.getElementById('navTrack');
    let ntx = 0, nOff = 0;

    function getOffT() {
      const m = (trkT.style.transform || '').match(/translateX\((-?[\d.]+)px\)/);
      return m ? parseFloat(m[1]) : 0;
    }
    wrap.addEventListener('touchstart', e => {
      ntx = e.touches[0].clientX; nOff = getOffT();
      trkT.style.transition = 'none'; syncRule();
    }, { passive: true });
    wrap.addEventListener('touchmove', e => {
      trkT.style.transform = `translateX(${nOff + e.touches[0].clientX - ntx}px)`;
      syncRule();
    }, { passive: true });
    wrap.addEventListener('touchend', () => {
      const off = getOffT(), mid = wrap.offsetWidth / 2;
      let best = 0, bestD = Infinity;
      DATA.forEach((p, i) => {
        const d = Math.abs(yearToX(p.year) + off - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      goTo(best);
    }, { passive: true });

    /* ── Swipe sur la zone slide ── */
    const area = document.getElementById('slideArea');
    let stx = 0, sty = 0;
    area.addEventListener('touchstart', e => {
      stx = e.touches[0].clientX;
      sty = e.touches[0].clientY;
    }, { passive: true });
    area.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - stx;
      const dy = e.changedTouches[0].clientY - sty;
      /* Ne changer de philosophe que si le geste est clairement horizontal */
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        goTo(current + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  })();

  /* ══════════════════════════════════════════════════════
     15. CLAVIER
  ══════════════════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    /* ↑/↓ réservés au scroll natif de la page en desktop — uniquement ←/→ */
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft')  goTo(current - 1);
  });

  /* ══════════════════════════════════════════════════════
  /* ══════════════════════════════════════════════════════
     17. RESIZE
  ══════════════════════════════════════════════════════ */
  window.addEventListener('resize', () => {
    updateSlides();
    updateNav();
  });

  /* ── Correction orientation mobile ── */
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateSlides();
      updateNav();
      const area = document.getElementById('slideArea');
      if (area) area.scrollTop = 0;
    }, 250);
  });

  /* ══════════════════════════════════════════════════════
     18. API PUBLIQUE  (pour les onclick inline du HTML)
         window._frise.goTo(n) / window._frise.zoomFrise(dir)
  ══════════════════════════════════════════════════════ */
  window._frise = { goTo, zoomFrise, showFriseListDrawer: () => showFriseListDrawer(
    document.querySelector('.frise-header h1') ? document.querySelector('.frise-header h1').textContent.trim() : ''
  ) };

  /* ══════════════════════════════════════════════════════
     19. DÉMARRAGE
  ══════════════════════════════════════════════════════ */
  initDrawer();
  loadJSON();

})(); /* fin de la fonction auto-exécutée */

/* ══════════════════════════════════════════════════════════════════════════════
   Bouton "Liste" du footer — mini-liste des entrées de la frise courante
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  var miniBtn = document.getElementById('frise-mini-list-btn');
  if (!miniBtn) return;
  miniBtn.addEventListener('click', function () {
    if (window._frise && window._frise.showFriseListDrawer) window._frise.showFriseListDrawer();
  });
}());

/* ══════════════════════════════════════════════════════════════════════════════
   Drawer "Recherche complète" — accessible depuis le footer de chaque frise
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  var overlay = document.getElementById('frise-list-overlay');
  var drawer  = document.getElementById('frise-list-drawer');
  var btn     = document.getElementById('frise-list-btn');
  var closeBtn= document.getElementById('frise-list-close');
  if (!overlay || !drawer || !btn) return;

  var mounted = false;

  function _doMount() {
    if (mounted) return;
    var mount = document.getElementById('frise-list-mount');
    if (mount && window.PhiSearch) {
      mounted = true;
      window.PhiSearch.mountAll(mount, document.documentElement.lang || 'fr');
    }
  }

  function openDrawer() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (!mounted) {
      /* PhiSearch peut ne pas encore être chargé (defer) — on poll */
      if (window.PhiSearch) { _doMount(); }
      else {
        var t = setInterval(function() {
          if (window.PhiSearch) { clearInterval(t); _doMount(); }
        }, 50);
      }
    }
  }

  function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDrawer();
  });
}());
