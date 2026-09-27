/* « À la une aujourd'hui » : le bloc est déjà rendu au build pour le jour
   du build (data-day). Les autres jours, on charge le fragment du jour. */
(function () {
  var wrap = document.getElementById('alaune-wrap');
  if (!wrap) return;

  var now = new Date();
  var dayOfYear = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / 86400000
  ) + 1;
  if (String(dayOfYear) === wrap.getAttribute('data-day')) return;

  fetch('/data/alaune/' + dayOfYear + '.html')
    .then(function (r) { return r.ok ? r.text() : ''; })
    .then(function (html) { if (html) wrap.innerHTML = html; })
    .catch(function () {});
})();
