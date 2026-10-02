/* Panneau d'un courant de pensée, commun à la Frise des courants
   (/frises/courants-du-monde/) et au Tableau des courants
   (/frises/tableau-des-courants/).
   Contenu : infos de base du courant (dates, traditions, grandes questions,
   description, vidéo), lien vers sa fiche, la liste complète de
   ses représentants sur le site (fiche + frise de chacun).
   Usage : CourantsPanneau.init(json, groupes) une fois les données chargées,
   puis zone.innerHTML = CourantsPanneau.html(id) et
   CourantsPanneau.brancher(zone, { choisir(id), fermer() }). */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  /* Grandes questions (colonne Branche des courants) */
  var QUESTIONS = {
    'Métaphysique': 'Métaphysique',
    'Théologie et spiritualité': 'Spiritualité',
    'Philosophie politique': 'Politique',
    'Éthique': 'Éthique',
    'Épistémologie': 'Connaissance',
    'Logique': 'Logique',
    'Philosophie des sciences et du vivant': 'Sciences',
    "Philosophie de l'esprit": 'Esprit',
  };
  var C = [], P = [], parId = {}, G = {};

  function init(json, groupes) {
    G = {};
    groupes.forEach(function (g) { G[g.id] = g; });
    P = json.philosophes.map(function (p) {
      return { id: p[0], n: p[1], y: p[2], d: p[3], g: p[4], th: p[5], f: p[6], vivant: !!p[7] };
    });
    C = json.courants.map(function (c) {
      return {
        id: c[0], n: c[1], y: c[2], d: c[3], g: c[4], t: c[5] ? c[5].split(';') : [],
        b: c[6] ? c[6].split(';') : [], x: c[7], yt: c[8], f: c[9], reps: c[10],
      };
    });
    parId = {};
    C.forEach(function (c) { parId[c.id] = c; });
    return { courants: C, philosophes: P, parId: parId };
  }

  function couleur(g) { return (G[g] && G[g].color) || '#d4a843'; }

  function html(id) {
    var c = parId[id];
    if (!c) return '';
    var trad = G[c.g] ? G[c.g].label : '';
    var aussi = c.t.filter(function (t) { return G[t]; }).map(function (t) { return G[t].court; });
    var questions = c.b.map(function (b) { return QUESTIONS[b] || b; });
    var reps = c.reps.map(function (i) { return P[i]; });

    var h = '<div class="carte cp" style="--c:' + couleur(c.g) + '">'
      + '<div class="carte-tete"><div class="cp-titre"><h2>' + esc(c.n) + '</h2>'
      + '<p>' + esc(c.d) + (trad ? ' · ' + esc(trad) : '') + (aussi.length ? ' · aussi : ' + esc(aussi.join(', ')) : '') + '</p>'
      + (questions.length ? '<p class="cp-questions">' + questions.map(function (q) { return '<span>' + esc(q) + '</span>'; }).join('') + '</p>' : '')
      + '</div>'
      + '<div class="carte-actions"><a class="btn" href="/courants/' + esc(c.id) + '/">Voir la fiche →</a>'
      + '<button class="btn cp-fermer" type="button">✕ Fermer</button></div></div>'
      + (c.x ? '<p class="cp-desc">' + esc(c.x.charAt(0).toUpperCase() + c.x.slice(1)) + '</p>' : '')
      + (c.yt ? '<button class="btn cp-video" type="button" data-yt="' + esc(c.yt) + '">▶ Voir la vidéo</button><div class="cp-lecteur"></div>' : '')
      + '<p class="contemps-titre">Ses représentants</p>';

    if (!reps.length) {
      h += '<p class="vide">Aucun représentant sur le site pour l’instant.</p>';
    } else {
      h += '<ul class="cp-reps">' + reps.map(function (p) {
        var g = G[p.g];
        return '<li style="--g:' + couleur(p.g) + '">'
          + (p.th ? '<img class="cp-mini" src="' + esc(p.th) + '" alt="" width="34" height="34" loading="lazy">' : '<span class="cp-mini"></span>')
          + '<span class="cp-nom"><a href="/philosophes/' + esc(p.id) + '/">' + esc(p.n) + '</a>'
          + (p.vivant ? ' <span class="cp-vivant" title="En activité">●</span>' : '')
          + '<small>' + esc(p.d) + (g ? ' · <span class="cp-trad">' + esc(g.court) + '</span>' : '') + '</small></span>'
          + '<a class="cp-frise" href="/philosophes/frise/' + esc(p.f) + '/?p=' + encodeURIComponent(p.n) + '" title="Voir sur sa frise" aria-label="'
          + esc(p.n) + ' sur sa frise">⟷</a></li>';
      }).join('') + '</ul>';
    }
    return h + '</div>';
  }

  function brancher(zone, actions) {
    var f = zone.querySelector('.cp-fermer');
    if (f) f.onclick = actions.fermer;
    var v = zone.querySelector('.cp-video');
    if (v) v.onclick = function () {
      zone.querySelector('.cp-lecteur').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.dataset.yt)
        + '?autoplay=1" title="Vidéo" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      v.remove();
    };
  }

  window.CourantsPanneau = { init: init, html: html, brancher: brancher, QUESTIONS: QUESTIONS };
})();
