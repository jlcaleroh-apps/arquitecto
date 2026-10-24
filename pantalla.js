/* pantalla.js · Componente común de las apps de jlcaleroh-apps
   (Trazos de Arquitecto, Números, Mi Rutina, Robot Sílabo y las que vengan).

   Qué hace
   - Mantiene la pantalla del iPad encendida mientras el niño juega (Wake Lock).
   - Modo automático: la pantalla se queda encendida mientras haya toques; tras unos minutos
     sin tocar nada se suelta para no gastar batería, y vuelve a encenderse con el siguiente toque.
   - Modo fijo: para apps con temporizador (el niño no toca la pantalla mientras hace la actividad).

   Cómo se usa (igual en todas las apps; copia este archivo SIN cambios)
     <script src="pantalla.js"></script>
     Pantalla.iniciar({ minutos: 3 });   // automático: encendida mientras haya actividad
     Pantalla.fijar(true);               // opcional: siempre encendida (por ejemplo, mientras corre un reloj)
     Pantalla.fijar(false);              // vuelve al modo automático
   Si el navegador no tiene Wake Lock, no hace nada y no da error.
*/
(function () {
  'use strict';
  let lock = null, fija = false, ultimo = 0, minutos = 3, timer = 0, pidiendo = false;
  const hay = () => 'wakeLock' in navigator;
  async function encender() {
    if (!hay() || lock || pidiendo || document.visibilityState !== 'visible') return;
    pidiendo = true;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } catch (e) { lock = null; }
    pidiendo = false;
  }
  function soltar() { try { lock && lock.release(); } catch (e) {} lock = null; }
  function revisar() {
    if (fija) { encender(); return; }
    if (Date.now() - ultimo > minutos * 60e3) soltar(); else encender();
  }
  function actividad() { ultimo = Date.now(); revisar(); }
  window.Pantalla = {
    iniciar(op) {
      minutos = (op && op.minutos) || 3;
      ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, actividad, {passive: true, capture: true}));
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisar(); });
      clearInterval(timer); timer = setInterval(revisar, 30e3);
      return this;
    },
    fijar(v) { fija = !!v; if (fija) encender(); else revisar(); },
    activa: () => !!lock,
    version: 1,
  };
})();
