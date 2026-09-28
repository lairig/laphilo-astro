/* ══════════════════════════════════════════════════════════════════════════
   media-exclusive.js — un seul média à la fois sur tout le site.
   Dès qu'un média démarre, tous les autres sont mis en pause :
     - <audio> / <video> : détectés par l'événement « play » ;
     - vidéos YouTube : détectées via l'API postMessage du lecteur
       (les iframes doivent avoir « enablejsapi=1 » dans leur URL) ;
     - autres lecteurs (Spotify…) : le script qui les ouvre appelle
       LaphiloMedia.start(iframe) et écoute « laphilo:media-start » pour
       fermer son lecteur quand un autre média démarre.
   Chargé sur toutes les pages par SeoHead.astro.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.LaphiloMedia) return;

  var YT_HOST = /(^|\.)youtube(-nocookie)?\.com$/;
  var ytId = 0;

  function isYouTube(f) {
    try { return YT_HOST.test(new URL(f.src, location.href).hostname); }
    catch (e) { return false; }
  }

  function ytCommand(f, func) {
    if (!f.contentWindow) return;
    f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
  }

  /* Met en pause tout ce qui joue, sauf `el`, puis prévient les autres scripts */
  function start(el) {
    document.querySelectorAll('audio, video').forEach(function (m) {
      if (m !== el && !m.paused) m.pause();
    });
    document.querySelectorAll('iframe').forEach(function (f) {
      if (f !== el && f.src && isYouTube(f)) ytCommand(f, 'pauseVideo');
    });
    document.dispatchEvent(new CustomEvent('laphilo:media-start', { detail: { el: el } }));
  }

  /* <audio> / <video> : « play » ne remonte pas, on l'écoute en capture */
  document.addEventListener('play', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO')) start(t);
  }, true);

  /* YouTube : à chaque chargement d'iframe, s'abonner à ses changements d'état */
  document.addEventListener('load', function (e) {
    var f = e.target;
    if (!f || f.tagName !== 'IFRAME' || !f.src || !isYouTube(f)) return;
    f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: ++ytId, channel: 'widget' }), '*');
  }, true);

  window.addEventListener('message', function (e) {
    var host;
    try { host = new URL(e.origin).hostname; } catch (err) { return; }
    if (!YT_HOST.test(host) || typeof e.data !== 'string') return;
    var data;
    try { data = JSON.parse(e.data); } catch (err) { return; }
    var playing =
      (data.event === 'onStateChange' && data.info === 1) ||
      (data.event === 'infoDelivery' && data.info && data.info.playerState === 1);
    if (!playing) return;
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) { start(frames[i]); return; }
    }
  });

  /* Tout couper (changement de fiche, départ vers une autre page…) */
  function stopAll() { start(null); }

  window.LaphiloMedia = { start: start, stopAll: stopAll };
})();
