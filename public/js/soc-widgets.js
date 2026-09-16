(function () {
  /* Lazy YouTube (soc-yt-wrap) */
  document.querySelectorAll('.soc-yt-wrap').forEach(function (wrap) {
    var vid = wrap.getAttribute('data-ytid');
    if (!vid) return;
    wrap.style.cursor = 'pointer';
    wrap.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1&rel=0';
      iframe.allow = 'autoplay; encrypted-media';
      iframe.allowFullscreen = true;
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
      wrap.innerHTML = '';
      wrap.appendChild(iframe);
    });
  });

  /* Boutons Spotify (data-lrg-tid) */
  document.querySelectorAll('[data-lrg-tid]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.soc-track-row').nextElementSibling;
      if (wrap.querySelector('iframe')) {
        wrap.innerHTML = '';
        wrap.style.display = 'none';
        btn.querySelector('.soc-btn-listen-label').textContent = '▶ Écouter';
        return;
      }
      document.querySelectorAll('.lrg-embed').forEach(function (w) {
        w.innerHTML = '';
        w.style.display = 'none';
      });
      document.querySelectorAll('.soc-btn-listen-label').forEach(function (l) {
        l.textContent = '▶ Écouter';
      });
      wrap.innerHTML = '<iframe style="border-radius:8px;border:none;width:100%;margin-top:6px" height="80" allow="autoplay;clipboard-write;encrypted-media;fullscreen;picture-in-picture" loading="lazy" src="https://open.spotify.com/embed/track/' + btn.dataset.lrgTid + '?utm_source=generator&theme=0&autoplay=1"></iframe>';
      wrap.style.display = 'block';
      btn.querySelector('.soc-btn-listen-label').textContent = '■ Stop';
    });
  });

  /* Formulaire Formspree AJAX */
  var scForm = document.querySelector('#social-contact-form');
  if (scForm) {
    scForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = scForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Envoi…';
      fetch(scForm.action, {
        method: 'POST',
        body: new FormData(scForm),
        headers: { 'Accept': 'application/json' }
      }).then(function (r) {
        if (r.ok) {
          scForm.reset();
          document.querySelector('#sc-success').style.display = 'block';
          document.querySelector('#sc-error').style.display = 'none';
        } else {
          document.querySelector('#sc-error').style.display = 'block';
          document.querySelector('#sc-success').style.display = 'none';
          btn.disabled = false; btn.textContent = 'Envoyer →';
        }
      }).catch(function () {
        document.querySelector('#sc-error').style.display = 'block';
        document.querySelector('#sc-success').style.display = 'none';
        btn.disabled = false; btn.textContent = 'Envoyer →';
      });
    });
  }
})();
