/* adulto.js · Componente común de las apps de jlcaleroh-apps
   (Trazos de Arquitecto, Números, Mi Rutina, Robot Sílabo y las que vengan).

   Qué hace
   - Gesto estándar para abrir lo que es solo para adultos: MANTENER PRESIONADO 2 SEGUNDOS.
   - El botón se va llenando de color mientras se mantiene; si se suelta antes, aparece un aviso corto.
   - Con teclado (Enter o espacio) abre directo, para adultos que usan teclado.
   - Así los niños no abren el panel por accidente, y el gesto es el mismo en todas las apps.

   Cómo se usa (igual en todas las apps; copia este archivo SIN cambios)
     <script src="adulto.js"></script>            ← antes del script de la app
     Adulto.mantener(boton, () => abrirPanel(), {
       idioma: () => 'es',                        // opcional: 'es' o 'en' para el aviso
       aviso: () => 'Mantén presionado 2 segundos', // opcional: texto propio
       color: 'rgba(255,212,71,.55)',             // opcional: color del llenado
     });
   Si la app tiene PIN, va dentro de la función que abre: () => pedirPin(abrirPanel).
*/
(function () {
  'use strict';
  const MS = 2000;
  const TXT = { es: 'Mantén presionado 2 segundos', en: 'Press and hold for 2 seconds' };
  function estilos() {
    if (document.getElementById('adt-css')) return;
    const s = document.createElement('style'); s.id = 'adt-css';
    s.textContent = `.adt{position:relative;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.adt::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:var(--adt-color,rgba(255,212,71,.55));clip-path:inset(0 calc(100% - var(--adt,0) * 100%) 0 0)}
.adt-aviso{position:fixed;z-index:2147483000;background:#1d1b3a;color:#fff;font:600 15px/1.3 system-ui,-apple-system,sans-serif;padding:8px 12px;border-radius:10px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.3);opacity:0;transition:opacity .2s;max-width:240px}
.adt-aviso.ver{opacity:1}
@media (prefers-reduced-motion:reduce){.adt-aviso{transition:none}}`;
    document.head.appendChild(s);
  }
  let avisoEl = null, avisoT = 0;
  function aviso(btn, texto) {
    estilos();
    if (!avisoEl) { avisoEl = document.createElement('div'); avisoEl.className = 'adt-aviso'; avisoEl.setAttribute('role', 'status'); document.body.appendChild(avisoEl); }
    avisoEl.textContent = texto;
    const r = btn.getBoundingClientRect(), w = Math.min(240, innerWidth - 16);
    avisoEl.style.maxWidth = w + 'px';
    avisoEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    avisoEl.style.top = (r.bottom + 10 + 40 > innerHeight ? r.top - 48 : r.bottom + 10) + 'px';
    avisoEl.classList.add('ver'); clearTimeout(avisoT);
    avisoT = setTimeout(() => avisoEl.classList.remove('ver'), 1800);
  }
  function mantener(btn, abrir, op) {
    if (!btn || btn.dataset.adt) return; btn.dataset.adt = '1';
    op = op || {}; estilos();
    btn.classList.add('adt');
    if (op.color) btn.style.setProperty('--adt-color', op.color);
    const ms = op.ms || MS;
    let t0 = 0, raf = 0, hecho = false;
    const texto = () => { try { if (op.aviso) return op.aviso(); return TXT[(op.idioma && op.idioma()) === 'en' ? 'en' : 'es']; } catch (e) { return TXT.es; } };
    const parar = () => { cancelAnimationFrame(raf); t0 = 0; btn.style.setProperty('--adt', 0); };
    const tick = now => {
      const k = Math.min(1, (now - t0) / ms); btn.style.setProperty('--adt', k);
      if (k >= 1) { hecho = true; parar(); try { navigator.vibrate && navigator.vibrate(30); } catch (e) {} abrir(); }
      else raf = requestAnimationFrame(tick);
    };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); hecho = false; t0 = performance.now(); raf = requestAnimationFrame(tick); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => btn.addEventListener(ev, () => {
      if (t0 && !hecho && ev !== 'pointerleave') aviso(btn, texto());
      parar();
    }));
    btn.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);   // un toque corto nunca abre
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', texto());
  }
  window.Adulto = { mantener, ms: MS, version: 1 };
})();
