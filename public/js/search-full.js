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
  /* Libellés des codes de branche des philosophes (colonne Branches des xlsx) */
  var BRANCHES_FR = { metaphysique: 'Métaphysique', epistemologie: 'Épistémologie', ethique: 'Éthique', politique: 'Politique',
    esthetique: 'Esthétique', logique: 'Logique', langage: 'Langage', spiritualite: 'Spiritualité' };
  function brancheFr(v) { return BRANCHES_FR[v] || v; }

  var COLOR_FILTERS = [
    { v: 'oriental', fr: 'Orientaux', grad: '#1e8c3c' },
    { v: 'france', fr: 'Français', grad: 'linear-gradient(90deg,#0055a4 33.3%,#f7f4ea 33.3% 66.6%,#ef4135 66.6%)' },
    { v: 'russe', fr: 'Russes', grad: 'linear-gradient(180deg,#f7f4ea 33.3%,#0039a6 33.3% 66.6%,#d52b1e 66.6%)' },
    { v: 'americain', fr: 'Américains', grad: 'linear-gradient(#3c3b6e,#3c3b6e) 0 0/50% 54% no-repeat,repeating-linear-gradient(180deg,#b22234 0 15.4%,#f7f4ea 15.4% 30.8%)' },
    { v: 'allemand', fr: 'Allemands', grad: 'linear-gradient(180deg,#d0d0d0 50%,#0a0a0a 50%)' },
    { v: 'britannique', fr: 'Britanniques', grad: 'linear-gradient(180deg,#012169 50%,#c8102e 50%)' },
    { v: 'germanophone', fr: 'Germanophones', grad: 'linear-gradient(180deg,#0a0a0a 33%,#d21e1e 33% 66%,#f0b400 66%)' },
    { v: 'arabo-persan', fr: 'Monde islamique', grad: 'linear-gradient(180deg,#239f40 50%,#f7f4ea 50%)' },
    { v: 'africain', fr: 'Pensées du Sud', grad: 'linear-gradient(180deg,#e06414 50%,#1e8c3c 50%)' },
    { v: 'italien', fr: 'Italiens & Romains', grad: 'linear-gradient(90deg,#009246 33.3%,#f7f4ea 33.3% 66.6%,#ce2b37 66.6%)' },
    { v: 'europe-nord-centrale', fr: 'Europe du Nord & centrale', grad: 'linear-gradient(180deg,#21468b 50%,#f7f4ea 50%)' },
    { v: 'hispanique', fr: 'Hispaniques', grad: 'linear-gradient(180deg,#c60b1e 50%,#ffc400 50%)' },
    { v: 'femme', fr: 'Femmes', grad: 'linear-gradient(180deg,#8e44ad 50%,#f7f4ea 50%)' },
    { v: 'orient-ancien', fr: 'Proche-Orient ancien', grad: 'linear-gradient(180deg,#c9a227 50%,#1d4e89 50%)' },
    { v: 'grec', fr: 'Grecs & Byzantins', grad: 'linear-gradient(180deg,#0d5eaf 50%,#f7f4ea 50%)' },
    { v: 'indien', fr: 'Inde & bouddhisme', grad: 'linear-gradient(180deg,#ff9933 33%,#f7f4ea 33% 66%,#138808 66%)' },
    { v: 'asie-est', fr: "Asie de l'Est", grad: 'linear-gradient(135deg,#de2910 50%,#f7f4ea 50%)' },
    { v: 'juif', fr: 'Juifs', grad: 'linear-gradient(180deg,#f7f4ea 50%,#2b5aa8 50%)' },
  ];
  var PHILO_COLOR_GROUPS = [
    /* Même découpage que la page /frises/ : pays, grandes traditions, thème */
    { fr: 'Par tradition', accent: '#8b3a0f', lignes: [
      { fr: 'Pays', vide: 'Tous les pays', items: ['france', 'germanophone', 'britannique', 'italien', 'europe-nord-centrale', 'hispanique', 'americain', 'russe', 'grec'] },
      { fr: 'Grande tradition', vide: 'Toutes les traditions', items: ['orient-ancien', 'indien', 'asie-est', 'juif', 'arabo-persan', 'africain'] },
    ] },
  ];
  var TRADITION_RULES = {
    france: { ou: [{ nats: ['Française'] }, { noms: ['Jean Jacques ROUSSEAU', 'Charles BONNET', 'Charles SECRÉTAN'] }] },
    allemand: { nats: ['Allemande'] },
    americain: { nats: ['Américaine'] },
    russe: { nats: ['Russe'] },
    britannique: { ou: [{ nats: ['Britannique', 'Canadienne', 'Australienne', 'Irlandaise', 'Néo-zélandaise'] }, { nats: ['Sud-Africaine'], groupe: 'occident' }] },
    italien: { nats: ['Italienne', 'Romaine'] },
    'europe-nord-centrale': { nats: ['Belge', 'Néerlandaise', 'Luxembourgeoise', 'Danoise', 'Suédoise', 'Norvégienne', 'Finlandaise', 'Islandaise', 'Tchèque', 'Polonaise', 'Hongroise', 'Roumaine', 'Slovène', 'Slovaque', 'Croate', 'Serbe', 'Bulgare', 'Lettone', 'Lituanienne', 'Estonienne'] },
    'germanophone': { nats: ['Allemande', 'Autrichienne', 'Suisse'], exclude: ['Jean Jacques ROUSSEAU', 'Charles BONNET', 'Charles SECRÉTAN'] },
    'arabo-persan': { groupe: 'islam-juif', sansTrad: 'juive' }, /* Monde islamique */
    'africain': { ou: [{ groupe: 'sud' }, { trad: 'sud' }] }, /* Pensées du Sud : Afrique, Amérique latine, Caraïbes */
    'hispanique': { nats: ['Espagnole', 'Argentine', 'Uruguayenne', 'Mexicaine', 'Portugaise', 'Vénézuélienne', 'Péruvienne', 'Brésilienne'] },
    'grec': { ou: [{ nats: ['Grecque', 'Byzantine', 'Arménienne'] }, { nats: ['Égyptienne', 'Syrienne'], groupe: 'occident' }] },
    'indien': { ou: [{ groupe: 'inde' }, { trad: 'inde' }] }, /* Inde et monde bouddhiste */
    'asie-est': { ou: [{ groupe: 'asie-est' }, { trad: 'asie-est' }] },
    /* Pas une nationalité : colonne « Traditions » des xlsx */
    'juif': { trad: 'juive' },
    'femme': { trad: 'femme' },
    /* Colonne « Groupe » des xlsx (grande tradition de la Frise des penseurs du monde) */
    'orient-ancien': { groupe: 'orient-ancien' },
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
    'arabo-persan': { href: '/philosophes/frise/monde-islamique-toutes-epoques/', fr: "Voir la frise des philosophes du monde islamique" },
    italien: { href: '/philosophes/frise/italiens-toutes-epoques/', fr: "Voir la frise des philosophes italiens et romains" },
    'europe-nord-centrale': { href: '/philosophes/frise/europe-nord-centrale-toutes-epoques/', fr: "Voir la frise des philosophes d'Europe du Nord et centrale" },
    'africain': { href: '/philosophes/frise/pensees-du-sud-toutes-epoques/', fr: "Voir la frise des pensées du Sud" },
    'hispanique': { href: '/philosophes/frise/hispaniques-toutes-epoques/', fr: "Voir la frise des philosophes hispaniques" },
    'grec': { href: '/philosophes/frise/grecs-byzantins-toutes-epoques/', fr: "Voir la frise des philosophes grecs et byzantins" },
    'indien': { href: '/philosophes/frise/inde-bouddhisme-toutes-epoques/', fr: "Voir la frise de l'Inde et du monde bouddhiste" },
    'asie-est': { href: '/philosophes/frise/asie-est-toutes-epoques/', fr: "Voir la frise des philosophes d'Asie de l'Est" },
    'juif': { href: '/philosophes/frise/pensee-juive-toutes-epoques/', fr: "Voir la frise des philosophes juifs" },
    'femme': { href: '/philosophes/frise/femmes-toutes-epoques/', fr: "Voir la frise des philosophes femmes" },
    'orient-ancien': { href: '/philosophes/frise/proche-orient-ancien-toutes-epoques/', fr: "Voir la frise du Proche-Orient ancien" },
  };
  /* Sujets de travail des philosophes vivants : mêmes codes que
     src/data/themes-vivants.ts (champ th de l'index, frise « vivants-<code> ») */
  var THEMES_VIVANTS = [
    { v: 'esprit-ia', fr: 'Esprit, cerveau & IA' },
    { v: 'ecologie', fr: 'Écologie & vivant' },
    { v: 'justice', fr: 'Justice & démocratie' },
    { v: 'genre', fr: 'Féminisme & genre' },
    { v: 'decolonial', fr: 'Décolonisation & pensées du Sud' },
    { v: 'sens', fr: 'Sens & spiritualité' },
    { v: 'reel', fr: 'Réel & connaissance' },
    { v: 'continental', fr: 'Héritiers de la pensée continentale' },
  ];
  /* Teinte de fond (r,g,b) des cartes de frises « drapeau » (onglet Frises) ;
     la bande de gauche reprend le dégradé de COLOR_FILTERS */
  var TEINTES_FRISES = {
    britannique: '40,70,160', italien: '0,146,70', 'europe-nord-centrale': '33,70,139', germanophone: '210,30,30',
    'arabo-persan': '35,159,64', africain: '224,100,20', hispanique: '198,11,30', femme: '142,68,173',
    'orient-ancien': '201,162,39', grec: '13,94,175', indien: '255,153,51', 'asie-est': '222,41,16', juif: '43,90,168',
  };
  function colorDef(v) {
    return COLOR_FILTERS.filter(function (c) { return c.v === v; })[0];
  }
  /* source = frise_source des courants (et des sous-frises par thème de _meta.courantBranchGroups) */
  var COURANT_COLOR_FILTERS = [
    { v: 'courant-occ', fr: 'Pensée occidentale', source: 'occidental' },
    { v: 'courant-ori', fr: 'Pensée orientale', source: 'oriental' },
  ];
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

  /* Règle d'une pastille « Par tradition » : toutes les conditions présentes doivent être vraies ;
     « ou » = au moins une des sous-règles (mêmes règles que src/data/virtual-frises.ts) */
  function regleTradition(p, r) {
    if (r.ou) return r.ou.some(function (x) { return regleTradition(p, x); });
    var trad = p.trad || [];
    if (r.trad && trad.indexOf(r.trad) === -1) return false;
    if (r.sansTrad && trad.indexOf(r.sansTrad) !== -1) return false;
    if (r.groupe && p.grp !== r.groupe) return false;
    if (r.nats && r.nats.indexOf(p.nat) === -1) return false;
    if (r.noms && r.noms.indexOf(p.n) === -1) return false;
    if (r.exclude && r.exclude.indexOf(p.n) !== -1) return false;
    return true;
  }

  function matchesColorFilter(p, color) {
    if (!color) return true;
    if (color.indexOf('trad:') === 0) {
      return regleTradition(p, TRADITION_RULES[color.slice(5)]);
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
      frises: [{ v: 'frises', lbl: 'Toutes les frises' }],
    };

    /* Cartouche de filtres repliable : ouvert sur grand écran, replié sur mobile
       (une pastille indique alors le nombre de filtres actifs) */
    var ecranLarge = !window.matchMedia || window.matchMedia('(min-width: 761px)').matches;
    function cartouche(nom, titre) {
      return '<details class="phi-box phi-box--' + nom + '" data-box="' + nom + '"' + (ecranLarge ? ' open' : '') + '>' +
        '<summary class="phi-box-title"><span>' + titre + '</span><span class="phi-box-badge" hidden></span></summary>';
    }

    container.innerHTML =
      '<div class="phi-all">' +
      '<div class="phi-all-mode-tabs phi-all-type-tabs" role="tablist" aria-label="Type de recherche">' +
      '<button type="button" class="phi-all-mode-tab" data-primary="philosophes" role="tab" aria-selected="false">🏛️ Philosophes</button>' +
      '<button type="button" class="phi-all-mode-tab" data-primary="courants" role="tab" aria-selected="false">🌿 Courants</button>' +
      '<button type="button" class="phi-all-mode-tab" data-primary="frises" role="tab" aria-selected="false">◈ Frises</button>' +
      '</div>' +
      '<div class="phi-all-bar-row">' +
      '<div class="phi-all-bar">' +
      '<span class="phi-search-icon" aria-hidden="true">🔍</span>' +
      '<input class="phi-all-input" type="search" autocomplete="off" spellcheck="false" placeholder="Rechercher…" aria-label="Rechercher dans la liste complète">' +
      '<button class="phi-search-clear" aria-label="Effacer" hidden>✕</button>' +
      '</div>' +
      '</div>' +
      /* Onglet « Frises » : filtres de la liste des frises (index /data/frises-index.json) */
      cartouche('frises', 'Filtres') +
      '<div class="phi-box-grid">' +
      '<label class="phi-field"><span class="phi-all-filter-lbl">Contenu</span>' +
      '<select class="phi-all-select phi-fr-contenu">' +
      '<option value="">— Tout —</option>' +
      '<option value="philosophes">Philosophes</option>' +
      '<option value="courants">Courants de pensée</option>' +
      '</select></label>' +
      '<label class="phi-field phi-field--large"><span class="phi-all-filter-lbl">Regroupement</span>' +
      '<select class="phi-all-select phi-fr-regroup">' +
      '<option value="">— Tous les regroupements —</option>' +
      '<option value="epoque">Par époque</option>' +
      '<option value="pays">Par pays ou langue</option>' +
      '<option value="tradition">Par grande tradition</option>' +
      '<option value="theme">Par thème (femmes)</option>' +
      '<option value="vivants">Philosophes vivants, par sujet de travail</option>' +
      '<option value="courants">Courants de pensée, par thème</option>' +
      '</select></label>' +
      '</div></details>' +
      /* Onglet Frises : la Frise des penseurs du monde, frise principale, toujours visible, sous ses filtres */
      '<div class="phi-monde-banner" hidden></div>' +
      /* Cartouche « Filtres » */
      cartouche('filtres', 'Filtres') +
      '<div class="phi-box-grid">' +
      '<label class="phi-field"><span class="phi-all-filter-lbl">Époque</span>' +
      '<select class="phi-all-select" id="' + uid + '-era-sel">' +
      '<option value="">— Toutes époques —</option>' +
      '<option value="actuels">Actuels</option>' +
      '<option value="antiquite">Antiquité</option>' +
      '<option value="moyenage">Moyen Âge</option>' +
      '<option value="renaissance">Renaissance</option>' +
      '<option value="modernes">Modernes</option>' +
      '</select></label>' +
      '<label class="phi-field phi-all-nat-row"><span class="phi-all-filter-lbl">Nationalité</span>' +
      '<select class="phi-all-select" id="' + uid + '-nat-sel"><option value="">— Toutes origines —</option></select></label>' +
      '<label class="phi-field"><span class="phi-all-filter-lbl">Branche</span>' +
      '<select class="phi-all-select" id="' + uid + '-dom-sel"><option value="">— Toutes branches —</option></select></label>' +
      '<label class="phi-field phi-all-cur-row"><span class="phi-all-filter-lbl">Courant</span>' +
      '<select class="phi-all-select" id="' + uid + '-cur-sel"><option value="">— Tous courants —</option></select></label>' +
      '<div class="phi-field"><span class="phi-all-filter-lbl">Période</span>' +
      '<div class="phi-all-year-wrap">' +
      '<input class="phi-year-input" id="' + uid + '-year-from" type="number" placeholder="De" aria-label="Période : de l\'année" min="-700" max="2030" step="1">' +
      '<span class="phi-year-sep">à</span>' +
      '<input class="phi-year-input" id="' + uid + '-year-to" type="number" placeholder="À" aria-label="Période : à l\'année" min="-700" max="2030" step="1">' +
      '</div></div>' +
      /* Même filtre que sur la Frise des penseurs du monde (tag « femme ») */
      '<label class="phi-check phi-femmes-check"><input type="checkbox" class="phi-femmes-box"><span>♀ Femmes uniquement</span></label>' +
      '</div></details>' +
      /* Cartouche « Philosophes d'aujourd'hui » : en activité (champ live de l'index) et sujet de travail (champ th) */
      cartouche('vivants', 'Philosophes d\'aujourd\'hui') +
      '<div class="phi-box-grid">' +
      '<label class="phi-check"><input type="checkbox" class="phi-vivants-box"><span>En activité uniquement</span></label>' +
      '<label class="phi-field phi-field--large"><span class="phi-all-filter-lbl">Sujet de travail</span>' +
      '<select class="phi-all-select phi-theme-sel"><option value="">— Tous les sujets —</option>' +
      THEMES_VIVANTS.map(function (t) { return '<option value="' + t.v + '">' + t.fr.replace(/&/g, '&amp;') + '</option>'; }).join('') +
      '</select></label>' +
      '</div>' +
      THEMES_VIVANTS.map(function (t) {
        return '<a class="phi-philo-frise-link phi-theme-frise-link" data-theme-for="' + t.v + '" href="/philosophes/frise/vivants-' + t.v + '/" hidden>Voir la frise « ' + t.fr.replace(/&/g, '&amp;') + ' » →</a>';
      }).join('') +
      '</details>' +
      /* Cartouche « Par tradition » : une liste déroulante par ligne (Pays, Grandes traditions) */
      PHILO_COLOR_GROUPS.map(function (g) {
        var tous = [].concat.apply([], g.lignes.map(function (l) { return l.items; }));
        return cartouche('tradition', g.fr) +
          '<div class="phi-box-grid">' +
          g.lignes.map(function (l) {
            return '<label class="phi-field phi-field--large"><span class="phi-all-filter-lbl">' + l.fr + '</span>' +
              '<select class="phi-all-select phi-trad-sel"><option value="">— ' + (l.vide || 'Tous') + ' —</option>' +
              l.items.map(function (v) {
                var c = colorDef(v);
                return '<option value="' + pillValue(c.v) + '">' + c.fr.replace(/&/g, '&amp;') + '</option>';
              }).join('') +
              '</select></label>';
          }).join('') +
          '</div>' +
          tous.filter(function (v) { return VIRTUAL_FRISE_LINKS[v]; }).map(function (v) {
            return '<a class="phi-philo-frise-link" data-for="' + pillValue(v) + '" href="' + VIRTUAL_FRISE_LINKS[v].href + '" hidden>' + VIRTUAL_FRISE_LINKS[v].fr + ' →</a>';
          }).join('') +
          '</details>';
      }).join('') +
      /* Cartouche « Tradition » de l'onglet Courants : tradition, puis thème (sous-frises par branche) */
      cartouche('courants', 'Tradition') +
      '<div class="phi-box-grid">' +
      '<label class="phi-field phi-field--large"><span class="phi-all-filter-lbl">Tradition</span>' +
      '<select class="phi-all-select phi-curtrad-sel"><option value="">— Toutes les traditions —</option>' +
      COURANT_COLOR_FILTERS.map(function (c) { return '<option value="' + c.v + '">' + c.fr + '</option>'; }).join('') +
      '</select></label>' +
      '<label class="phi-field phi-field--large"><span class="phi-all-filter-lbl">Thème</span>' +
      '<select class="phi-all-select phi-curtheme-sel" disabled><option value="">— Tous les thèmes —</option></select></label>' +
      '</div>' +
      '<a class="phi-philo-frise-link phi-cur-frise-link" href="#" hidden></a>' +
      '</details>' +
      /* Barre de tri, juste au-dessus de la liste */
      '<div class="phi-toolbar">' +
      '<div class="phi-toolbar-group">' +
      '<span class="phi-all-count" id="' + uid + '-count"></span>' +
      '<button type="button" class="phi-reset-btn" hidden>Réinitialiser</button>' +
      '</div>' +
      '<div class="phi-toolbar-group phi-toolbar-tri">' +
      '<span class="phi-all-filter-lbl">Tri</span>' +
      '<div class="phi-sort-tabs" role="group" aria-label="Ordre d\'affichage">' +
      '<button type="button" class="phi-sort-tab phi-sort-tab--active" data-mode="alpha" aria-pressed="true">Alphabétique</button>' +
      '<button type="button" class="phi-sort-tab" data-mode="time" aria-pressed="false">Temporelle</button>' +
      '</div>' +
      '<button type="button" class="phi-sort-dir" title="Inverser le sens de la liste"></button>' +
      '</div>' +
      '</div>' +
      '<div class="phi-all-filter-row phi-all-alpha-row"><div class="phi-all-alpha">' +
      '<button class="phi-alpha-btn phi-alpha-btn--active" data-letter="" hidden></button>' +
      ALPHABET.map(function (l) { return '<button class="phi-alpha-btn" data-letter="' + l + '">' + l + '</button>'; }).join('') +
      '</div></div>' +
      '<ul class="phi-all-list" id="' + uid + '-list"></ul>' +
      '<button class="phi-all-more" id="' + uid + '-more" hidden>Afficher plus…</button>' +
      '<button class="phi-all-top" id="' + uid + '-top" aria-label="Retour en haut" hidden>&#8593;</button>' +
      '</div>';

    var input = container.querySelector('.phi-all-input');
    var clearBtn = container.querySelector('.phi-search-clear');
    var femmesBox = container.querySelector('.phi-femmes-box');
    var femmesCheck = container.querySelector('.phi-femmes-check');
    var vivantsBox = container.querySelector('.phi-vivants-box');
    var vivantsCartouche = container.querySelector('.phi-box--vivants');
    var themeSel = container.querySelector('.phi-theme-sel');
    var tradSels = container.querySelectorAll('.phi-trad-sel');
    var resetBtn = container.querySelector('.phi-reset-btn');
    var dirBtn = container.querySelector('.phi-sort-dir');
    var filtresBox = container.querySelector('.phi-box--filtres');
    var frisesBox = container.querySelector('.phi-box--frises');
    var frContenu = container.querySelector('.phi-fr-contenu');
    var frRegroup = container.querySelector('.phi-fr-regroup');
    var mondeBanner = container.querySelector('.phi-monde-banner');
    var countEl = container.querySelector('#' + uid + '-count');
    var listEl = container.querySelector('#' + uid + '-list');
    var moreBtn = container.querySelector('#' + uid + '-more');
    var topBtn = container.querySelector('#' + uid + '-top');
    var alphaBtns = container.querySelectorAll('.phi-alpha-btn');
    var colorRow = container.querySelector('.phi-box--tradition');
    var curBox = container.querySelector('.phi-box--courants');
    var curTradSel = container.querySelector('.phi-curtrad-sel');
    var curThemeSel = container.querySelector('.phi-curtheme-sel');
    var curFriseLink = container.querySelector('.phi-cur-frise-link');
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
    var _desc = false; /* sens de la liste : Z→A, ou du plus récent au plus ancien */
    var _filters = { typex: 'phi-all', era: '', nat: '', dom: '', cur: '', letter: '', color: '', curColor: '', curBranchGroup: '', yearFrom: null, yearTo: null, femmes: false, vivants: false, theme: '' };
    var _query = '';
    var _page = 1;
    var _debounce = null;
    var _filtered = [];
    /* Onglet « Frises » : index chargé au premier clic, et ses propres filtres */
    var _frises = null;
    var _fr = { contenu: '', regroup: '' };
    function estFrises() { return _filters.typex === 'frises'; }

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
      if (_filters.femmes && (isCourant || (p.trad || []).indexOf('femme') === -1)) return false;
      if (_filters.vivants) {
        if (isCourant || !p.live) return false;
        if (_filters.theme && (p.th || []).indexOf(_filters.theme) === -1) return false;
      }
      if (_filters.curColor && !matchesCourantColorFilter(p, _filters.curColor)) return false;
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
        domSel.innerHTML = '<option value="">— Toutes branches —</option>' + doms.map(function (v) { return '<option value="' + v + '">' + brancheFr(v) + '</option>'; }).join('');
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

    /* Liste des frises : filtres, puis recherche dans le nom, la description et les philosophes contenus */
    function computeFrises(q) {
      if (!_frises) return [];
      var res = [];
      _frises.forEach(function (f) {
        if (f.c === 'monde') return;
        if (_fr.contenu && f.c !== _fr.contenu) return;
        if (_fr.regroup && f.r !== _fr.regroup) return;
        /* Philosophes (ou courants) de la frise qui correspondent : cherchés même
           quand le nom ou la description de la frise correspond déjà */
        var hits = [];
        if (q) {
          hits = f.m.filter(function (m) { return stripAccents(m[0]).toLowerCase().indexOf(q) !== -1; });
          if (!hits.length && stripAccents((f.n + ' ' + f.desc).toLowerCase()).indexOf(q) === -1) return;
        }
        res.push({ f: f, hits: hits });
      });
      /* Ordre fixe, sans bouton de tri : les frises des courants d'abord, puis
         l'ordre de la page « Toutes les frises » (monde, époques, vivants, pays…) */
      res.sort(function (a, b) { return (a.f.c === 'courants' ? 0 : 1) - (b.f.c === 'courants' ? 0 : 1) || a.f.i - b.f.i; });
      return res;
    }

    function compute() {
      var q = stripAccents(_query.trim().toLowerCase());
      if (estFrises()) { _filtered = computeFrises(q); return; }
      _filtered = _index.filter(function (p) {
        if (!applyFilter(p)) return false;
        /* La lettre ne filtre que sans texte saisi : sinon « simone » (lettre S)
           écartait Simone de Beauvoir et Simone Weil */
        if (_mode === 'alpha' && _filters.letter && !q) {
          var fl = stripAccents(familyName(p.n))[0].toUpperCase();
          if (fl !== _filters.letter) return false;
        }
        if (!q) return true;
        var fn = stripAccents(familyName(p.n)).toLowerCase();
        var full = stripAccents(p.n).toLowerCase();
        return fn.indexOf(q) !== -1 || full.indexOf(q) !== -1;
      });
      _filtered.sort(_mode === 'time' ? sortTime : sortName);
      if (_desc) _filtered.reverse();
    }

    /* Pastille de chaque cartouche : nombre de filtres actifs (utile quand il est replié) */
    function majPastilles() {
      var f = _filters;
      var n = {
        filtres: !!f.era + !!f.nat + !!f.dom + !!f.cur + (f.yearFrom !== null || f.yearTo !== null) + f.femmes,
        vivants: f.vivants + !!f.theme,
        tradition: +!!f.color,
        courants: !!f.curColor + !!f.curBranchGroup,
        frises: !!_fr.contenu + !!_fr.regroup,
      };
      container.querySelectorAll('.phi-box').forEach(function (box) {
        var badge = box.querySelector('.phi-box-badge');
        var k = n[box.dataset.box] || 0;
        badge.hidden = !k;
        badge.textContent = k;
      });
    }

    function filtresActifs() {
      var f = _filters;
      if (estFrises()) return !!(_query || _fr.contenu || _fr.regroup);
      return !!(_query || f.era || f.nat || f.dom || f.cur || f.letter || f.color || f.curColor || f.curBranchGroup
        || f.yearFrom !== null || f.yearTo !== null || f.femmes || f.vivants || f.theme);
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
        /* Courant filtré par thème : la frise s'ouvre sur l'onglet correspondant */
        if (p.y === 'courant' && _filters.curBranchGroup) href += '&g=' + encodeURIComponent(_filters.curBranchGroup);
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

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
    /* Philosophes de la frise qui correspondent à la recherche (nom complet) */
    function membresTrouves(f, q) {
      return q ? f.m.filter(function (m) { return stripAccents(m[0]).toLowerCase().indexOf(q) !== -1; }) : [];
    }
    function lienFrise(f, hits) {
      return hits.length === 1 ? f.u + '?p=' + encodeURIComponent(hits[0][1] || hits[0][0]) : f.u;
    }
    function contientHtml(hits) {
      return '<span class="phi-frise-hit">Contient : ' + hits.slice(0, 3).map(function (h) { return '<strong>' + esc(h[0]) + '</strong>'; }).join(', ') +
        (hits.length > 3 ? ' et ' + (hits.length - 3) + ' autre' + (hits.length > 4 ? 's' : '') : '') + '</span>';
    }
    function renderMonde() {
      var f = _frises && _frises.filter(function (x) { return x.c === 'monde'; })[0];
      if (!f) return '';
      var hits = membresTrouves(f, stripAccents(_query.trim().toLowerCase()));
      /* Ouverte dans un nouvel onglet : la recherche reste disponible */
      return '<a class="phi-monde-main" href="' + esc(lienFrise(f, hits)) + '" target="_blank" rel="noopener">' +
        '<span class="phi-monde-eyebrow">◈ La frise principale</span>' +
        '<span class="phi-monde-title">' + esc(f.n) + '</span>' +
        '<span class="phi-monde-meta">' + esc(f.tag) + ' · ' + f.nb + ' penseurs · toutes les traditions côte à côte</span>' +
        '<span class="phi-monde-portraits" aria-hidden="true">' + f.v.map(function (v) {
          return '<img src="' + esc(v[1]) + '" alt="" title="' + esc(v[0]) + '" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
        }).join('') + '</span>' +
        (hits.length ? contientHtml(hits) : '') +
        '<span class="phi-monde-desc">' + esc(f.desc) + '</span>' +
        '<span class="phi-monde-cta">Ouvrir la frise →</span>' +
        '</a>';
    }
    function classeCouleur(k) {
      if (k && k.indexOf('flag:') === 0) {
        var c = colorDef(k.slice(5));
        var teinte = TEINTES_FRISES[k.slice(5)];
        /* Bande verticale : un drapeau à bandes verticales (90deg) est redressé pour que ses trois couleurs se voient */
        var bande = c ? c.grad.replace('linear-gradient(90deg', 'linear-gradient(180deg') : '';
        return c && teinte ? { cls: ' phi-frise-card--flag', style: ' style="--band:' + esc(bande) + ';--tint:' + teinte + '"' } : { cls: '', style: '' };
      }
      return { cls: k ? ' phi-all-link--' + k : '', style: '' };
    }
    function renderFrises(items) {
      return items.map(function (r) {
        var f = r.f;
        /* Un seul philosophe trouvé : la frise s'ouvre directement sur lui */
        var href = lienFrise(f, r.hits);
        var coul = classeCouleur(f.k);
        var thumbs = f.v.length
          ? '<span class="phi-frise-thumbs" aria-hidden="true">' + f.v.map(function (v) {
            return '<img src="' + esc(v[1]) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
          }).join('') + '</span>'
          : '<span class="phi-frise-thumbs phi-frise-thumbs--vide" aria-hidden="true">◈</span>';
        var unite = f.c === 'courants' ? (f.nb > 1 ? 'courants' : 'courant') : (f.nb > 1 ? 'fiches' : 'fiche');
        var hitsHtml = r.hits.length ? contientHtml(r.hits) : '';
        var desc = f.desc.length > 190 ? f.desc.slice(0, 185).replace(/\s+\S*$/, '') + '…' : f.desc;
        return '<li class="phi-result-item" role="listitem">' +
          '<a href="' + esc(href) + '" class="phi-all-link phi-frise-card' + coul.cls + '"' + coul.style + '>' + thumbs +
          '<span class="phi-result-info">' +
          '<span class="phi-result-name">' + esc(f.n) + '</span>' +
          '<span class="phi-card-dates-row">' + esc(f.tag) + ' · ' + f.nb + ' ' + unite + '</span>' +
          hitsHtml +
          '<span class="phi-card-desc">' + esc(desc) + '</span>' +
          '</span></a></li>';
      }).join('');
    }

    function render() {
      var total = _filtered.length;
      var visible = _filtered.slice(0, _page * PAGE_SIZE);
      listEl.innerHTML = estFrises() ? renderFrises(visible) : renderItems(visible);
      mondeBanner.hidden = !estFrises() || !_frises;
      if (!mondeBanner.hidden) mondeBanner.innerHTML = renderMonde();
      countEl.textContent = estFrises()
        ? total + ' ' + (total > 1 ? 'frises' : 'frise')
        : total + ' ' + (total > 1 ? 'résultats' : 'résultat');
      moreBtn.hidden = visible.length >= total;
      resetBtn.hidden = !filtresActifs();
      majPastilles();
    }

    function refresh() { _page = 1; compute(); render(); }

    function updateCompatibility() {
      var tx = _filters.typex;
      var isCourant = tx === 'courant-all' || tx === 'courant-occ' || tx === 'courant-ori';
      if (natSel) { natSel.disabled = isCourant; if (isCourant) { natSel.value = ''; _filters.nat = ''; } }
      if (curSel) { curSel.disabled = isCourant; if (isCourant) { curSel.value = ''; _filters.cur = ''; } }
      if (natRow) natRow.hidden = isCourant;
      if (curRow) curRow.hidden = isCourant;
      if (colorRow) { colorRow.hidden = isCourant; if (isCourant && _filters.color) setColorFilter(''); }
      femmesCheck.hidden = isCourant;
      if (isCourant && _filters.femmes) setFemmes(false);
      vivantsCartouche.hidden = isCourant;
      if (isCourant && _filters.vivants) setVivants(false);
      curBox.hidden = !isCourant;
      if (!isCourant && _filters.curColor) setCurColorFilter('');
      /* Onglet Frises : seuls son cartouche et la barre de tri restent */
      var fr = estFrises();
      frisesBox.hidden = !fr;
      filtresBox.hidden = fr;
      if (fr) { vivantsCartouche.hidden = true; colorRow.hidden = true; curBox.hidden = true; }
      if (alphaRow) alphaRow.hidden = fr || _mode === 'time';
      input.placeholder = fr ? 'Rechercher une frise ou un philosophe…' : 'Rechercher…';
      container.querySelector('.phi-toolbar-tri').hidden = fr;
      container.querySelector('.phi-toolbar').classList.toggle('phi-toolbar--frises', fr);
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
      if (primary === 'frises' && !_frises) {
        listEl.innerHTML = '<li class="phi-search-empty">Chargement…</li>';
        fetch('/data/frises-index.json')
          .then(function (r) { return r.json(); })
          .then(function (data) {
            data.forEach(function (f, i) { f.i = i; }); /* rang dans le catalogue */
            _frises = data;
            if (estFrises()) refresh();
          })
          .catch(function () { listEl.innerHTML = '<li class="phi-search-empty">Impossible de charger la liste des frises.</li>'; });
      }
    }

    frContenu.addEventListener('change', function () { _fr.contenu = frContenu.value; refresh(); });
    frRegroup.addEventListener('change', function () { _fr.regroup = frRegroup.value; refresh(); });
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
        t.classList.toggle('phi-sort-tab--active', active);
        t.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (alphaRow) alphaRow.hidden = mode === 'time' || estFrises();
      syncDir();
      refresh();
    }
    modeTabs.forEach(function (btn) { btn.addEventListener('click', function () { setMode(btn.dataset.mode); }); });

    /* Bouton de sens : son libellé dit l'ordre en cours, un clic l'inverse */
    function syncDir() {
      dirBtn.textContent = _mode === 'time'
        ? (_desc ? 'Récents → anciens' : 'Anciens → récents')
        : (_desc ? 'Z → A' : 'A → Z');
      dirBtn.setAttribute('aria-pressed', String(_desc));
      /* Les lettres suivent le sens de la liste : A…Z ou Z…A */
      var alpha = container.querySelector('.phi-all-alpha');
      Array.prototype.slice.call(alphaBtns)
        .filter(function (b) { return b.dataset.letter; })
        .sort(function (a, b) { return (_desc ? -1 : 1) * a.dataset.letter.localeCompare(b.dataset.letter); })
        .forEach(function (b) { alpha.appendChild(b); });
      alpha.scrollLeft = 0;
    }
    dirBtn.addEventListener('click', function () { _desc = !_desc; syncDir(); refresh(); });
    syncDir();

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
      /* Une seule tradition à la fois : l'autre liste revient à « Tous » */
      tradSels.forEach(function (s) {
        s.value = c && s.querySelector('option[value="' + c + '"]') ? c : '';
      });
      container.querySelectorAll('.phi-philo-frise-link:not(.phi-theme-frise-link)').forEach(function (a) { a.hidden = a.dataset.for !== c; });
    }
    tradSels.forEach(function (sel) { sel.addEventListener('change', function () { setColorFilter(sel.value); refresh(); }); });

    /* Onglet Courants : une tradition, puis un thème parmi les sous-frises de cette tradition */
    function traditionCourant() {
      return COURANT_COLOR_FILTERS.filter(function (c) { return c.v === _filters.curColor; })[0];
    }
    function majLienCourant() {
      var trad = traditionCourant();
      var groupe = (_meta.courantBranchGroups || []).filter(function (g) { return g.slug === _filters.curBranchGroup; })[0];
      curFriseLink.hidden = !trad;
      if (!trad) return;
      curFriseLink.href = '/courants/frise/' + (groupe ? groupe.slug : trad.source) + '/';
      curFriseLink.textContent = 'Voir la frise « ' + (groupe ? groupe.label : trad.fr) + ' » →';
    }
    function setCurColorFilter(c) {
      _filters.curColor = c;
      _filters.curBranchGroup = '';
      curTradSel.value = c;
      var trad = traditionCourant();
      var groupes = trad ? (_meta.courantBranchGroups || []).filter(function (g) { return g.source === trad.source; }) : [];
      curThemeSel.innerHTML = '<option value="">— Tous les thèmes —</option>' +
        groupes.map(function (g) { return '<option value="' + g.slug + '">' + g.label.replace(/&/g, '&amp;') + '</option>'; }).join('');
      curThemeSel.disabled = !groupes.length;
      majLienCourant();
    }
    curTradSel.addEventListener('change', function () { setCurColorFilter(curTradSel.value); refresh(); });
    curThemeSel.addEventListener('change', function () {
      _filters.curBranchGroup = curThemeSel.value;
      majLienCourant();
      refresh();
    });

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
    function setFemmes(on) {
      _filters.femmes = on;
      femmesBox.checked = on;
    }
    femmesBox.addEventListener('change', function () { setFemmes(femmesBox.checked); refresh(); });
    function setTheme(v) {
      _filters.theme = v;
      themeSel.value = v;
      container.querySelectorAll('.phi-theme-frise-link').forEach(function (a) { a.hidden = a.dataset.themeFor !== v; });
    }
    function setVivants(on) {
      _filters.vivants = on;
      vivantsBox.checked = on;
      if (!on) setTheme('');
    }
    vivantsBox.addEventListener('change', function () { setVivants(vivantsBox.checked); refresh(); });
    /* Choisir un sujet de travail coche « En activité uniquement » : les thèmes ne concernent que les vivants */
    themeSel.addEventListener('change', function () {
      var v = themeSel.value;
      if (v) setVivants(true);
      setTheme(v);
      refresh();
    });

    resetBtn.addEventListener('click', function () {
      input.value = ''; _query = ''; clearBtn.hidden = true;
      syncAlpha('');
      [eraSel, natSel, domSel, curSel].forEach(function (s) { if (s) s.value = ''; });
      _filters.era = ''; _filters.nat = ''; _filters.dom = ''; _filters.cur = '';
      if (yearFromSel) yearFromSel.value = '';
      if (yearToSel) yearToSel.value = '';
      _filters.yearFrom = null; _filters.yearTo = null;
      setFemmes(false);
      setVivants(false);
      setColorFilter('');
      setCurColorFilter('');
      frContenu.value = ''; frRegroup.value = '';
      _fr = { contenu: '', regroup: '' };
      populateSelects();
      refresh();
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
    updateCompatibility(); /* masque tout de suite les filtres « courants » : pas de saut au chargement */

    listEl.innerHTML = '<li class="phi-search-empty">Chargement…</li>';
    /* On attend aussi les polices : si elles arrivent après la liste, les
       filtres grandissent de quelques pixels et poussent 1000 lignes. */
    var fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
    /* …puis on laisse passer une image : la page est redessinée avec les
       polices avant l'insertion de la liste, et non dans la même image. */
    var nextFrame = function (v) { return new Promise(function (ok) { requestAnimationFrame(function () { requestAnimationFrame(function () { ok(v); }); }); }); };
    Promise.all([fetch('/data/search-full-index.json').then(function (r) { return r.json(); }), fontsReady])
      .then(nextFrame)
      .then(function (res) {
        var data = res[0];
        _index = data.index || [];
        _meta = data._meta || _meta;
        /* Nombre de philosophes en activité par sujet de travail */
        THEMES_VIVANTS.forEach(function (t) {
          var n = _index.filter(function (p) { return p.live && (p.th || []).indexOf(t.v) !== -1; }).length;
          themeSel.querySelector('option[value="' + t.v + '"]').textContent = t.fr + ' (' + n + ')';
        });
        populateSelects();
        /* Lien direct vers une branche, depuis « C'est quoi la philosophie ? » : /recherche/?branche=ethique */
        var brancheUrl = (new URLSearchParams(location.search).get('branche') || '').toLowerCase();
        if (brancheUrl && domSel && (_meta.doms || []).indexOf(brancheUrl) !== -1) {
          domSel.value = brancheUrl;
          _filters.dom = brancheUrl;
          if (filtresBox) filtresBox.open = true;
          populateSelects();
        }
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
