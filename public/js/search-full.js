/* ══════════════════════════════════════════════════════════════════════════════
   search-full.js — Recherche complète A→Z / Temporelle (page /recherche/)
   Port de _mountAllPane() (js/search.js sur laphilo.fr original), adapté pour
   consommer un index déjà enrichi à la build (epoque/badge/colorFilter/br
   pré-calculés côté Astro) plutôt que des tables d'URL .html codées en dur.
══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _index = [];
  var _meta = { nats: [], doms: [], doms_cur: [], curs: [] };

  var COLOR_FILTERS = [
    { v: 'oriental', fr: 'Orientaux', grad: '#1e8c3c' },
    { v: 'france', fr: 'Français', grad: 'linear-gradient(180deg,#d21e1e 50%,#1464d2 50%)' },
    { v: 'russe', fr: 'Russes', grad: 'linear-gradient(180deg,#f0b400 50%,#d21e1e 50%)' },
    { v: 'americain', fr: 'Américains', grad: 'linear-gradient(180deg,#f7f4ea 50%,#1464d2 50%)' },
    { v: 'allemand', fr: 'Allemands', grad: 'linear-gradient(180deg,#d0d0d0 50%,#0a0a0a 50%)' },
    { v: 'britannique', fr: 'Britanniques', grad: 'linear-gradient(180deg,#012169 50%,#c8102e 50%)' },
    { v: 'germanophone', fr: 'Germanophones', grad: 'linear-gradient(180deg,#0a0a0a 33%,#d21e1e 33% 66%,#f0b400 66%)' },
    { v: 'arabo-persan', fr: 'Arabo-persans', grad: 'linear-gradient(180deg,#239f40 50%,#f7f4ea 50%)' },
    { v: 'africain', fr: 'Africains', grad: 'linear-gradient(180deg,#e06414 50%,#1e8c3c 50%)' },
    { v: 'hispanique', fr: 'Hispaniques', grad: 'linear-gradient(180deg,#c60b1e 50%,#ffc400 50%)' },
  ];
  var PHILO_COLOR_GROUPS = [
    { fr: 'Par tradition', accent: '#8b3a0f', items: ['france', 'allemand', 'germanophone', 'britannique', 'americain', 'hispanique', 'russe', 'oriental', 'arabo-persan', 'africain'] },
  ];
  var TRADITION_RULES = {
    france: { nats: ['Française'] },
    allemand: { nats: ['Allemande'] },
    americain: { nats: ['Américaine'] },
    russe: { nats: ['Russe'] },
    britannique: { nats: ['Britannique'] },
    'germanophone': { nats: ['Allemande', 'Autrichienne', 'Suisse'], exclude: ['Jean Jacques ROUSSEAU', 'Charles BONNET', 'Charles SECRÉTAN'] },
    'arabo-persan': { nats: ['Arabe', 'Perse', 'Syrienne', 'Marocaine', 'Tunisienne', 'Afghane'] },
    'africain': { nats: ['Camerounaise', 'Ghanéenne', 'Sénégalaise', 'Nigériane', 'Congolaise', 'Béninoise', 'Éthiopienne', 'Sud-Africaine'] },
    'hispanique': { nats: ['Espagnole', 'Argentine', 'Uruguayenne', 'Mexicaine', 'Portugaise'] },
  };
  function pillValue(v) {
    return TRADITION_RULES[v] ? 'trad:' + v : v;
  }
  var VIRTUAL_FRISE_LINKS = {
    france: { href: '/philosophes/frise/francais-toutes-epoques/', fr: 'Voir la frise de tous les philosophes français' },
    allemand: { href: '/philosophes/frise/allemands-toutes-epoques/', fr: 'Voir la frise de tous les philosophes allemands' },
    americain: { href: '/philosophes/frise/americains-toutes-epoques/', fr: 'Voir la frise de tous les philosophes américains' },
    russe: { href: '/philosophes/frise/russes-toutes-epoques/', fr: 'Voir la frise de tous les philosophes russes' },
    britannique: { href: '/philosophes/frise/britanniques-toutes-epoques/', fr: 'Voir la frise de tous les philosophes britanniques' },
    'germanophone': { href: '/philosophes/frise/germanophones-toutes-epoques/', fr: "Voir la frise des philosophes germanophones" },
    'arabo-persan': { href: '/philosophes/frise/arabo-persans-toutes-epoques/', fr: "Voir la frise des philosophes du monde arabo-persan" },
    'africain': { href: '/philosophes/frise/africains-toutes-epoques/', fr: "Voir la frise des philosophes africains" },
    'hispanique': { href: '/philosophes/frise/hispaniques-toutes-epoques/', fr: "Voir la frise des philosophes hispaniques" },
  };
  function colorDef(v) {
    return COLOR_FILTERS.filter(function (c) { return c.v === v; })[0];
  }
  var COURANT_COLOR_FILTERS = [
    { v: 'courant-occ', fr: 'Occidental', grad: '#0e6882' },
    { v: 'courant-ori', fr: 'Oriental', grad: '#6e2e9a' },
  ];
  var COURANT_SUBERAS = {
    'courant-occ': [
      { v: 'actuel', fr: 'Actuel', epoques: ['actuels'] },
      { v: 'moderne', fr: 'Moderne', epoques: ['renaissance', 'modernes'] },
      { v: 'antique', fr: 'Antique', epoques: ['antiquite', 'moyenage'] },
    ],
    'courant-ori': [
      { v: 'moderne', fr: 'Moderne', epoques: ['modernes', 'actuels'] },
      { v: 'ancien', fr: 'Ancien', epoques: ['antiquite', 'moyenage', 'renaissance'] },
    ],
  };
  var CUR_FAMILY_LABELS = {
    antiquite: 'Antiquité',
    religieux: 'Religieux',
    scolastique: 'Scolastique',
    rationalisme: 'Rationalisme',
    empirisme: 'Empirisme',
    politique: 'Politique',
    contemporain: 'Contemporain',
  };
  var EPOQUE_LABELS = {
    antiquite: 'Antiquité',
    moyenage: 'Moyen Âge',
    renaissance: 'Renaissance',
    modernes: 'Modernes',
    actuels: 'Actuels',
  };
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var PAGE_SIZE = 60;

  function normalize(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ');
  }
  function familyName(name) {
    var m = name.match(/\b([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÆŒÇ][A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÆŒÇ\-']+)\b/);
    return m ? m[1] : name;
  }
  function stripAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function parseDates(d) {
    if (!d) return null;
    var s = d.replace(/–|—/g, '|');
    var parts = s.split(/\||\s+-\s+/);
    if (parts.length === 1) parts = s.replace(/(\d)-(\d)/g, '$1|$2').split('|');
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
  function inYearRange(p, from, to) {
    var dt = parseDates(p.d);
    if (!dt) return true;
    var born = dt.born, died = dt.died;
    if (born === died) { born -= 50; died += 50; }
    if (from !== null && died < from) return false;
    if (to !== null && born > to) return false;
    return true;
  }
  function yearOf(p) {
    return typeof p.year === 'number' ? p.year : 99999;
  }
  function curBadgesHtml(curs) {
    if (!curs || !curs.length) return '';
    return '<span class="phi-cur-badges">' + curs.map(function (c) {
      return '<span class="phi-cur-badge" title="' + c + '">' + c + '</span>';
    }).join('') + '</span>';
  }
  function domHue(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function curDomBadgeHtml(doms) {
    if (!doms || !doms.length) return '';
    return '<span class="phi-cur-badges">' + doms.map(function (name) {
      return '<span class="phi-cur-dom-tag" style="--dom-hue:' + domHue(name) + '" title="' + name + '">' + name + '</span>';
    }).join('') + '</span>';
  }

  function matchesColorFilter(p, color) {
    if (!color) return true;
    if (color.indexOf('trad:') === 0) {
      var rule = TRADITION_RULES[color.slice(5)];
      return rule.nats.indexOf(p.nat) !== -1 && (!rule.exclude || rule.exclude.indexOf(p.n) === -1);
    }
    if (color === 'oriental' && p.isOriental) return true;
    return p.colorFilter === color;
  }
  function matchesCourantColorFilter(p, color) {
    if (!color) return true;
    return p.colorFilter === color;
  }

  function getNatsCursForTradition(trad, dom) {
    var nats = {}, curs = {};
    _index.forEach(function (p) {
      if (p.y === 'courant') return;
      var match = (trad === 'oriental' && p.isOriental)
        || (trad === 'russe' && p.isRusse)
        || (trad === 'occidental' && !p.isOriental && !p.isRusse)
        || !trad;
      if (!match) return;
      if (dom && (!p.dom || p.dom.indexOf(dom) === -1)) return;
      if (p.nat) nats[p.nat] = true;
      if (p.cur) p.cur.forEach(function (c) { curs[c] = true; });
    });
    return { nats: Object.keys(nats).sort(), curs: Object.keys(curs).sort() };
  }

  function mountAll(container) {
    var uid = 'pall' + Math.random().toString(36).slice(2, 8);

    var subOpts = {
      philosophes: [
        { v: 'phi-all', lbl: 'Tous les philosophes' },
        { v: 'phi-occ', lbl: 'Philosophe occidental' },
        { v: 'phi-ori', lbl: 'Philosophe oriental' },
        { v: 'phi-rus', lbl: 'Philosophe russe' },
      ],
      courants: [
        { v: 'courant-all', lbl: 'Tous les courants' },
        { v: 'courant-occ', lbl: 'Pensée occidentale' },
        { v: 'courant-ori', lbl: 'Pensée orientale / russe' },
      ],
    };

    container.innerHTML =
      '<div class="phi-all">' +
      '<div class="phi-all-mode-tabs phi-all-type-tabs" role="tablist" aria-label="Type de recherche">' +
      '<button type="button" class="phi-all-mode-tab" data-primary="philosophes" role="tab" aria-selected="false">🏛️ Philosophes</button>' +
      '<button type="button" class="phi-all-mode-tab" data-primary="courants" role="tab" aria-selected="false">🌿 Courants</button>' +
      '</div>' +
      '<div class="phi-all-mode-tabs" role="tablist" aria-label="Ordre d\'affichage">' +
      '<button type="button" class="phi-all-mode-tab phi-all-mode-tab--active" data-mode="alpha" role="tab" aria-selected="true">🔤 Alphabétique</button>' +
      '<button type="button" class="phi-all-mode-tab" data-mode="time" role="tab" aria-selected="false">🕐 Temporelle</button>' +
      '</div>' +
      '<div class="phi-all-bar">' +
      '<span class="phi-search-icon" aria-hidden="true">🔍</span>' +
      '<input class="phi-all-input" type="search" autocomplete="off" spellcheck="false" placeholder="Rechercher…" aria-label="Rechercher dans la liste complète">' +
      '<button class="phi-search-clear" aria-label="Effacer" hidden>✕</button>' +
      '</div>' +
      '<div class="phi-all-filter-row">' +
      '<span class="phi-all-filter-lbl">Époque</span>' +
      '<select class="phi-all-select" id="' + uid + '-era-sel">' +
      '<option value="">— Toutes époques —</option>' +
      '<option value="actuels">Actuels</option>' +
      '<option value="antiquite">Antiquité</option>' +
      '<option value="moyenage">Moyen Âge</option>' +
      '<option value="renaissance">Renaissance</option>' +
      '<option value="modernes">Modernes</option>' +
      '</select></div>' +
      '<div class="phi-all-filter-row phi-all-nat-row">' +
      '<span class="phi-all-filter-lbl">Nationalité</span>' +
      '<select class="phi-all-select" id="' + uid + '-nat-sel"><option value="">— Toutes origines —</option></select></div>' +
      '<div class="phi-all-filter-row">' +
      '<span class="phi-all-filter-lbl">Branche</span>' +
      '<select class="phi-all-select" id="' + uid + '-dom-sel"><option value="">— Toutes branches —</option></select></div>' +
      '<div class="phi-all-filter-row phi-all-cur-row">' +
      '<span class="phi-all-filter-lbl">Courant</span>' +
      '<select class="phi-all-select" id="' + uid + '-cur-sel"><option value="">— Tous courants —</option></select></div>' +
      '<div class="phi-all-filter-row">' +
      '<span class="phi-all-filter-lbl">Période</span>' +
      '<div class="phi-all-year-wrap">' +
      '<input class="phi-year-input" id="' + uid + '-year-from" type="number" placeholder="De" min="-700" max="2030" step="1">' +
      '<span class="phi-year-sep">à</span>' +
      '<input class="phi-year-input" id="' + uid + '-year-to" type="number" placeholder="À" min="-700" max="2030" step="1">' +
      '</div></div>' +
      '<div class="phi-all-filter-row phi-all-alpha-row"><div class="phi-all-alpha">' +
      '<button class="phi-alpha-btn phi-alpha-btn--active" data-letter="" hidden></button>' +
      ALPHABET.map(function (l) { return '<button class="phi-alpha-btn" data-letter="' + l + '">' + l + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="phi-all-filter-row phi-all-color-row"><div class="phi-cur-trads">' +
          PHILO_COLOR_GROUPS.map(function (g) {
            return '<div class="phi-cur-trad phi-philo-group" style="--trad-color:' + g.accent + '">' +
              '<span class="phi-philo-group-title">' + g.fr + '</span>' +
              '<div class="phi-cur-subera-row">' +
              g.items.map(function (v) {
                var c = colorDef(v);
                return '<button type="button" class="phi-cur-subera-btn phi-color-pill" data-color="' + pillValue(c.v) + '">' +
                  '<span class="phi-color-dot" style="background:' + c.grad + '" aria-hidden="true"></span>' + c.fr + '</button>';
              }).join('') +
              '</div>' +
              g.items.filter(function (v) { return VIRTUAL_FRISE_LINKS[v]; }).map(function (v) {
                return '<a class="phi-philo-frise-link" data-for="' + pillValue(v) + '" href="' + VIRTUAL_FRISE_LINKS[v].href + '" hidden>' + VIRTUAL_FRISE_LINKS[v].fr + ' →</a>';
              }).join('') +
              '</div>';
          }).join('') +
          '</div></div>' +
      '<div class="phi-all-filter-row phi-all-cur-color-row">' +
      '<span class="phi-all-filter-lbl phi-cur-color-lbl">Tradition</span>' +
      '<div class="phi-cur-trads">' +
      COURANT_COLOR_FILTERS.map(function (c) {
        return '<div class="phi-cur-trad" data-trad="' + c.v + '" style="--trad-color:' + c.grad + '">' +
          '<span class="phi-color-item">' +
          '<button class="phi-cur-color-btn" data-cur-color="' + c.v + '" title="' + c.fr + '" aria-label="' + c.fr + '" style="background:' + c.grad + '"></button>' +
          '<span class="phi-color-item-lbl">' + c.fr + '</span></span>' +
          '<div class="phi-cur-subera-row">' +
          COURANT_SUBERAS[c.v].map(function (s) { return '<button class="phi-cur-subera-btn" data-subera="' + s.v + '">' + s.fr + '</button>'; }).join('') +
          '</div>' +
          '<div class="phi-cur-branch-row" hidden></div>' +
          '</div>';
      }).join('') +
      '</div></div>' +
      '<div class="phi-all-count" id="' + uid + '-count"></div>' +
      '<ul class="phi-all-list" id="' + uid + '-list"></ul>' +
      '<button class="phi-all-more" id="' + uid + '-more" hidden>Afficher plus…</button>' +
      '<button class="phi-all-top" id="' + uid + '-top" aria-label="Retour en haut" hidden>&#8593;</button>' +
      '</div>';

    var input = container.querySelector('.phi-all-input');
    var clearBtn = container.querySelector('.phi-search-clear');
    var countEl = container.querySelector('#' + uid + '-count');
    var listEl = container.querySelector('#' + uid + '-list');
    var moreBtn = container.querySelector('#' + uid + '-more');
    var topBtn = container.querySelector('#' + uid + '-top');
    var alphaBtns = container.querySelectorAll('.phi-alpha-btn');
    var colorBtns = container.querySelectorAll('[data-color]');
    var colorRow = container.querySelector('.phi-all-color-row');
    var curColorBtns = container.querySelectorAll('.phi-cur-color-btn');
    var curColorRow = container.querySelector('.phi-all-cur-color-row');
    var primaryBtns = container.querySelectorAll('[data-primary]');
    var eraSel = container.querySelector('#' + uid + '-era-sel');
    var natSel = container.querySelector('#' + uid + '-nat-sel');
    var natRow = container.querySelector('.phi-all-nat-row');
    var domSel = container.querySelector('#' + uid + '-dom-sel');
    var curSel = container.querySelector('#' + uid + '-cur-sel');
    var curRow = container.querySelector('.phi-all-cur-row');
    var yearFromSel = container.querySelector('#' + uid + '-year-from');
    var yearToSel = container.querySelector('#' + uid + '-year-to');
    var modeTabs = container.querySelectorAll('[data-mode]');
    var alphaRow = container.querySelector('.phi-all-alpha-row');

    var _mode = 'alpha';
    var _filters = { typex: 'phi-all', era: '', nat: '', dom: '', cur: '', letter: '', color: '', curColor: '', curSubera: '', curBranchGroup: '', yearFrom: null, yearTo: null };
    var _query = '';
    var _page = 1;
    var _debounce = null;
    var _filtered = [];

    function applyFilter(p) {
      var isCourant = p.y === 'courant';
      if (_filters.typex === 'phi-all') { if (isCourant) return false; }
      else if (_filters.typex === 'phi-occ') { if (isCourant || p.isOriental || p.isRusse) return false; }
      else if (_filters.typex === 'phi-ori') { if (isCourant || !p.isOriental) return false; }
      else if (_filters.typex === 'phi-rus') { if (isCourant || !p.isRusse) return false; }
      else if (_filters.typex === 'courant-all') { if (!isCourant) return false; }
      else if (_filters.typex === 'courant-occ') { if (p.colorFilter !== 'courant-occ') return false; }
      else if (_filters.typex === 'courant-ori') { if (p.colorFilter !== 'courant-ori') return false; }

      if (_filters.era && p.epoque !== _filters.era) return false;
      if (_filters.nat && (p.nat || '') !== _filters.nat) return false;
      if (_filters.dom && (!p.dom || p.dom.indexOf(_filters.dom) === -1)) return false;
      if (_filters.cur && (!p.cur || p.cur.indexOf(_filters.cur) === -1)) return false;
      if (_filters.color && !matchesColorFilter(p, _filters.color)) return false;
      if (_filters.curColor && !matchesCourantColorFilter(p, _filters.curColor)) return false;
      if (_filters.curColor && _filters.curSubera) {
        var defs = COURANT_SUBERAS[_filters.curColor] || [];
        var def = defs.filter(function (s) { return s.v === _filters.curSubera; })[0];
        if (def && def.epoques.indexOf(p.epoque) === -1) return false;
      }
      if (_filters.curBranchGroup) {
        var groupDef = (_meta.courantBranchGroups || []).filter(function (g) { return g.slug === _filters.curBranchGroup; })[0];
        if (groupDef && (!p.dom || !p.dom.some(function (d) { return groupDef.branches.indexOf(d) !== -1; }))) return false;
      }
      if ((_filters.yearFrom !== null || _filters.yearTo !== null) && !inYearRange(p, _filters.yearFrom, _filters.yearTo)) return false;
      return true;
    }

    function populateSelects() {
      var tx = _filters.typex;
      var trad = tx === 'phi-ori' ? 'oriental' : tx === 'phi-rus' ? 'russe' : tx === 'phi-occ' ? 'occidental' : null;
      var isCourantTx = tx && tx.indexOf('courant') === 0;
      var filtered = getNatsCursForTradition(trad, isCourantTx ? null : _filters.dom);
      var nats = filtered.nats;
      var curs = tx && tx.indexOf('courant') === -1 ? filtered.curs : (_meta.curs || []);
      var doms = isCourantTx ? (_meta.doms_cur || []) : (_meta.doms || []);

      if (natSel) {
        var prevNat = natSel.value;
        natSel.innerHTML = '<option value="">— Toutes origines —</option>' + nats.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        if (prevNat && nats.indexOf(prevNat) !== -1) natSel.value = prevNat; else if (prevNat) { natSel.value = ''; _filters.nat = ''; }
      }
      if (domSel) {
        var prevDom = domSel.value;
        domSel.innerHTML = '<option value="">— Toutes branches —</option>' + doms.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        if (prevDom && doms.indexOf(prevDom) !== -1) domSel.value = prevDom; else if (prevDom) { domSel.value = ''; _filters.dom = ''; }
      }
      if (curSel) {
        var prevCur = curSel.value;
        curSel.innerHTML = '<option value="">— Tous courants —</option>' + curs.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
        if (prevCur && curs.indexOf(prevCur) !== -1) curSel.value = prevCur; else if (prevCur) { curSel.value = ''; _filters.cur = ''; }
      }
    }

    function sortName(a, b) {
      var na = stripAccents(familyName(a.n)).toLowerCase();
      var nb = stripAccents(familyName(b.n)).toLowerCase();
      return na.localeCompare(nb, 'fr');
    }
    function sortTime(a, b) { return yearOf(a) - yearOf(b) || sortName(a, b); }

    function compute() {
      var q = stripAccents(_query.trim().toLowerCase());
      _filtered = _index.filter(function (p) {
        if (!applyFilter(p)) return false;
        if (_mode === 'alpha' && _filters.letter) {
          var fl = stripAccents(familyName(p.n))[0].toUpperCase();
          if (fl !== _filters.letter) return false;
        }
        if (!q) return true;
        var fn = stripAccents(familyName(p.n)).toLowerCase();
        var full = stripAccents(p.n).toLowerCase();
        return fn.indexOf(q) !== -1 || full.indexOf(q) !== -1;
      });
      _filtered.sort(_mode === 'time' ? sortTime : sortName);
    }

    function renderItems(items) {
      var lastLetter = '', lastEpoque = '';
      return items.map(function (p) {
        var sep = '';
        if (_mode === 'time') {
          if (p.epoque !== lastEpoque) { lastEpoque = p.epoque; sep = '<li class="phi-all-sep">' + (EPOQUE_LABELS[p.epoque] || p.epoque) + '</li>'; }
        } else {
          var letter = stripAccents(familyName(p.n))[0].toUpperCase();
          if (letter !== lastLetter) { lastLetter = letter; sep = '<li class="phi-all-sep">' + letter + '</li>'; }
        }
        var isCourantItem = p.y === 'courant';
        var badgeHtml = (p.badgeFr && !isCourantItem) ? '<span class="phi-result-badge phi-result-badge--' + p.badgeCls + '">' + p.badgeFr + '</span>' : '';
        var thumb = isCourantItem
          ? '<img src="/favicon.svg" alt="" class="phi-result-thumb" style="object-fit:contain;padding:3px;">'
          : (p.t ? '<img src="' + p.t + '" alt="" class="phi-result-thumb" loading="lazy" onerror="this.style.display=\'none\'">'
            : '<span class="phi-result-thumb phi-result-thumb--ph"></span>');
        var href = p.u + '?p=' + encodeURIComponent(p.n);
        var descRow = p.desc ? '<span class="phi-card-desc">' + p.desc + '</span>' : '';

        if (isCourantItem) {
          var originCls = p.colorFilter === 'courant-ori' ? 'courant-ori' : 'courant-occ';
          return sep + '<li class="phi-result-item" role="listitem">' +
            '<a href="' + href + '" class="phi-all-link phi-all-link--' + originCls + '">' +
            thumb + '<span class="phi-result-info">' +
            '<span class="phi-result-name">' + p.n + '</span>' +
            '<span class="phi-card-dates-row">' + p.d + '</span>' +
            curDomBadgeHtml(p.dom) + descRow +
            '</span></a></li>';
        }

        var originClsPhi = p.colorFilter ? ' phi-all-link--' + p.colorFilter : '';
        return sep + '<li class="phi-result-item" role="listitem">' +
          '<a href="' + href + '" class="phi-all-link' + originClsPhi + '">' +
          thumb + '<span class="phi-result-info">' +
          '<span class="phi-result-name">' + p.n + '</span>' +
          '<span class="phi-card-dates-row">' + p.d + '</span>' +
          curBadgesHtml(p.cur) + descRow +
          '</span></a></li>';
      }).join('');
    }

    function render() {
      var total = _filtered.length;
      var visible = _filtered.slice(0, _page * PAGE_SIZE);
      listEl.innerHTML = renderItems(visible);
      countEl.textContent = total + ' ' + (total > 1 ? 'résultats' : 'résultat');
      moreBtn.hidden = visible.length >= total;
    }

    function refresh() { _page = 1; compute(); render(); }

    function updateCompatibility() {
      var tx = _filters.typex;
      var isCourant = tx === 'courant-all' || tx === 'courant-occ' || tx === 'courant-ori';
      if (natSel) { natSel.disabled = isCourant; if (isCourant) { natSel.value = ''; _filters.nat = ''; } }
      if (curSel) { curSel.disabled = isCourant; if (isCourant) { curSel.value = ''; _filters.cur = ''; } }
      if (natRow) natRow.hidden = isCourant;
      if (curRow) curRow.hidden = isCourant;
      if (colorRow) { colorRow.classList.toggle('phi-all-color-row--hidden', isCourant); if (isCourant && _filters.color) setColorFilter(''); }
      if (curColorRow) { curColorRow.classList.toggle('phi-all-color-row--hidden', !isCourant); if (!isCourant && _filters.curColor) setCurColorFilter(''); }
      curColorRow.classList.toggle('phi-all-cur-color-row--emphasis', isCourant);
    }

    function populateSubType(primary, preferredValue) {
      var opts = subOpts[primary];
      var val = (preferredValue && opts.some(function (o) { return o.v === preferredValue; })) ? preferredValue : opts[0].v;
      _filters.typex = val;
    }

    function markPrimary(primary) {
      primaryBtns.forEach(function (b) {
        var active = b.dataset.primary === primary;
        b.classList.toggle('phi-all-mode-tab--active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function setPrimary(primary) {
      markPrimary(primary);
      populateSubType(primary);
      updateCompatibility();
      populateSelects();
      refresh();
    }
    primaryBtns.forEach(function (btn) { btn.addEventListener('click', function () { setPrimary(btn.dataset.primary); }); });

    if (eraSel) eraSel.addEventListener('change', function () { _filters.era = eraSel.value; updateCompatibility(); refresh(); });
    if (natSel) natSel.addEventListener('change', function () { _filters.nat = natSel.value; updateCompatibility(); refresh(); });
    if (domSel) domSel.addEventListener('change', function () { _filters.dom = domSel.value; updateCompatibility(); populateSelects(); refresh(); });
    if (curSel) curSel.addEventListener('change', function () { _filters.cur = curSel.value; updateCompatibility(); refresh(); });

    function onYearChange() {
      var vf = yearFromSel ? yearFromSel.value.trim() : '';
      var vt = yearToSel ? yearToSel.value.trim() : '';
      _filters.yearFrom = vf !== '' ? parseInt(vf, 10) : null;
      _filters.yearTo = vt !== '' ? parseInt(vt, 10) : null;
      refresh();
    }
    if (yearFromSel) yearFromSel.addEventListener('input', onYearChange);
    if (yearToSel) yearToSel.addEventListener('input', onYearChange);

    function setMode(mode) {
      if (_mode === mode) return;
      _mode = mode;
      modeTabs.forEach(function (t) {
        var active = t.dataset.mode === mode;
        t.classList.toggle('phi-all-mode-tab--active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (alphaRow) alphaRow.hidden = mode === 'time';
      refresh();
    }
    modeTabs.forEach(function (btn) { btn.addEventListener('click', function () { setMode(btn.dataset.mode); }); });

    alphaBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var l = btn.dataset.letter;
        if (_filters.letter === l && l !== '') {
          _filters.letter = '';
          alphaBtns.forEach(function (b) { b.classList.remove('phi-alpha-btn--active'); });
          container.querySelector('.phi-alpha-btn[data-letter=""]').classList.add('phi-alpha-btn--active');
        } else {
          alphaBtns.forEach(function (b) { b.classList.remove('phi-alpha-btn--active'); });
          btn.classList.add('phi-alpha-btn--active');
          _filters.letter = l;
        }
        refresh();
      });
    });

    function setColorFilter(c) {
      _filters.color = c;
      colorBtns.forEach(function (b) {
        b.classList.toggle('phi-cur-subera-btn--active', b.dataset.color === c);
      });
      container.querySelectorAll('.phi-philo-frise-link').forEach(function (a) { a.hidden = a.dataset.for !== c; });
      container.querySelectorAll('.phi-philo-group').forEach(function (col) {
        var own = !!c && !!col.querySelector('[data-color="' + c + '"]');
        col.classList.toggle('phi-cur-trad--active', own);
        col.classList.toggle('phi-cur-trad--dim', !!c && !own);
      });
    }
    colorBtns.forEach(function (btn) { btn.addEventListener('click', function () { setColorFilter(_filters.color === btn.dataset.color ? '' : btn.dataset.color); refresh(); }); });

    function syncCurActive() {
      curColorBtns.forEach(function (b) { b.classList.toggle('phi-cur-color-btn--active', b.dataset.curColor === _filters.curColor); });
      container.querySelectorAll('.phi-cur-trad[data-trad]').forEach(function (col) {
        var own = col.dataset.trad === _filters.curColor;
        col.classList.toggle('phi-cur-trad--active', own);
        col.classList.toggle('phi-cur-trad--dim', !!_filters.curColor && !own);
        col.querySelectorAll('[data-subera]').forEach(function (b) { b.classList.toggle('phi-cur-subera-btn--active', own && b.dataset.subera === _filters.curSubera); });
        col.querySelectorAll('[data-branch-group]').forEach(function (b) { b.classList.toggle('phi-cur-subera-btn--active', own && b.dataset.branchGroup === _filters.curBranchGroup); });
      });
    }
    function setCurColorFilter(c) {
      _filters.curColor = c;
      _filters.curSubera = '';
      _filters.curBranchGroup = '';
      syncCurActive();
    }
    function toggleCurSub(trad, key, value) {
      if (_filters.curColor !== trad) setCurColorFilter(trad);
      _filters[key] = _filters[key] === value ? '' : value;
      syncCurActive();
      refresh();
    }
    function renderCurBranchGroups() {
      var srcMap = { 'courant-occ': 'occidental', 'courant-ori': 'oriental' };
      container.querySelectorAll('.phi-cur-trad[data-trad]').forEach(function (col) {
        var row = col.querySelector('.phi-cur-branch-row');
        var groups = (_meta.courantBranchGroups || []).filter(function (g) { return g.source === srcMap[col.dataset.trad]; });
        row.innerHTML = groups.map(function (g) { return '<button class="phi-cur-subera-btn" data-branch-group="' + g.slug + '">' + g.label + '</button>'; }).join('');
        row.hidden = !groups.length;
        row.querySelectorAll('[data-branch-group]').forEach(function (btn) {
          btn.addEventListener('click', function () { toggleCurSub(col.dataset.trad, 'curBranchGroup', btn.dataset.branchGroup); });
        });
      });
      syncCurActive();
    }
    container.querySelectorAll('.phi-cur-trad[data-trad]').forEach(function (col) {
      col.querySelectorAll('[data-subera]').forEach(function (btn) {
        btn.addEventListener('click', function () { toggleCurSub(col.dataset.trad, 'curSubera', btn.dataset.subera); });
      });
    });
    curColorBtns.forEach(function (btn) { btn.addEventListener('click', function () { setCurColorFilter(_filters.curColor === btn.dataset.curColor ? '' : btn.dataset.curColor); refresh(); }); });

    function syncAlpha(q) {
      var letter = q ? q[0].toUpperCase() : '';
      if (!/^[A-Z]$/.test(letter)) letter = '';
      if (_filters.letter === letter) return;
      _filters.letter = letter;
      alphaBtns.forEach(function (b) { b.classList.remove('phi-alpha-btn--active'); });
      var target = letter ? container.querySelector('.phi-alpha-btn[data-letter="' + letter + '"]') : container.querySelector('.phi-alpha-btn[data-letter=""]');
      if (target) target.classList.add('phi-alpha-btn--active');
    }

    input.addEventListener('input', function () {
      _query = input.value;
      clearBtn.hidden = !_query;
      syncAlpha(stripAccents(familyName(_query.trim())).toLowerCase().replace(/[^a-z]/g, ''));
      clearTimeout(_debounce);
      _debounce = setTimeout(refresh, 120);
    });
    clearBtn.addEventListener('click', function () {
      input.value = ''; _query = ''; clearBtn.hidden = true;
      syncAlpha('');
      refresh(); input.focus();
    });

    moreBtn.addEventListener('click', function () { _page++; render(); });

    if (topBtn) {
      var onScroll = function () { topBtn.hidden = window.scrollY < 400; };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    markPrimary('philosophes');
    populateSubType('philosophes');

    listEl.innerHTML = '<li class="phi-search-empty">Chargement…</li>';
    fetch('/data/search-full-index.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _index = data.index || [];
        _meta = data._meta || _meta;
        renderCurBranchGroups();
        populateSelects();
        updateCompatibility();
        refresh();
      })
      .catch(function () {
        listEl.innerHTML = '<li class="phi-search-empty">Impossible de charger l’index de recherche.</li>';
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var mount = document.getElementById('phi-all-mount');
    if (mount) mountAll(mount);
  });
})();
