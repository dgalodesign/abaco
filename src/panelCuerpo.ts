/**
 * Contenido del panel escrito directamente en el HTML: se ve igual en un navegador, en una vista
 * previa sin JavaScript o impreso. El único script actualiza las cuentas atrás al día en que se abre.
 */
import type { MetaPanel } from './panelHtml.js';

interface Trimestre { trimestre: string; iva_303: number | null; irpf_130: number | null; operaciones_349: number | null; comprobacion: string; resumen: string }
interface Cifra { trimestre: string; ingresos: number; gastos: number; ingresos_acum: number; rendimiento_acum: number; retenciones_acum: number }
interface Plazo { fecha: string; que: string; periodo: string; quien: string; tipo: string; estado: string }
interface Aviso { nivel: string; titulo: string; detalle: string; fecha: string }
interface Renta { baseGeneral: number; baseAhorro: number; cuotaLiquida: number; deduccionAlquiler: number; pagosACuenta: number; resultado: number; tipoMarginal: number; margenLimiteAlquiler: number; rendimientoTrabajo: number; rendimientoActividad: number; reduccionTrabajo?: number; deduccionTrabajo?: number }
interface Recomendacion { titulo: string; detalle: string; impacto: number | null; tipo: string; fuente?: string }
interface Ayuda { nombre: string; organismo: string; importe: string; estado: string; plazo: string; encaje: string; motivo: string; comoPedirlo: string; fuente: string; revisado: string }
interface Prevision { concepto: string; importe: number; signo: 'pagar' | 'cobrar' | 'margen'; cuando: string; nota: string }

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fecha = (f: string) => fmtFecha.format(new Date(f));
const dias = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5);
const cuando = (n: number) => (n < 0 ? `hace ${-n} días` : n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);
/** Cuenta atrás que el script recalcula al abrir la página. */
const cuenta = (f: string, hoy: string) => `<span class="cuenta" data-fecha="${f}">${cuando(dias(hoy, f))}</span>`;

function grafico(cifras: Cifra[]): string {
  const W = 640, H = 220, m = { t: 12, r: 8, b: 26, l: 64 };
  const max = Math.max(1, ...cifras.flatMap((c) => [c.ingresos, c.gastos]));
  const paso = 10 ** Math.floor(Math.log10(max));
  const tope = Math.ceil(max / paso) * paso;
  const y = (v: number) => m.t + (H - m.t - m.b) * (1 - v / tope);
  const partes: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const v = (tope * i) / 4;
    partes.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`);
    partes.push(`<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(eur0.format(v))}</text>`);
  }
  const grupo = (W - m.l - m.r) / Math.max(1, cifras.length);
  const bw = Math.min(32, grupo / 4);
  cifras.forEach((c, k) => {
    const cx = m.l + grupo * k + grupo / 2;
    for (const [v, color, dx] of [[c.ingresos, 'var(--bar-a)', -bw - 2], [c.gastos, 'var(--bar-b)', 2]] as const) {
      partes.push(`<rect x="${cx + dx}" width="${bw}" y="${y(v)}" height="${Math.max(0, y(0) - y(v))}" rx="3" fill="${color}"><title>${esc(eur.format(v))}</title></rect>`);
    }
    partes.push(`<text x="${cx}" y="${H - 6}" text-anchor="middle">${c.trimestre}</text>`);
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos deducibles por trimestre">${partes.join('')}</svg>`;
}

export function cuerpo(d: Record<string, unknown[]>, meta: MetaPanel): string {
  const hoy = meta.generado;
  const actividad = meta.actividad !== false;
  const avisos = d.avisos as Aviso[];
  const plazos = (d.plazos as Plazo[]).filter((p) => dias(hoy, p.fecha) >= 0);
  const trimestres = d.trimestres as Trimestre[];
  const cifras = d.cifras as Cifra[];
  const previsiones = d.previsiones as Prevision[];

  // Resumen de una línea
  const semana = plazos.filter((p) => p.estado === 'pendiente' && dias(hoy, p.fecha) <= 7).length;
  const sig = plazos.find((p) => p.estado === 'pendiente' && ['trimestral', 'anual', 'renta'].includes(p.tipo));
  const revisar = trimestres.filter((t) => t.comprobacion === 'diferencias').length;
  const altos = avisos.filter((a) => a.nivel === 'alto').length;
  const ingresosAño = cifras.reduce((s, c) => s + c.ingresos, 0);
  const resumen = [
    semana ? `${semana} ${semana === 1 ? 'cosa vence' : 'cosas vencen'} esta semana.` : 'Nada vence esta semana.',
    sig ? `Próxima declaración: ${sig.periodo}, el ${fecha(sig.fecha)}.` : '',
    !actividad ? '' : revisar ? `${revisar} trimestre(s) con diferencias por revisar.` : 'Todos los trimestres comprobados.',
    altos ? `${altos} ${altos === 1 ? 'aviso importante' : 'avisos importantes'}.` : '',
    actividad ? `Ingresos del año: ${eur0.format(ingresosAño)}.` : '',
  ].filter(Boolean).join(' ');

  const htmlAvisos = avisos.map((a) => `<li class="aviso" data-nivel="${esc(a.nivel)}"><div><span class="titulo">${esc(a.titulo)}</span><span class="det">${esc(a.detalle)} · ${fecha(a.fecha)} (${cuenta(a.fecha, hoy)})</span></div></li>`).join('\n');

  const htmlPlazos = plazos.map((p) => {
    const n = dias(hoy, p.fecha);
    const pill = p.estado === 'presentado' ? '<span class="pill ok">Presentado</span>' : n <= 7 ? '<span class="pill bad">Esta semana</span>' : n <= 30 ? '<span class="pill warn">Este mes</span>' : `<span class="pill gris">${esc(p.quien)}</span>`;
    const extra = (p.periodo ? ` <span class="quien">· ${esc(p.periodo)}</span>` : '') + (p.estado !== 'presentado' && n <= 30 ? ` <span class="quien">· ${esc(p.quien)}</span>` : '');
    return `<li class="plazo" data-estado="${esc(p.estado)}"><span class="fecha num">${fecha(p.fecha)}</span><div class="que">${esc(p.que)}${extra}</div>${pill}<span class="cuando">${cuenta(p.fecha, hoy)}</span></li>`;
  }).join('\n');

  const estados: Record<string, [string, string]> = { coincide: ['ok', 'Coincide'], explicadas: ['warn', 'Diferencias explicadas'], diferencias: ['bad', 'Diferencias por revisar'] };
  const celda = (v: number | null, sufijo = '') => `<td class="n">${v == null ? '—' : esc(eur.format(v) + sufijo)}</td>`;
  const htmlTrim = trimestres.map((t) => {
    const [cls, txt] = estados[t.comprobacion] ?? estados.diferencias;
    return `<tr><td>${t.trimestre}</td>${celda(t.iva_303, (t.iva_303 ?? 0) < 0 ? ' a compensar' : '')}${celda(t.irpf_130)}${celda(t.operaciones_349)}<td><span class="pill ${cls}">${txt}</span><span class="nota">${esc(t.resumen)}</span></td></tr>`;
  }).join('\n');

  const ult = cifras[cifras.length - 1];
  const ivaPagado = trimestres.reduce((s, t) => s + Math.max(0, t.iva_303 ?? 0), 0);
  const irpfPagado = trimestres.reduce((s, t) => s + (t.irpf_130 ?? 0), 0);
  const tiles = ult
    ? [
        ['Ingresos', ult.ingresos_acum, `Hasta el ${ult.trimestre}`],
        ['Rendimiento neto', ult.rendimiento_acum, 'Ingresos menos gastos deducibles'],
        ['Retenido por clientes', ult.retenciones_acum, '15 % de las facturas a empresas españolas'],
        ['Ingresado a Hacienda', ivaPagado + irpfPagado, `IVA ${eur0.format(ivaPagado)} · IRPF ${eur0.format(irpfPagado)}`],
      ].map(([k, v, s]) => `<div class="tarjeta cifra"><span class="etiqueta">${k}</span><span class="valor">${eur0.format(v as number)}</span><span class="sub">${esc(s)}</span></div>`).join('\n')
    : '';

  const seccionesActividad = `<section id="declaraciones" aria-labelledby="t-decl">
    <h2 id="t-decl">Declaraciones de ${meta.ejercicio}</h2>
    <div class="tarjeta desliza">
      <table>
        <thead><tr><th>Trimestre</th><th class="n">IVA (303)</th><th class="n">IRPF (130)</th><th class="n">UE (349)</th><th>Segundo check</th></tr></thead>
        <tbody>${htmlTrim}</tbody>
      </table>
    </div>
  </section>

  <section id="cifras" aria-labelledby="t-cifras">
    <h2 id="t-cifras">El año en cifras</h2>
    <div class="cifras">${tiles}</div>
    <div class="tarjeta grafico">
      <span class="etiqueta">Ingresos y gastos deducibles por trimestre</span>
      ${grafico(cifras)}
      <div class="leyenda"><span><i style="background:var(--bar-a)"></i>Ingresos</span><span><i style="background:var(--bar-b)"></i>Gastos deducibles</span></div>
    </div>
  </section>`;

  const signo = { pagar: 'A pagar', cobrar: 'A cobrar', margen: 'Margen' };
  const htmlPrev = previsiones.map((p) => `<div class="tarjeta"><span class="etiqueta">${signo[p.signo]} · ${esc(p.cuando)}</span><strong>${esc(p.concepto)}</strong><span class="importe ${p.signo}">≈ ${eur0.format(p.importe)}</span><span class="nota">${esc(p.nota)}</span></div>`).join('\n');

  // Renta y ahorro
  const renta = (d.renta as Renta[] | undefined)?.[0];
  const supuestos = (d.supuestos as { texto: string }[] | undefined) ?? [];
  const recs = (d.recomendaciones as Recomendacion[] | undefined) ?? [];
  const ayudas = (d.ayudas as Ayuda[] | undefined) ?? [];
  const LIMITE = 25_000;
  const baseImp = renta ? renta.baseGeneral + renta.baseAhorro : 0;
  const htmlRenta = renta
    ? `<div class="tarjeta renta">
      <div class="renta-cab">
        <span class="etiqueta">Renta ${meta.ejercicio} estimada</span>
        <span class="valor ${renta.resultado > 0 ? 'pagar' : 'cobrar'}">${renta.resultado > 0 ? 'A pagar' : 'A devolver'} ≈ ${eur0.format(Math.abs(renta.resultado))}</span>
        <span class="sub">Impuesto ${eur0.format(renta.cuotaLiquida)} (ya restados ${eur0.format(renta.deduccionAlquiler)} de deducción del alquiler${renta.deduccionTrabajo ? ` y ${eur0.format(renta.deduccionTrabajo)} de deducción por rendimientos del trabajo` : ''}) menos ${eur0.format(renta.pagosACuenta)} pagados en retenciones${actividad ? ' y 130' : ''} · tipo marginal ${renta.tipoMarginal} %</span>
      </div>
      <div class="limite">
        <div class="limite-txt"><span>Base imponible ≈ ${eur0.format(baseImp)}</span><span>Límite del alquiler ${eur0.format(LIMITE)}</span></div>
        <div class="barra" role="img" aria-label="Base imponible frente al límite de 25.000 €"><span class="${renta.margenLimiteAlquiler < 2000 ? 'justo' : ''}" style="width:${Math.min(100, (baseImp / LIMITE) * 100).toFixed(1)}%"></span></div>
        <span class="sub">${renta.margenLimiteAlquiler >= 0 ? `Margen: ${eur0.format(renta.margenLimiteAlquiler)}` : `Por encima: ${eur0.format(-renta.margenLimiteAlquiler)}`} · trabajo ${eur0.format(renta.rendimientoTrabajo)}${renta.reduccionTrabajo ? ` (tras ${eur0.format(renta.reduccionTrabajo)} de reducción del art. 20)` : ''}${actividad ? ` + actividad ${eur0.format(renta.rendimientoActividad)}` : ''}</span>
      </div>
      ${supuestos.length ? `<details><summary>Supuestos de la estimación</summary><ul>${supuestos.map((x) => `<li>${esc(x.texto)}</li>`).join('')}</ul></details>` : ''}
    </div>`
    : '';
  const tipoRec: Record<string, [string, string]> = { ahorro: ['ok', 'Ahorro'], aviso: ['warn', 'Atención'], 'antes-de-decidir': ['gris', 'Antes de decidir'] };
  const htmlRecs = recs
    .map((r) => {
      const [cls, txt] = tipoRec[r.tipo] ?? tipoRec.aviso;
      const enlace = r.fuente ? ` <a href="${esc(r.fuente)}" target="_blank" rel="noopener">Fuente oficial</a>` : '';
      return `<li class="tarjeta rec"><div class="rec-cab"><span class="pill ${cls}">${txt}</span><strong>${esc(r.titulo)}</strong></div><p>${esc(r.detalle)}${enlace}</p></li>`;
    })
    .join('\n');
  const encajes: Record<string, [string, string]> = { cumples: ['ok', 'Cumples'], posible: ['warn', 'Posible'], no: ['gris', 'No encaja'] };
  const estadosAyuda: Record<string, string> = { abierta: 'Abierta', cerrada: 'Cerrada', permanente: 'Cada año', proxima: 'Próximamente' };
  const orden = ['cumples', 'posible', 'no'];
  const htmlAyudas = [...ayudas]
    .sort((a, b) => orden.indexOf(a.encaje) - orden.indexOf(b.encaje))
    .map((a) => {
      const [cls, txt] = encajes[a.encaje] ?? encajes.no;
      return `<tr><td><strong>${esc(a.nombre)}</strong><span class="nota">${esc(a.organismo)} · ${esc(a.importe)}</span></td><td><span class="pill ${cls}">${txt}</span><span class="nota">${esc(a.motivo)}</span></td><td><span class="pill gris">${estadosAyuda[a.estado] ?? esc(a.estado)}</span><span class="nota">${esc(a.plazo)} <a href="${esc(a.fuente)}" target="_blank" rel="noopener">Fuente</a> · revisado ${fecha(a.revisado)}</span></td></tr>`;
    })
    .join('\n');
  const seccionAhorro = renta || recs.length
    ? `<section id="ahorro" aria-labelledby="t-ahorro">
    <h2 id="t-ahorro">Renta y ahorro</h2>
    ${htmlRenta}
    <ul class="recs">${htmlRecs}</ul>
  </section>`
    : '';
  const seccionAyudas = ayudas.length
    ? `<section id="ayudas" aria-labelledby="t-ayudas">
    <h2 id="t-ayudas">Ayudas y deducciones</h2>
    <div class="tarjeta desliza"><table>
      <thead><tr><th>Qué</th><th>¿Te corresponde?</th><th>Plazo</th></tr></thead>
      <tbody>${htmlAyudas}</tbody>
    </table></div>
  </section>`
    : '';

  return `<body>
<main class="pagina">
  <header class="cab">
    <span class="etiqueta">${actividad ? 'Autónomo' : 'Asalariado'} · ejercicio ${meta.ejercicio}</span>
    <h1>${esc(meta.titulo)}</h1>
    <p class="resumen">${esc(resumen)}</p>
  </header>

  <section id="avisos" aria-labelledby="t-avisos">
    <h2 id="t-avisos">Avisos</h2>
    <ul class="avisos">${htmlAvisos}</ul>
  </section>

  <section id="plazos" aria-labelledby="t-plazos">
    <h2 id="t-plazos">Próximos plazos</h2>
    <ul class="plazos tarjeta">${htmlPlazos}</ul>
  </section>

  ${actividad ? seccionesActividad : ''}

  ${seccionAhorro}

  ${seccionAyudas}

  <section id="previsiones" aria-labelledby="t-prev">
    <h2 id="t-prev">Lo que viene</h2>
    <div class="prev">${htmlPrev}</div>
  </section>

  <footer>Generado el ${fecha(hoy)} por autogestor a partir de ${actividad ? 'tus facturas, los modelos presentados por la gestoría y ESTADO.md' : 'tus nóminas y tu perfil'}. Las fechas de plazo son las generales: confírmalas con el calendario del contribuyente de la AEAT. Estimaciones, no asesoramiento vinculante.</footer>
</main>
<script>
// Recalcula las cuentas atrás al día en que se abre el panel
(function () {
  var d = new Date(), hoy = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  document.querySelectorAll('.cuenta').forEach(function (el) {
    var n = Math.round((Date.parse(el.dataset.fecha) - hoy) / 864e5);
    el.textContent = n < 0 ? 'hace ' + (-n) + ' días' : n === 0 ? 'hoy' : n === 1 ? 'mañana' : 'en ' + n + ' días';
  });
})();
</script>
</body>
</html>
`;
}
