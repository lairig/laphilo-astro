/* ══════════════════════════════════════════════════════════════════════════
   slide-media.js — médias et liens d'une fiche, communs aux frises et aux
   pages de fiche (/philosophes/xxx/, /courants/xxx/) :
     - vignette YouTube → lecteur au clic ;
     - bouton 🎧 → lecteur audio sous le texte ;
     - liens du texte → panneau latéral gauche (Wikipédia, YouTube, site
       externe), ou petite fenêtre pour les PDF et les sites qui refusent
       d'être affichés dans une page.
   Chargé avant frise-engine.js, qui l'utilise via window.SlideMedia.
   Sur une page de fiche : <script src="/js/slide-media.js" data-init="fiche">
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const _isEN = (document.documentElement.lang || '').toLowerCase().startsWith('en');

  /* Domaines qui refusent l'affichage en iframe → petite fenêtre */
  let IFRAME_BLOCKED_DOMAINS = [];
  fetch('/data/iframe-blocked-domains.json')
    .then(r => (r.ok ? r.json() : []))
    .then(list => { IFRAME_BLOCKED_DOMAINS = list || []; })
    .catch(() => {});

  const _BLOCKED_STATIC = new Set(['persee.fr', 'academia.edu', 'jstor.org', 'cairn.info']);

  const _popup = u => window.open(u, 'popup',
    'width=900,height=600,left=50,top=550,' +
    'scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=yes');

  /* ── Délégation sur le conteneur des fiches : vidéo, audio, liens croisés ── */
  function bindContainer(container) {
    /* Vignette YouTube → lecteur */
    container.addEventListener('click', e => {
      const lazy = e.target.closest('.yt-lazy');
      if (!lazy || lazy.classList.contains('loaded')) return;
      const ifr = lazy.querySelector('iframe');
      ifr.src = `https://www.youtube-nocookie.com/embed/${lazy.dataset.ytid}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`;
      lazy.classList.add('loaded');
      /* La coupure des autres médias est gérée par media-exclusive.js */
    });

    /* Bouton 🎧 → lecteur audio */
    container.addEventListener('click', e => {
      const btn = e.target.closest('.audio-lazy-btn');
      if (!btn) return;
      openAudioPlayer(btn.closest('.slide'), btn.dataset.src, btn.dataset.title);
    });
    container.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const lazy = e.target.closest('.yt-lazy');
      if (!lazy || lazy.classList.contains('loaded')) return;
      lazy.click();
    });

    /* Liens croisés (courants / représentants) : couper les médias avant de partir */
    container.addEventListener('click', e => {
      const link = e.target.closest('.cross-link-badge');
      if (!link || !link.href) return;
      if (window.LaphiloMedia) window.LaphiloMedia.stopAll();
    });
  }

  /* ── Liens du texte d'une fiche → panneau latéral ou petite fenêtre ── */
  function bindLinks(slide) {
    slide.querySelectorAll('.slide-body a').forEach(a => {
      a.style.removeProperty('color'); /* couleurs inline héritées d'Excel */
      a.setAttribute('rel', 'noopener noreferrer');
      a.addEventListener('click', e => {
        e.preventDefault();
        const href = a.href;
        /* PDF → petite fenêtre */
        if (/\.pdf(\?.*)?$/i.test(href)) { _popup(href); return; }
        /* Domaines hostiles aux iframes → petite fenêtre */
        try {
          const host = new URL(href).hostname.replace(/^www\./, '');
          if (IFRAME_BLOCKED_DOMAINS.some(d => host === d || host.endsWith('.' + d))) { _popup(href); return; }
        } catch (_) {}
        /* Cas général → panneau latéral */
        openDrawer(slide, href, a.textContent.trim() || href);
      });
    });
  }

  /* ══════════════════════════════════════════════════════
     PANNEAU LATÉRAL GAUCHE
  ══════════════════════════════════════════════════════ */
  let _drawerEl      = null;
  let _drawerContent = null;
  let _drawerTitle   = null;
  let _drawerLabel   = null;

  /* Fermeture au clavier (Échap) */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _drawerEl && _drawerEl.classList.contains('open')) closeDrawer();
  });

  /* ── Crée un panneau vide et l'injecte dans une .slide-media ── */
  function buildDrawer(slideMedia) {
    if (!slideMedia || slideMedia.querySelector('.link-drawer')) return;
    const drawer = document.createElement('div');
    drawer.className = 'link-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', _isEN ? 'Link information' : 'Informations sur le lien');

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:.52rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(180,130,20,.5);margin-bottom:.15rem;';

    const labelEl = document.createElement('div');
    labelEl.className = 'drawer-label';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'drawer-title';
    titleWrap.appendChild(titleEl);
    titleWrap.appendChild(labelEl);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'drawer-close';
    closeBtn.setAttribute('aria-label', _isEN ? 'Close' : 'Fermer');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', () => closeDrawer());

    const header = document.createElement('div');
    header.className = 'drawer-header';
    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'drawer-content';

    drawer.appendChild(header);
    drawer.appendChild(content);
    slideMedia.appendChild(drawer);
  }

  /* immediate : vider tout de suite (changement de fiche) plutôt qu'après l'animation */
  function closeDrawer(immediate) {
    if (!_drawerEl) return;
    _drawerEl.classList.remove('open');

    /* Stopper l'audio et les iframes (YouTube + externe) */
    const audio = _drawerContent.querySelector('audio');
    if (audio) { audio.pause(); audio.src = ''; }
    _drawerContent.querySelectorAll('iframe').forEach(f => { f.src = ''; });

    if (immediate) { _drawerContent.innerHTML = ''; return; }
    const el = _drawerEl, content = _drawerContent;
    setTimeout(() => { if (!el.classList.contains('open')) content.innerHTML = ''; }, 340);
  }

  /* ── Type de lien ── */
  function detectLinkType(url) {
    try {
      const u = new URL(url);
      const h = u.hostname.replace(/^www\./, '');
      if (h.includes('wikipedia.org'))             return 'wikipedia';
      if (h === 'youtube.com' || h === 'youtu.be') return 'youtube';
      if (h.includes('radiofrance') ||
          h.includes('france.culture') ||
          u.pathname.match(/\.mp3(\?|$)/i))        return 'audio';
    } catch (_) { /* URL relative ou invalide → externe */ }
    return 'external';
  }

  function extractYtId(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
      return u.searchParams.get('v') || u.pathname.split('/').pop();
    } catch (_) { return null; }
  }

  /* ── Ouverture du panneau de la fiche `slide` avec le bon contenu ── */
  function openDrawer(slide, url, label) {
    const type = detectLinkType(url);

    /* Lien externe bloqué : banderole */
    if (type === 'external') {
      try {
        const h = new URL(url).hostname;
        if ([..._BLOCKED_STATIC].some(d => h === d || h.endsWith('.' + d))) {
          _showLinkBanner(slide, url, label); return;
        }
      } catch (_) {}
    }

    /* Audio : lecteur dédié, pas de panneau */
    if (type === 'audio') { openAudioPlayer(slide, url, label); return; }

    const slideMedia = slide && slide.querySelector('.slide-media');
    if (!slideMedia) return;
    buildDrawer(slideMedia);
    _drawerEl      = slideMedia.querySelector('.link-drawer');
    _drawerContent = _drawerEl.querySelector('.drawer-content');
    _drawerTitle   = _drawerEl.querySelector('.drawer-title > div:first-child');
    _drawerLabel   = _drawerEl.querySelector('.drawer-label');

    const typeLabels = _isEN
      ? { wikipedia: 'Wikipedia', youtube: 'YouTube Video', external: 'External link' }
      : { wikipedia: 'Wikipédia', youtube: 'Vidéo YouTube', external: 'Lien externe' };
    _drawerTitle.textContent = typeLabels[type] || 'Lien';
    _drawerLabel.textContent = label || url;

    _drawerContent.classList.remove('flush', 'centered');
    _drawerContent.innerHTML = `
      <div class="drawer-loading">
        <div class="drawer-spinner"></div>
        <div class="drawer-loading-label">${_isEN ? 'Loading…' : 'Chargement…'}</div>
      </div>`;

    _drawerEl.classList.add('open');

    /* Mobile portrait : .slide-media est au-dessus de .slide-text, le
       panneau s'ouvrirait hors champ sans ce défilement */
    slideMedia.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (type === 'wikipedia') {
      _drawerContent.classList.add('flush');
      _loadWikipedia(url, label);
    } else if (type === 'youtube') {
      _drawerContent.classList.add('flush');
      _loadYoutube(url, label);
    } else {
      _loadExternal(url, label);
    }
  }

  /* ── Wikipédia : page complète via action=parse ── */
  function _loadWikipedia(url, label) {
    try {
      const u     = new URL(url);
      const lang  = u.hostname.split('.')[0];
      const title = decodeURIComponent(u.pathname.replace(/^\/wiki\//, ''));
      const apiUrl = `https://${lang}.wikipedia.org/w/api.php`
        + `?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
      const content = _drawerContent;

      fetch(apiUrl)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(data => {
          const rawHtml = data.parse && data.parse.text && data.parse.text['*'];
          if (!rawHtml) throw new Error('empty');

          /* Réécriture des liens et images (template : contenu inerte) */
          const tmp = document.createElement('template');
          tmp.innerHTML = rawHtml;
          const frag = tmp.content;

          frag.querySelectorAll('a[href]').forEach(a => {
            const h = a.getAttribute('href');
            if (!h) return;
            if (h.startsWith('/wiki/') || h.startsWith('/w/')) a.setAttribute('href', `https://${lang}.wikipedia.org${h}`);
            else if (h.startsWith('//')) a.setAttribute('href', 'https:' + h);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });
          frag.querySelectorAll('img[src]').forEach(img => {
            const s = img.getAttribute('src');
            if (s && s.startsWith('//')) img.setAttribute('src', 'https:' + s);
          });
          frag.querySelectorAll(
            '.mw-editsection, #toc, .toc, .navbox, .noprint, ' +
            '.mw-jump-link, .sistersitebox, .ambox, .mbox-small'
          ).forEach(el => el.remove());

          const box = document.createElement('div');
          box.appendChild(frag);
          content.innerHTML = `
            <div class="drawer-wiki-full" style="padding:.9rem 1rem 1.2rem">
              ${box.innerHTML}
            </div>
            <div class="drawer-wiki-source" style="padding:.6rem 1rem .8rem">
              <a href="${url}" target="_blank" rel="noopener noreferrer">
                ${_isEN ? 'View full article on Wikipedia ↗' : 'Voir l\'article complet sur Wikipédia ↗'}
              </a>
            </div>`;
        })
        .catch(() => _showExternalFallback(url, label, _isEN ? 'Unable to load Wikipedia article.' : 'Impossible de charger l\'article Wikipédia.'));
    } catch (_) {
      _showExternalFallback(url, label);
    }
  }

  /* ── YouTube : iframe nocookie avec autoplay ── */
  function _loadYoutube(url, label) {
    const ytId = extractYtId(url);
    if (!ytId) { _loadExternal(url, label); return; }
    _drawerContent.innerHTML = `
      <div class="drawer-yt-wrap">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1"
          title="${label || 'Vidéo YouTube'}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen">
        </iframe>
      </div>`;
  }

  /* ── Lien externe autorisé : iframe pleine zone ── */
  function _loadExternal(url, label) {
    _drawerContent.classList.add('flush');
    _drawerContent.innerHTML = `
      <div class="drawer-iframe-wrap">
        <iframe class="drawer-iframe"
          src="${url}"
          title="${(label || url).replace(/"/g, '&quot;')}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups">
        </iframe>
      </div>`;
  }

  /* ── Lien externe bloqué : banderole au bas de .slide-media ── */
  function _showLinkBanner(slide, url, label) {
    const slideMedia = slide && slide.querySelector('.slide-media');
    if (!slideMedia) return;
    const old = slideMedia.querySelector('.link-banner');
    if (old) old.remove();

    const banner = document.createElement('div');
    banner.className = 'link-banner';
    banner.innerHTML = `
      <span class="link-banner-icon">🔗</span>
      <span class="link-banner-label">${label || url}</span>
      <button class="link-banner-visit">Visiter →</button>
      <button class="link-banner-close" aria-label="Fermer">✕</button>`;
    banner.querySelector('.link-banner-visit').addEventListener('click', () => _popup(url));
    banner.querySelector('.link-banner-close').addEventListener('click', () => {
      banner.classList.remove('open');
      setTimeout(() => banner.remove(), 300);
    });

    slideMedia.appendChild(banner);
    banner.getBoundingClientRect(); /* reflow pour déclencher la transition */
    banner.classList.add('open');
    slideMedia.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Message « site bloqué » + bouton fenêtre ── */
  function _showExternalFallback(url, label, message) {
    _drawerContent.classList.remove('flush');
    _drawerContent.classList.add('centered');
    _drawerContent.innerHTML = `
      <div class="drawer-blocked-inline">
        <div class="drawer-blocked-inline-icon">🔒</div>
        <p class="drawer-blocked-inline-text">
          ${message || (_isEN ? 'This site cannot be displayed here.' : 'Ce site ne peut pas être affiché ici.')}
        </p>
        <button class="drawer-blocked-visit">${_isEN ? 'Open in a window' : 'Ouvrir dans une fenêtre'}</button>
      </div>`;
    _drawerContent.querySelector('.drawer-blocked-visit').addEventListener('click', () => _popup(url));
  }

  /* ══════════════════════════════════════════════════════
     LECTEUR AUDIO (barre sous le texte de la fiche)
  ══════════════════════════════════════════════════════ */
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    const m  = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  const SVG_PLAY  = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const SVG_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

  function openAudioPlayer(slide, src, label) {
    /* Fermer tout lecteur déjà ouvert */
    document.querySelectorAll('.audio-player-bar').forEach(bar => {
      const a = bar.querySelector('audio');
      if (a) { a.pause(); a.src = ''; }
      bar.remove();
    });
    /* Les vidéos en cours sont mises en pause par media-exclusive.js au démarrage de l'audio */

    const slideText = slide && slide.querySelector('.slide-text');
    if (!slideText) return;
    const slideAudio = slideText.querySelector('.slide-audio');

    const bar = document.createElement('div');
    bar.className = 'audio-player-bar';
    bar.innerHTML = `
      <button class="audio-player-close" aria-label="Fermer">&#10005;</button>
      <div class="audio-player-controls">
        <button class="audio-player-play" aria-label="${_isEN ? 'Play / Pause' : 'Lecture / Pause'}">${SVG_PLAY}</button>
        <div class="audio-player-progress" role="slider" tabindex="0" aria-label="${_isEN ? 'Progress' : 'Progression'}">
          <div class="audio-player-progress-fill"></div>
        </div>
        <div class="audio-player-time">0:00 / 0:00</div>
      </div>`;

    /* L'élément <audio> n'est créé qu'au clic : rien n'est téléchargé avant */
    const audio = document.createElement('audio');
    audio.src     = src;
    audio.preload = 'metadata';
    bar.appendChild(audio);

    const playBtn  = bar.querySelector('.audio-player-play');
    const fill     = bar.querySelector('.audio-player-progress-fill');
    const timeEl   = bar.querySelector('.audio-player-time');
    const progress = bar.querySelector('.audio-player-progress');
    const closeBtn = bar.querySelector('.audio-player-close');

    playBtn.addEventListener('click', () => { if (audio.paused) audio.play(); else audio.pause(); });
    audio.addEventListener('play',  () => { playBtn.innerHTML = SVG_PAUSE; });
    audio.addEventListener('pause', () => { playBtn.innerHTML = SVG_PLAY; });
    audio.addEventListener('ended', () => { playBtn.innerHTML = SVG_PLAY; fill.style.width = '0%'; });
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
      timeEl.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
    });
    audio.addEventListener('loadedmetadata', () => { timeEl.textContent = `0:00 / ${fmtTime(audio.duration)}`; });
    progress.addEventListener('click', e => {
      if (!audio.duration) return;
      const rect = progress.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
    closeBtn.addEventListener('click', () => { audio.pause(); audio.src = ''; bar.remove(); });

    if (slideAudio) slideAudio.after(bar);
    else slideText.appendChild(bar);
    audio.play().catch(() => { /* lecture auto bloquée : l'utilisateur clique sur play */ });
  }

  window.SlideMedia = { bindContainer, bindLinks, buildDrawer, openDrawer, closeDrawer, openAudioPlayer };

  /* ── Page de fiche : les fiches sont déjà dans le HTML ── */
  const script = document.currentScript;
  if (script && script.dataset.init === 'fiche') {
    const init = () => {
      document.querySelectorAll('.slide').forEach(slide => {
        buildDrawer(slide.querySelector('.slide-media'));
        bindLinks(slide);
      });
      const container = document.querySelector('.slides-container');
      if (container) bindContainer(container);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
