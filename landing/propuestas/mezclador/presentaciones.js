/* ábaco · tres formas de presentar la herramienta. Cada una: nombre, html() y iniciar(el).
   1 Ábaco jugable · 2 Panel del producto · 3 Modelo 303 que se rellena */
(function () {
  'use strict';
  var A = window.Abaco;

  function visible(el) {
    if (!el.offsetWidth) return false;
    if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true });
    return getComputedStyle(el).visibility !== 'hidden';
  }
  function alVerse(el, fn) {
    // Se lanza cuando la pieza es visible de verdad: en pantalla y sin estar oculta (escena, historia, respuesta).
    // Las navegaciones llaman a el.__intentar() al mostrar una vista.
    var hecho = false, enPantalla = false;
    el.__intentar = function () { if (!hecho && enPantalla && visible(el)) { hecho = true; io && io.disconnect(); fn(); } };
    if (!('IntersectionObserver' in window)) { enPantalla = true; return el.__intentar(); }
    var io = new IntersectionObserver(function (es) { enPantalla = es[0].isIntersecting; el.__intentar(); }, { threshold: .35 });
    io.observe(el);
    A.al(function () { io.disconnect(); });
  }

  var P = window.PRESENTACIONES = {};

  /* ---------- 1 · Ábaco jugable ---------- */
  P[1] = {
    nombre: 'Ábaco jugable',
    html: function () {
      return '<figure class="abaco presentacion" data-p="1" aria-label="Ábaco de ejemplo: compara los modelos 303, 130 y 349 de tu gestoría con el cálculo de ábaco. Puedes mover las cuentas.">' +
        '<div class="abaco-cab"><span class="etiqueta">Tercer trimestre · ejemplo</span><span class="pista">Mueve las cuentas</span></div>' +
        '<div class="fila"><span class="modelo">303<small>IVA</small></span><div class="varilla" data-cuentas="7" data-objetivo="4" data-valor="21"></div><span class="resultado">0,00 €</span></div>' +
        '<div class="fila"><span class="modelo">130<small>IRPF</small></span><div class="varilla" data-cuentas="6" data-objetivo="2" data-valor="15"></div><span class="resultado">0,00 €</span></div>' +
        '<div class="fila"><span class="modelo">349<small>UE</small></span><div class="varilla" data-cuentas="5" data-objetivo="3" data-valor="9"></div><span class="resultado">0,00 €</span></div>' +
        '<div class="abaco-pie"><span>29 facturas revisadas, una a una</span><span>Diferencia total <strong class="num" data-total>0,00 €</strong></span></div></figure>';
    },
    iniciar: function (el) { A.iniciarAbaco(el); },
  };

  /* ---------- 2 · Panel del producto ---------- */
  P[2] = {
    nombre: 'Panel del producto',
    html: function () {
      return '<figure class="ventana presentacion p-panel" data-p="2" aria-label="Panel de ábaco con datos de ejemplo">' +
        '<div class="ventana-barra" aria-hidden="true"><i></i><i></i><i></i><span>panel.html · datos de ejemplo</span></div>' +
        '<div class="pv"><div style="display:grid;gap:.3rem"><span class="etiqueta">Autónomo · ejercicio 2026</span><strong class="pv-titulo">Panel fiscal de Lucía</strong><p style="color:var(--tinta-suave);font-size:.88rem">1 cosa vence esta semana · todos los trimestres comprobados</p></div>' +
        '<div class="pv-rejilla">' +
        '<div class="pv-bloque"><span class="pv-sub">Avisos</span><div class="pv-aviso alto"><b>Límite del seguro de salud</b><span>Quedan 40 € deducibles este año.</span></div><div class="pv-aviso"><b>Cargo del 303</b><span>212,40 € el 20 oct</span></div></div>' +
        '<div class="pv-bloque"><span class="pv-sub">Renta 2026</span><strong class="pv-grande" data-contar="640" data-prefijo="A pagar ≈ ">A pagar ≈ 640 €</strong><div class="barra" style="--lleno:98%" aria-hidden="true"><span></span></div><span class="pv-nota">A 450 € del límite del alquiler</span></div>' +
        '<div class="pv-bloque ancho"><span class="pv-sub">Declaraciones 2026</span><div class="pv-tabla">' +
        '<span class="pv-th">Trimestre</span><span class="pv-th n">IVA</span><span class="pv-th n">IRPF</span><span class="pv-th">Segundo check</span>' +
        '<span>T1</span><span class="num n">−35,10 €</span><span class="num n">96,00 €</span><span><span class="chip ok">Coincide</span></span>' +
        '<span>T2</span><span class="num n">640,25 €</span><span class="num n">210,50 €</span><span><span class="chip alerta">Explicadas</span></span>' +
        '<span>T3</span><span class="num n" data-contar="212" data-prefijo="">212,40 €</span><span class="num n">0,00 €</span><span><span class="chip ok">Coincide</span></span>' +
        '</div></div></div></div></figure>';
    },
    iniciar: function (el) {
      alVerse(el, function () {
        if (!A.hayGsap || A.quieto) return;
        A.$$('[data-contar]', el).forEach(function (n) {
          var fin = +n.dataset.contar, pre = n.dataset.prefijo || '', o = { v: 0 }, final = n.textContent;
          gsap.to(o, { v: fin, duration: 1.4, ease: 'power2.out', onUpdate: function () { n.textContent = pre + A.eur0.format(Math.round(o.v)); }, onComplete: function () { n.textContent = final; } });
        });
        A.$$('.barra span', el).forEach(function (b) { gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: 'power2.out' }); });
        gsap.from(el.querySelectorAll('.pv-bloque'), { y: 16, autoAlpha: 0, duration: .55, ease: 'power3.out', stagger: .1 });
      });
    },
  };

  /* ---------- 3 · Modelo 303 que se rellena ---------- */
  var FACTURAS = [
    { id: 'i1', t: 'F-0032 · Cliente SL', d: 'Ingreso · 1.200,00 € + IVA' },
    { id: 'i2', t: 'F-0033 · Estudio Norte', d: 'Ingreso · 800,00 € + IVA' },
    { id: 'g1', t: 'Software · Irlanda', d: 'Gasto UE · 83,00 €' },
    { id: 'g2', t: 'Luz, internet y equipo', d: 'Gastos · 988,57 € + IVA' },
  ];
  var CASILLAS = [
    { n: '07', t: 'Base imponible al 21 %', v: 2000, f: 'i1 i2' },
    { n: '09', t: 'Cuota devengada', v: 420, f: 'i1 i2' },
    { n: '10', t: 'Adquisiciones intracomunitarias', v: 83, f: 'g1' },
    { n: '29', t: 'IVA soportado deducible', v: 207.6, f: 'g2' },
    { n: '45', t: 'Total a deducir', v: 225.03, f: 'g1 g2' },
    { n: '71', t: 'Resultado a ingresar', v: 212.4, f: 'i1 i2 g1 g2', total: true },
  ];
  P[3] = {
    nombre: 'Modelo 303 que se rellena',
    html: function () {
      return '<figure class="formulario presentacion" data-p="3" aria-label="Ejemplo: las facturas del trimestre rellenan las casillas del modelo 303 y el resultado coincide con el de tu gestoría">' +
        '<div class="f-int"><div class="facturas"><span class="etiqueta">Tus facturas · T3</span>' + FACTURAS.map(function (f) { return '<div class="factura" data-id="' + f.id + '"><i aria-hidden="true"></i><b>' + f.t + '</b><span>' + f.d + '</span></div>'; }).join('') +
        '<button class="repetir" type="button">↻ Volver a calcular</button></div>' +
        '<div class="modelo-303"><div class="cab-303"><span>MODELO 303 · IVA</span><span>3T 2026</span></div>' +
        CASILLAS.map(function (c) { return '<div class="casilla-303' + (c.total ? ' total' : '') + '" data-fuentes="' + c.f + '" data-v="' + c.v + '" title="Sale de: ' + c.f.split(' ').map(function (id) { return FACTURAS.filter(function (x) { return x.id === id; })[0].t; }).join(', ') + '"><span class="n303">' + c.n + '</span><span>' + c.t + '</span><span class="valor">' + A.eur.format(c.v) + '</span></div>'; }).join('') +
        '</div></div><div class="sello" aria-hidden="true">Cuadra con tu gestoría ✓</div></figure>';
    },
    iniciar: function (el) {
      var casillas = A.$$('.casilla-303', el), facturas = A.$$('.factura', el), sello = A.$('.sello', el);
      function resaltar(ids) { facturas.forEach(function (f) { f.classList.toggle('activa', ids.indexOf(f.dataset.id) >= 0); }); }
      casillas.forEach(function (c) {
        A.escuchar(c, 'mouseenter', function () { c.classList.add('foco'); resaltar(c.dataset.fuentes.split(' ')); });
        A.escuchar(c, 'mouseleave', function () { c.classList.remove('foco'); resaltar([]); });
      });
      function vaciar() { casillas.forEach(function (c) { c.classList.remove('llena'); A.$('.valor', c).textContent = '—'; }); sello.classList.remove('visible'); }
      function rellenar() {
        if (!A.hayGsap || A.quieto) { casillas.forEach(function (c) { c.classList.add('llena'); A.$('.valor', c).textContent = A.eur.format(+c.dataset.v); }); sello.classList.add('visible'); return; }
        vaciar();
        var t = gsap.timeline();
        casillas.forEach(function (c) {
          var o = { v: 0 }, valor = A.$('.valor', c), fin = +c.dataset.v;
          t.add(function () { resaltar(c.dataset.fuentes.split(' ')); c.classList.add('foco'); });
          t.to(o, { v: fin, duration: .55, ease: 'power2.out', onUpdate: function () { valor.textContent = A.eur.format(o.v); } });
          t.add(function () { valor.textContent = A.eur.format(fin); c.classList.add('llena'); c.classList.remove('foco'); });
          t.to({}, { duration: .12 });
        });
        t.add(function () { resaltar([]); sello.classList.add('visible'); });
        t.fromTo(sello, { scale: 1.8, rotate: -20, autoAlpha: 0 }, { scale: 1, rotate: -9, autoAlpha: 1, duration: .45, ease: 'back.out(2.5)' });
        t.add(function () { A.celebrar(sello); });
      }
      vaciar();
      A.escuchar(A.$('.repetir', el), 'click', rellenar);
      alVerse(el, rellenar);
    },
  };
})();
