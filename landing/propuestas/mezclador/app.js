/* ábaco · el mezclador: combina en vivo 5 estilos visuales × 5 navegaciones × 3 presentaciones.
   La combinación va en la dirección (?v=1&n=3&p=2) para poder compartirla. */
(function () {
  'use strict';
  var A = window.Abaco, N = window.NAVEGACIONES, P = window.PRESENTACIONES;
  var VISUALES = { 1: ['a', 'Impreso'], 2: ['b', 'Cobalto'], 3: ['c', 'Colores'], 4: ['d', 'Libro de cuentas'], 5: ['e', 'Suizo'] };
  var raiz = document.getElementById('app');
  var params = new URLSearchParams(location.search);
  var leer = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };
  var elegir = function (k, max) { var v = +(params.get(k) || leer('abaco-mezcla-' + k) || 1); return v >= 1 && v <= max ? v : 1; };
  var estado = { v: elegir('v', 5), n: elegir('n', 5), p: elegir('p', 3) };

  function aplicarVisual() {
    document.documentElement.setAttribute('data-tema', VISUALES[estado.v][0]);
    if (A.hayGsap) setTimeout(function () { ScrollTrigger.refresh(); A.recolocar(); }, 60);
  }
  function pintar() {
    A.limpiar();
    window.scrollTo(0, 0);
    raiz.innerHTML = N[estado.n].html(P[estado.p]);
    A.$$('.presentacion', raiz).forEach(function (el) { P[el.dataset.p].iniciar(el); });
    A.activar(raiz, { sinScroll: N[estado.n].sinScroll });
    N[estado.n].iniciar(raiz);
    if (A.hayGsap) ScrollTrigger.refresh();
  }
  function sincronizar() {
    ['v', 'n', 'p'].forEach(function (k) {
      A.$$('.mezclador [data-' + k + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-' + k) === estado[k])); });
      guardar('abaco-mezcla-' + k, estado[k]);
    });
    A.$('.resumen-m').innerHTML = '<b>' + estado.v + ' ' + VISUALES[estado.v][1] + '</b> · <b>' + estado.n + ' ' + N[estado.n].nombre + '</b> · <b>' + estado.p + ' ' + P[estado.p].nombre + '</b>';
    history.replaceState(null, '', '?v=' + estado.v + '&n=' + estado.n + '&p=' + estado.p);
    document.title = 'ábaco · ' + VISUALES[estado.v][1] + ' · ' + N[estado.n].nombre + ' · ' + P[estado.p].nombre;
  }
  function cambiar(k, valor) {
    if (estado[k] === valor) return;
    estado[k] = valor;
    if (k === 'v') aplicarVisual(); else pintar();
    sincronizar();
  }

  /* Panel del mezclador */
  var m = document.createElement('div');
  m.className = 'mezclador';
  m.setAttribute('role', 'region');
  m.setAttribute('aria-label', 'Mezclador de propuestas');
  var grupo = function (k, titulo, total, nombre) {
    var h = '<div class="grupo" role="group" aria-label="' + titulo + '"><span>' + titulo + '</span>';
    for (var i = 1; i <= total; i++) h += '<button type="button" data-' + k + '="' + i + '" title="' + nombre(i) + '" aria-label="' + titulo + ' ' + i + ': ' + nombre(i) + '">' + i + '</button>';
    return h + '</div>';
  };
  m.innerHTML =
    '<div class="fila-m"><span class="resumen-m" aria-live="polite"></span><div class="acciones-m">' +
    '<button type="button" class="dado" title="Combinación al azar" aria-label="Combinación al azar">🎲</button>' +
    '<button type="button" class="enlace" title="Copiar el enlace de esta combinación">Copiar enlace</button>' +
    '<button type="button" class="plegar" aria-expanded="false">Mezclar</button>' +
    '<a href="../index.html" title="Volver al índice de propuestas" style="align-self:center;padding:0 .3rem">Índice</a></div></div>' +
    '<div class="fila-m controles">' +
    grupo('v', 'Visual', 5, function (i) { return VISUALES[i][1]; }) +
    grupo('n', 'Navegación', 5, function (i) { return N[i].nombre; }) +
    grupo('p', 'Presentación', 3, function (i) { return P[i].nombre; }) + '</div>';
  document.body.appendChild(m);
  if (matchMedia('(max-width: 52rem)').matches) m.classList.add('plegado');

  m.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    ['v', 'n', 'p'].forEach(function (k) { if (b.hasAttribute('data-' + k)) cambiar(k, +b.getAttribute('data-' + k)); });
    if (b.classList.contains('dado')) {
      var nuevo = { v: 1 + Math.floor(Math.random() * 5), n: 1 + Math.floor(Math.random() * 5), p: 1 + Math.floor(Math.random() * 3) };
      var repintar = nuevo.n !== estado.n || nuevo.p !== estado.p;
      estado = nuevo; aplicarVisual(); if (repintar) pintar(); sincronizar();
      if (A.hayGsap && !A.quieto) gsap.fromTo(b, { rotate: 0 }, { rotate: 360, duration: .5, ease: 'back.out(2)' });
    }
    if (b.classList.contains('enlace')) {
      var listo = function () { b.textContent = 'Copiado ✓'; setTimeout(function () { b.textContent = 'Copiar enlace'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(listo, function () { b.textContent = 'Copia la dirección del navegador'; });
    }
    if (b.classList.contains('plegar')) { var plegado = m.classList.toggle('plegado'); b.setAttribute('aria-expanded', String(!plegado)); b.textContent = plegado ? 'Mezclar' : 'Cerrar'; }
  });

  aplicarVisual();
  pintar();
  sincronizar();
})();
