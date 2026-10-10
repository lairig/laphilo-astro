/* Page « Vos remarques » : envoi d'un message et liste des messages publiés
   (API du Worker Cloudflare, worker/remarques.js). */
(function () {
  'use strict';

  var CATEGORIES = { erreur: 'Erreur signalée', suggestion: 'Suggestion', question: 'Question', autre: 'Remarque' };
  var $ = function (s) { return document.querySelector(s); };
  var form = $('#rq-form');
  if (!form) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function paragraphes(s) {
    return esc(s).split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function jour(iso) {
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  /* ── Champ « À propos de » : liste des fiches ── */
  var parNom = {}, parChemin = {};
  var champFiche = $('#rq-fiche');
  fetch('/data/fiches-noms.json')
    .then(function (r) { return r.json(); })
    .then(function (liste) {
      var dl = $('#rq-fiches'), html = [];
      liste.forEach(function (x) {
        parNom[x[1].toLowerCase()] = x;
        parChemin[x[0]] = x;
        html.push('<option value="' + esc(x[1]) + '">');
      });
      dl.innerHTML = html.join('');
      /* Venu d'une fiche (« Une remarque sur cette fiche ? ») : fiche déjà choisie */
      var demande = new URLSearchParams(location.search).get('fiche');
      if (demande && parChemin[demande]) champFiche.value = parChemin[demande][1];
      majVenue();
    })
    .catch(function () {});

  function ficheChoisie() {
    var x = parNom[champFiche.value.trim().toLowerCase()];
    return x ? { fiche: x[0], fiche_nom: x[1] } : { fiche: '', fiche_nom: '' };
  }

  /* Bandeau « Votre message portera sur la fiche … » : portrait, nom, dates, lien vers la fiche */
  var venue = $('#rq-venue');
  function majVenue() {
    var x = parNom[champFiche.value.trim().toLowerCase()];
    venue.hidden = !x;
    if (!x) return;
    $('#rq-venue-nom').textContent = x[1].replace(/ \(courant\)$/, '');
    $('#rq-venue-lien').href = x[0];
    $('#rq-venue-dates').textContent = (/ \(courant\)$/.test(x[1]) ? 'Courant de pensée' : 'Philosophe') + (x[2] ? ' · ' + x[2] : '');
    var img = $('#rq-venue-img');
    img.hidden = !x[3];
    $('#rq-venue-pastille').hidden = !!x[3];
    if (x[3]) img.src = x[3];
  }
  champFiche.addEventListener('input', majVenue);
  champFiche.addEventListener('change', majVenue);
  $('#rq-venue-changer').addEventListener('click', function () {
    champFiche.value = '';
    majVenue();
    champFiche.focus();
  });

  /* ── Message privé : e-mail nécessaire ── */
  var prive = $('#rq-prive'), email = $('#rq-email');
  prive.addEventListener('change', function () {
    $('#rq-email-label').innerHTML = 'E-mail <small>' + (prive.checked ? 'pour vous répondre, jamais affiché' : 'facultatif, jamais affiché') + '</small>';
    email.required = prive.checked;
  });

  /* ── Envoi ── */
  var retour = $('#rq-retour'), bouton = $('#rq-envoyer');
  function dire(texte, ok) {
    retour.textContent = texte;
    retour.className = 'rq-retour ' + (ok ? 'rq-ok' : 'rq-err');
  }
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nom = $('#rq-nom').value.trim(), message = $('#rq-message').value.trim();
    if (nom.length < 2) { dire('Indiquez votre nom ou un pseudo.'); $('#rq-nom').focus(); return; }
    if (message.length < 5) { dire('Écrivez votre message.'); $('#rq-message').focus(); return; }
    if (prive.checked && !email.value.trim()) { dire('Pour un message privé, indiquez votre e-mail.'); email.focus(); return; }
    var f = ficheChoisie();
    var jeton = form.querySelector('[name="cf-turnstile-response"]');
    var donnees = {
      nom: nom,
      email: email.value.trim(),
      categorie: (form.querySelector('[name="categorie"]:checked') || {}).value || 'autre',
      fiche: f.fiche,
      fiche_nom: f.fiche_nom,
      message: message,
      prive: prive.checked,
      site: form.elements.site.value,
      turnstile: jeton ? jeton.value : '',
    };
    bouton.disabled = true;
    dire('Envoi…', true);
    fetch('/api/remarques', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(donnees) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
      })
      .then(function (x) {
        if (!x.ok) throw new Error(x.d.erreur || 'Le message n’a pas pu être envoyé. Réessayez plus tard.');
        var sujet = champFiche.value;
        form.reset();
        champFiche.value = sujet; // le sujet reste choisi pour un message suivant
        prive.dispatchEvent(new Event('change'));
        dire(donnees.prive
          ? 'Merci ! Votre message a bien été envoyé à l’auteur du site.'
          : 'Merci ! Votre message sera publié après relecture.', true);
      })
      .catch(function (e) { dire(e.message || 'Le message n’a pas pu être envoyé. Réessayez plus tard.'); })
      .then(function () {
        bouton.disabled = false;
        if (window.turnstile) try { window.turnstile.reset(); } catch (e) {}
      });
  });

  /* ── Messages publiés ── */
  var zone = $('#rq-messages'), plus = $('#rq-plus'), total = $('#rq-total');
  var categorie = '', page = 0;

  function carte(x) {
    var sujet = x.fiche
      ? 'à propos de <a href="' + esc(x.fiche) + '">' + esc(x.fiche_nom) + '</a>'
      : 'remarque générale';
    var initiale = (x.nom.match(/[A-Za-zÀ-ÿ0-9]/) || ['✦'])[0].toUpperCase();
    return '<article class="rq-message" data-cat="' + esc(x.categorie) + '">'
      + '<span class="rq-avatar" aria-hidden="true">' + esc(initiale) + '</span>'
      + '<p class="rq-meta"><strong>' + esc(x.nom) + '</strong><span>' + jour(x.cree) + '</span><span>' + sujet + '</span>'
      + '<span class="rq-badge">' + esc(CATEGORIES[x.categorie] || 'Remarque') + '</span></p>'
      + '<div class="rq-texte">' + paragraphes(x.message)
      + (x.reponse ? '<div class="rq-reponse"><p class="rq-meta"><strong>laphilo.fr</strong>' + (x.reponse_le ? '<span>' + jour(x.reponse_le) + '</span>' : '') + '</p>'
        + paragraphes(x.reponse) + '</div>' : '')
      + '</div></article>';
  }

  function charger(ajouter) {
    if (!ajouter) page = 0;
    plus.disabled = true;
    fetch('/api/remarques?page=' + page + (categorie ? '&categorie=' + categorie : ''))
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) {
        var html = d.remarques.map(carte).join('');
        if (ajouter) zone.insertAdjacentHTML('beforeend', html);
        else zone.innerHTML = html || '<p class="rq-vide">' + (categorie ? 'Aucun message de ce type pour l’instant.' : 'Aucun message publié pour l’instant : soyez le premier !') + '</p>';
        if (!categorie) total.textContent = d.total ? '(' + d.total + ')' : '';
        compter(d);
        plus.hidden = (d.page + 1) * d.par_page >= d.total;
      })
      .catch(function () {
        if (!ajouter) zone.innerHTML = '<p class="rq-vide">Les messages ne peuvent pas être affichés pour le moment.</p>';
      })
      .then(function () { plus.disabled = false; });
  }

  /* Nombre de messages publiés de chaque type, sur les boutons de filtre */
  function compter(d) {
    var n = d.par_categorie || {}, tous = 0;
    Object.keys(n).forEach(function (k) { tous += n[k]; });
    document.querySelectorAll('.rq-filtre').forEach(function (b) {
      var k = b.getAttribute('data-cat'), v = k ? n[k] || 0 : tous;
      var s = b.querySelector('small') || b.appendChild(document.createElement('small'));
      s.textContent = v ? v : '';
    });
  }

  plus.addEventListener('click', function () { page += 1; charger(true); });
  document.querySelectorAll('.rq-filtre').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.rq-filtre').forEach(function (x) { x.classList.toggle('actif', x === b); });
      categorie = b.getAttribute('data-cat');
      charger(false);
    });
  });
  charger(false);
})();
