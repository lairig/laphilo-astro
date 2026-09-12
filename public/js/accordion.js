(function () {
  document.querySelectorAll('.acc-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.acc-item');
      var list = btn.closest('.acc-list') || document;
      var wasOpen = item.classList.contains('expanded');

      list.querySelectorAll('.acc-item').forEach(function (i) {
        i.classList.remove('expanded');
        var t = i.querySelector('.acc-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      });

      if (!wasOpen) {
        item.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
