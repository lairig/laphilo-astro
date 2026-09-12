(function () {
  'use strict';

  var DATA = [];
  var activeType = 'all';
  var query = '';

  var input = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var countEl = document.getElementById('search-count');
  var typeButtons = document.querySelectorAll('.search-type-filter [data-type]');

  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render(items) {
    if (!items.length) {
      countEl.textContent = query || activeType !== 'all' ? '0 résultat' : '';
      resultsEl.innerHTML = query
        ? '<li class="search-empty">Aucun résultat pour « ' + escapeHtml(query) + ' »</li>'
        : '';
      return;
    }

    countEl.textContent = items.length + ' résultat' + (items.length > 1 ? 's' : '');

    var html = items
      .slice(0, 200)
      .map(function (item) {
        var badge = item.type === 'courant' ? 'Courant' : 'Philosophe';
        return (
          '<li><a href="' + item.url + '">' +
          '<span><span class="lp-type-badge">' + badge + '</span>' +
          '<span class="lp-name">' + escapeHtml(item.name) + '</span></span>' +
          '<span class="lp-date">' + escapeHtml(item.date) + '</span>' +
          '</a></li>'
        );
      })
      .join('');
    resultsEl.innerHTML = html;
  }

  function runSearch() {
    var q = normalize(query).trim();
    var words = q.length ? q.split(/\s+/).filter(Boolean) : [];

    if (!words.length && activeType === 'all') {
      render([]);
      return;
    }

    var filtered = DATA.filter(function (item) {
      if (activeType !== 'all' && item.type !== activeType) return false;
      if (!words.length) return true;
      var haystack = normalize(item.name);
      return words.every(function (w) {
        return haystack.indexOf(w) !== -1;
      });
    });

    filtered.sort(function (a, b) {
      return a.year - b.year;
    });

    render(filtered);
  }

  function setActiveType(type) {
    activeType = type;
    typeButtons.forEach(function (btn) {
      btn.classList.toggle('phi-filter-btn--active', btn.dataset.type === type);
    });
    runSearch();
  }

  fetch('/data/search-index.json')
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      DATA = json;
    })
    .catch(function () {
      countEl.textContent = 'Impossible de charger l’index de recherche.';
    });

  input.addEventListener('input', function () {
    query = input.value;
    runSearch();
  });

  typeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveType(btn.dataset.type);
    });
  });
})();
