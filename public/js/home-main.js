(function () {
  var btn = document.getElementById('back-to-top');
  if (btn) {
    window.addEventListener('scroll', function () {
      btn.style.display = (window.pageYOffset || document.documentElement.scrollTop) > 500 ? 'block' : 'none';
    }, { passive: true });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initYoutube(container) {
    var playBtn = container.querySelector('.play-button');
    if (!playBtn) return;
    playBtn.addEventListener('click', function () {
      var id = container.dataset.id;
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      var img = container.querySelector('img');
      iframe.title = img ? img.alt : 'Vidéo YouTube';
      container.innerHTML = '';
      container.appendChild(iframe);
    });
  }
  document.querySelectorAll('.youtube-container').forEach(initYoutube);
})();
