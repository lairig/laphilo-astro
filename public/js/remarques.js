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
    })
    .catch(function () {});

  function ficheChoisie() {
    var x = parNom[champFiche.value.trim().toLowerCase()];
    return x ? { fiche: x[0], fiche_nom: x[1] } : { fiche: '', fiche_nom: '' };
  }

  /* ── Message privé : e-mail nécessaire ── */
  var prive = $('#rq-prive'), email = $('#rq-email');
  prive.addEventListener('change', function () {
    $('#rq-email-label').textContent = prive.checked ? 'E-mail (pour vous répondre, jamais affiché)' : 'E-mail (facultatif, jamais affiché)';
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
      categorie: $('#rq-categorie').value,
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
        form.reset();
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
    return '<article class="rq-message" data-cat="' + esc(x.categorie) + '">'
      + '<p class="rq-meta"><b>' + esc(x.nom) + '</b> · ' + jour(x.cree) + ' · ' + sujet
      + ' <span class="rq-badge">' + esc(CATEGORIES[x.categorie] || 'Remarque') + '</span></p>'
      + '<div class="rq-texte">' + paragraphes(x.message) + '</div>'
      + (x.reponse ? '<div class="rq-reponse"><p class="rq-meta"><b>↳ laphilo.fr</b>' + (x.reponse_le ? ' · ' + jour(x.reponse_le) : '') + '</p>'
        + paragraphes(x.reponse) + '</div>' : '')
      + '</article>';
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
        plus.hidden = (d.page + 1) * d.par_page >= d.total;
      })
      .catch(function () {
        if (!ajouter) zone.innerHTML = '<p class="rq-vide">Les messages ne peuvent pas être affichés pour le moment.</p>';
      })
      .then(function () { plus.disabled = false; });
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
