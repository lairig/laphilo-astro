/* ── Portraits philosophes flottants ─────────────────────── */
(function () {

  var PHILOSOPHERS = [
    { name:"Socrate",    dates:"~ −470 / −399", img:"/pho/socrate-mini.webp" },
    { name:"Platon",     dates:"~ −428 / −347", img:"/pho/platon-mini.webp" },
    { name:"Aristote",   dates:"~ −384 / −322", img:"/pho/aristote-mini.webp" },
    { name:"Descartes",  dates:"1596 / 1650",   img:"/pho/descarte-mini.webp" },
    { name:"Kant",       dates:"1724 / 1804",   img:"/pho/kant-mini.webp" },
    { name:"Hegel",      dates:"1770 / 1831",   img:"/pho/hegel-mini.webp" },
    { name:"Nietzsche",  dates:"1844 / 1900",   img:"/pho/nietzsche-mini.webp" },
    { name:"Voltaire",   dates:"1694 / 1778",   img:"/pho/voltaire-mini.webp" },
    { name:"Rousseau",   dates:"1712 / 1778",   img:"/pho/rousseau-mini.webp" },
    { name:"Spinoza",    dates:"1632 / 1677",   img:"/pho/spinoza-mini.webp" },
    { name:"Locke",      dates:"1632 / 1704",   img:"/pho/locke-mini.webp" },
    { name:"Hume",       dates:"1711 / 1776",   img:"/pho/hume-mini.webp" },
    { name:"Marx",       dates:"1818 / 1883",   img:"/pho/marx-mini.webp" },
    { name:"Sartre",     dates:"1905 / 1980",   img:"/pho/sartre-mini.webp" },
    { name:"Camus",      dates:"1913 / 1960",   img:"/pho/camus-mini.webp" },
    { name:"Montaigne",  dates:"1533 / 1592",   img:"/pho/montaigne-mini.webp" },
    { name:"Pascal",     dates:"1623 / 1662",   img:"/pho/pascal-mini.webp" },
    { name:"Épicure",    dates:"~ −341 / −270", img:"/pho/epicure-mini.webp" },
    { name:"Foucault",   dates:"1926 / 1984",   img:"/pho/foucault-mini.webp" },
    { name:"Al-Kindi",   dates:"801 / 873",     img:"/pho/alkindi-mini.webp" },
    { name:"Arendt",     dates:"1906 / 1975",   img:"/pho/arendt-mini.webp" },
    { name:"Eckhart",    dates:"1260 / 1328",   img:"/pho/eckhart-mini.webp" },
    { name:"Thomas d'Aquin", dates:"1225 / 1274", img:"/pho/aquin-mini.webp" },
    { name:"Averroès",   dates:"1126 / 1198",   img:"/pho/averroes-mini.webp" },
    { name:"Avicenne",   dates:"980 / 1037",    img:"/pho/avicenne-mini.webp" },
    { name:"Al-Ghazali", dates:"1058 / 1111",   img:"/pho/alghazali-mini.webp" },
    { name:"Maïmonide",  dates:"1138 / 1204",   img:"/pho/maimonide-mini.webp" },
    { name:"Abélard",    dates:"1079 / 1142",   img:"/pho/abelard-mini.webp" },
    { name:"Marc Aurèle",dates:"121 / 180",     img:"/pho/aurele-mini.webp" },
    { name:"Sénèque",    dates:"~ −4 / 65",     img:"/pho/seneque-mini.webp" },
    { name:"Héraclite",  dates:"~ −540 / −480", img:"/pho/heraclite-mini.webp" },
    { name:"Pythagore",  dates:"~ −570 / −495", img:"/pho/pythagore-mini.webp" },
    { name:"Confucius",  dates:"~ −551 / −479", img:"/pho/confucius-mini.webp" },
    { name:"Bouddha",    dates:"~ −563 / −483", img:"/pho/bouddha-mini.webp" },
    { name:"Nāgārjuna",  dates:"~ 150 / 250",   img:"/pho/nagarjuna-mini.webp" },
    { name:"Zhuangzi",   dates:"~ −370 / −286", img:"/pho/tchouang-mini.webp" },
    { name:"Bakounine",  dates:"1814 / 1876",   img:"/pho/bakounine-mini.webp" },
    { name:"Heidegger",  dates:"1889 / 1976",   img:"/pho/heidegger-mini.webp" },
    { name:"Wittgenstein",dates:"1889 / 1951",  img:"/pho/wittgenstein-mini.webp" },
    { name:"Deleuze",    dates:"1925 / 1995",   img:"/pho/deleuze-mini.webp" },
    { name:"Derrida",    dates:"1930 / 2004",   img:"/pho/derrida-mini.webp" },
    { name:"Lévinas",    dates:"1906 / 1995",   img:"/pho/levinas-mini.webp" },
    { name:"Rawls",      dates:"1921 / 2002",   img:"/pho/rawls-mini.webp" },
    { name:"Husserl",    dates:"1859 / 1938",   img:"/pho/husserl-mini.webp" },
    { name:"Bergson",    dates:"1859 / 1941",   img:"/pho/bergson-mini.webp" },
    { name:"Habermas",   dates:"1929 / …",      img:"/pho/habermas-mini.webp" },
    { name:"Beauvoir",   dates:"1908 / 1986",   img:"/pho/beauvoir-mini.webp" },
    { name:"Simone Weil",dates:"1909 / 1943",   img:"/pho/weil-mini.webp" },
    { name:"Hypatie",    dates:"~ 360 / 415",   img:"/pho/hypatie-mini.webp" },
    { name:"Judith Butler",dates:"1956 / …",    img:"/pho/butler-mini.webp" },
    { name:"Machiavel",  dates:"1469 / 1527",   img:"/pho/machiavel-mini.webp" },
    { name:"Érasme",     dates:"1466 / 1536",   img:"/pho/erasme-mini.webp" },
    { name:"Mbembe",     dates:"1957 / …",      img:"/pho/mbembe-mini.webp" },
  ];

  var CFG = {
    maxVisible    : 5,
    minDelay      : 5000,
    maxDelay      : 8000,
    showDuration  : 5000,
    driftDuration : 6000,
    sideMargin    : 28,
    w             : 120,
    h             : 145,
  };

  var active = [];
  var pool   = PHILOSOPHERS.slice();
  var idx    = 0;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  shuffle(pool);

  function next() {
    var p = pool[idx % pool.length];
    idx++;
    if (idx % pool.length === 0) shuffle(pool);
    return p;
  }

  function randomPos() {
    var W = window.innerWidth, H = window.innerHeight;
    var side = Math.random() < .5 ? 'left' : 'right';
    var x = side === 'left' ? CFG.sideMargin : W - CFG.w - CFG.sideMargin;
    var y = 130 + Math.random() * (H - 130 - CFG.h - 80);
    return { x: x, y: y };
  }

  function spawn() {
    if (active.length >= CFG.maxVisible) return;

    var philo = next();
    var pos   = randomPos();
    var drift = Math.random() < .5 ? 'drift-up' : 'drift-down';

    var el = document.createElement('div');
    el.className = 'philo-portrait';
    el.style.left      = pos.x + 'px';
    el.style.top       = pos.y + 'px';
    el.style.animation = drift + ' ' + CFG.driftDuration + 'ms ease-in-out infinite alternate';

    el.innerHTML =
      '<div class="philo-portrait-inner">' +
        '<div class="philo-portrait-halo"></div>' +
        '<img src="' + philo.img + '" alt="' + philo.name + '" loading="lazy">' +
        '<span class="philo-portrait-name">' + philo.name + '</span>' +
        '<span class="philo-portrait-dates">' + philo.dates + '</span>' +
      '</div>';

    document.body.appendChild(el);
    active.push(el);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('visible'); });
    });

    setTimeout(function () {
      el.classList.remove('visible');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        var i = active.indexOf(el);
        if (i > -1) active.splice(i, 1);
      }, 1300);
    }, CFG.showDuration);
  }

  function loop() {
    var d = CFG.minDelay + Math.random() * (CFG.maxDelay - CFG.minDelay);
    setTimeout(function () { spawn(); loop(); }, d);
  }

  window.addEventListener('load', function () {
    setTimeout(spawn, 1200);
    setTimeout(spawn, 4000);
    setTimeout(loop,  6000);
  });

}());
