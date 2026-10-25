/* apps.js · Otras apps de jlcaleroh-apps (componente común: mismo archivo en todas las apps).
   Muestra las demás apps de la colección para que los padres que llegan a una conozcan las otras.
   Uso:  Apps.montar(elemento, { actual: 'silabas', idioma: 'es' })   // idioma: 'es' | 'en' (o una función que lo devuelva)
   Al crear una app nueva, se agrega a LISTA aquí y se copia este archivo igual en todos los repos. */
(function () {
  'use strict';
  var BASE = 'https://jlcaleroh-apps.github.io/';
  var LISTA = [
    { id: 'silabas', icono: 'icons/icon-192.png',
      es: { n: 'Robot Sílabo', d: 'Leer sílabas en español con un robot astronauta. 5 y 6 años.' },
      en: { n: 'Robot Sílabo', d: 'Read Spanish syllables with a robot astronaut. Ages 5–6.' } },
    { id: 'arquitecto', icono: 'icons/icon-192.png',
      es: { n: 'Trazos de Arquitecto', d: 'Trazar las letras mayúsculas y construir una ciudad.' },
      en: { n: 'Trazos de Arquitecto', d: 'Trace capital letters and build a city.' } },
    { id: 'numeros', icono: 'icon-192.png',
      es: { n: 'Números · Misión Aprendizaje', d: 'Números y lógica matemática básica en la selva.' },
      en: { n: 'Numbers · Learning Mission', d: 'Numbers and early math logic in the jungle.' } },
    { id: 'rutina', icono: 'icons/icon-192.png',
      es: { n: 'Mi Rutina', d: 'Temporizador visual y rutina con checklist para la casa.' },
      en: { n: 'My Routine', d: 'Visual timer and routine checklist for home.' } }
  ];
  var TXT = {
    es: { intro: 'Todas son gratis, sin anuncios y pensadas para niños con TDAH.', abrir: 'Abrir' },
    en: { intro: 'All free, no ads, designed for kids with ADHD.', abrir: 'Open' }
  };
  var CSS = '.apps-caja{display:flex;flex-direction:column;gap:8px;margin:6px 0 4px;font-size:14px;line-height:1.3;text-align:left}' +
    '.apps-caja .apps-intro{margin:0 0 2px;opacity:.8}' +
    '.apps-caja a.apps-item{display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:14px;background:rgba(127,127,127,.12);color:inherit;text-decoration:none}' +
    '.apps-caja a.apps-item:active{transform:scale(.98)}' +
    '.apps-caja .apps-ico{width:44px;height:44px;border-radius:11px;flex:none;object-fit:cover;background:rgba(127,127,127,.2)}' +
    '.apps-caja .apps-txt{flex:1;min-width:0}.apps-caja .apps-txt b{display:block;font-size:15px}' +
    '.apps-caja .apps-ir{flex:none;font-weight:700;font-size:13px;padding:6px 12px;border-radius:999px;background:rgba(127,127,127,.2)}';

  function estilo() {
    if (document.getElementById('apps-css')) return;
    var s = document.createElement('style'); s.id = 'apps-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  window.Apps = {
    lista: LISTA,
    montar: function (el, op) {
      if (!el) return;
      op = op || {};
      var lang = typeof op.idioma === 'function' ? op.idioma() : op.idioma;
      lang = lang === 'en' ? 'en' : 'es';
      estilo();
      var otras = LISTA.filter(function (a) { return a.id !== op.actual; });
      el.classList.add('apps-caja');
      el.innerHTML = '<p class="apps-intro">' + TXT[lang].intro + '</p>' + otras.map(function (a) {
        var t = a[lang], url = BASE + a.id + '/';
        return '<a class="apps-item" href="' + url + '" target="_blank" rel="noopener">' +
          '<img class="apps-ico" src="' + url + a.icono + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
          '<span class="apps-txt"><b>' + esc(t.n) + '</b>' + esc(t.d) + '</span>' +
          '<span class="apps-ir">' + TXT[lang].abrir + '</span></a>';
      }).join('');
    }
  };
})();
