(function () {
  fetch('/data/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (idx) {
      var phi = idx.filter(function (e) { return e.type === 'philosophe'; }).length;
      var cur = idx.filter(function (e) { return e.type === 'courant'; }).length;
      var statsEl = document.getElementById('js-stats-fr');
      if (statsEl) {
        statsEl.innerHTML =
          '✦  <span class="stats-num">' + cur + '</span> courants de pensée     ✦     <span class="stats-num">' + phi + '</span> philosophes';
      }

      var pool = idx
        .filter(function (e) { return e.type === 'philosophe' && e.thumbnail && e.description; })
        .sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
      var poolCur = idx
        .filter(function (e) { return e.type === 'courant' && e.description; })
        .sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

      var wrap = document.getElementById('alaune-wrap');
      if (!wrap || !pool.length || !poolCur.length) return;

      var now = new Date();
      var dayOfYear = Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / 86400000
      ) + 1;
      var entry = pool[dayOfYear % pool.length];
      var entryCur = poolCur[(dayOfYear + 47) % poolCur.length];

      var friseUrl = function (e, base) {
        return e.frise ? '/' + base + '/frise/' + e.frise + '/' : e.url;
      };
      var entryFriseUrl = friseUrl(entry, 'philosophes');
      var entryCurFriseUrl = friseUrl(entryCur, 'courants');

      var titleCase = function (s) {
        return s.toLowerCase().replace(/(^|[^a-zàâäéèêëïîôöùûüç])([a-zàâäéèêëïîôöùûüç])/gi, function (m, sep, c) {
          return sep + c.toUpperCase();
        });
      };

      var domHue = 0;
      var domName = (entryCur.branches && entryCur.branches[0]) || '';
      for (var i = 0; i < domName.length; i++) {
        domHue = (domHue * 31 + domName.charCodeAt(i)) >>> 0;
      }
      domHue = domHue % 360;

      wrap.innerHTML =
        '<div class="alaune-group">' +
        '  <span class="alaune-eyebrow">✦ À la une aujourd\'hui ✦</span>' +
        '  <div class="alaune-group-grid">' +
        '    <a class="alaune-card alaune-card--phi" href="' + entryFriseUrl + '">' +
        '      <span class="alaune-subeyebrow">Philosophe à la une</span>' +
        '      <div class="alaune-inner">' +
        '        <img class="alaune-portrait" src="' + entry.thumbnail + '" alt="' + entry.name + '" width="72" height="72" loading="lazy">' +
        '        <div class="alaune-text">' +
        '          <span class="alaune-name">' + titleCase(entry.name) + '</span>' +
        '          <span class="alaune-dates">' + (entry.date || '') + '</span>' +
        '          <span class="alaune-desc">' + entry.description + '</span>' +
        '        </div>' +
        '        <span class="alaune-btn">Découvrir <span class="alaune-btn-arrow">↗</span></span>' +
        '      </div>' +
        '    </a>' +
        '    <a class="alaune-card alaune-card--cur" href="' + entryCurFriseUrl + '">' +
        '      <span class="alaune-subeyebrow">Courant de pensée à la une</span>' +
        '      <div class="alaune-inner">' +
        (domName ? '        <span class="alaune-dom-badge" style="--dom-hue:' + domHue + '">' + domName + '</span>' : '') +
        '        <div class="alaune-text">' +
        '          <span class="alaune-name">' + entryCur.name + '</span>' +
        '          <span class="alaune-dates">' + (entryCur.date || '') + '</span>' +
        '          <span class="alaune-desc">' + entryCur.description + '</span>' +
        '        </div>' +
        '        <span class="alaune-btn">Découvrir <span class="alaune-btn-arrow">↗</span></span>' +
        '      </div>' +
        '    </a>' +
        '  </div>' +
        '</div>';
    })
    .catch(function () {});
})();
