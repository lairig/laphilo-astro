(function () {
  fetch('/data/search-full-index.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var idx = (data && data.index) || [];
      var phi = idx.filter(function (e) { return e.y === 'philosophe'; }).length;
      var cur = idx.filter(function (e) { return e.y === 'courant'; }).length;
      var statsEl = document.getElementById('js-stats-fr');
      if (statsEl) {
        statsEl.innerHTML =
          '✦  <span class="stats-num">' + cur + '</span> courants de pensée     ✦     <span class="stats-num">' + phi + '</span> philosophes';
      }

      var pool = idx
        .filter(function (e) { return e.y === 'philosophe' && e.t && e.desc; })
        .sort(function (a, b) { return a.n < b.n ? -1 : a.n > b.n ? 1 : 0; });
      var poolCur = idx
        .filter(function (e) { return e.y === 'courant' && e.desc; })
        .sort(function (a, b) { return a.n < b.n ? -1 : a.n > b.n ? 1 : 0; });

      var wrap = document.getElementById('alaune-wrap');
      if (!wrap || !pool.length || !poolCur.length) return;

      var now = new Date();
      var dayOfYear = Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 1)) / 86400000
      ) + 1;
      var entry = pool[dayOfYear % pool.length];
      var entryCur = poolCur[(dayOfYear + 47) % poolCur.length];

      var friseUrl = function (e) {
        return e.u + '?p=' + encodeURIComponent(e.n);
      };
      var entryFriseUrl = friseUrl(entry);
      var entryCurFriseUrl = friseUrl(entryCur);

      var titleCase = function (s) {
        return s.toLowerCase().replace(/(^|[^a-zàâäéèêëïîôöùûüç])([a-zàâäéèêëïîôöùûüç])/gi, function (m, sep, c) {
          return sep + c.toUpperCase();
        });
      };

      var domHue = 0;
      var domName = (entryCur.dom && entryCur.dom[0]) || '';
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
        '        <img class="alaune-portrait" src="' + entry.t + '" alt="' + entry.n + '" width="72" height="72" loading="lazy">' +
        '        <div class="alaune-text">' +
        '          <span class="alaune-name">' + titleCase(entry.n) + '</span>' +
        '          <span class="alaune-dates">' + (entry.d || '') + '</span>' +
        '          <span class="alaune-desc">' + entry.desc + '</span>' +
        '        </div>' +
        '        <span class="alaune-btn">Découvrir <span class="alaune-btn-arrow">↗</span></span>' +
        '      </div>' +
        '    </a>' +
        '    <a class="alaune-card alaune-card--cur" href="' + entryCurFriseUrl + '">' +
        '      <span class="alaune-subeyebrow">Courant de pensée à la une</span>' +
        '      <div class="alaune-inner">' +
        (domName ? '        <span class="alaune-dom-badge" style="--dom-hue:' + domHue + '">' + domName + '</span>' : '') +
        '        <div class="alaune-text">' +
        '          <span class="alaune-name">' + entryCur.n + '</span>' +
        '          <span class="alaune-dates">' + (entryCur.d || '') + '</span>' +
        '          <span class="alaune-desc">' + entryCur.desc + '</span>' +
        '        </div>' +
        '        <span class="alaune-btn">Découvrir <span class="alaune-btn-arrow">↗</span></span>' +
        '      </div>' +
        '    </a>' +
        '  </div>' +
        '</div>';
    })
    .catch(function () {});
})();
