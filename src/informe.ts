import type { Comparacion, FilaCasilla } from './comparar.js';

const eur = (n?: number) => (n === undefined ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function tabla(filas: FilaCasilla[]) {
  const l = ['| Casilla | Gestoría | ábaco | Diferencia |', '|---|--:|--:|--:|'];
  for (const f of filas) {
    const marca = f.dif === 0 ? '' : f.informativa ? ' (informativa)' : f.redondeo ? ' (redondeo)' : ' **⚠**';
    l.push(`| ${f.casilla} | ${eur(f.gestor)} | ${eur(f.propio)} | ${f.dif === 0 ? '0' : eur(f.dif)}${marca} |`);
  }
  return l.join('\n');
}

const veredicto = (filas: FilaCasilla[]) => (filas.some((f) => !f.informativa && !f.redondeo) ? '⚠ Hay diferencias' : '✔ Coincide');

export function informeMarkdown(c: Comparacion): string {
  const out: string[] = [];
  const T = `T${c.trimestre} ${c.ejercicio}`;
  out.push(`# Comprobación ${T}`, '', `Generado el ${new Date().toLocaleDateString('es-ES')} por ábaco. Compara lo presentado por la gestoría con un cálculo propio hecho desde las facturas.`, '');

  out.push('## Resumen', '');
  if (c.m303) out.push(`- **303:** ${veredicto(c.m303.filas)} (justificante ${c.m303.decl.justificante ?? 'no presentado'})`);
  if (c.m130) out.push(`- **130:** ${veredicto(c.m130.filas)} (justificante ${c.m130.decl.justificante ?? 'no presentado'})`);
  if (c.m349) out.push(`- **349:** ${c.m349.diferencias.length ? '⚠ Hay diferencias' : '✔ Coincide'} (justificante ${c.m349.decl.justificante ?? 'no presentado'})`);
  if (c.libro) {
    const n = c.libro.soloGestor.length + c.libro.soloPropio.length + c.libro.diferencias.filter((d) => !d.campo.includes('informativa')).length;
    out.push(`- **Libro de ingresos y gastos:** ${n ? `⚠ ${n} diferencia(s)` : '✔ Coincide factura a factura'}`);
  }
  for (const a of c.avisos) out.push(`- ${a}`);

  if (c.m303) out.push('', '## Modelo 303', '', tabla(c.m303.filas), '', 'La base de la casilla 28 es informativa: la gestoría consigna la base completa de los suministros y aquí solo la parte deducible. Lo que cuenta es la cuota (29).');
  if (c.m130) out.push('', '## Modelo 130 (acumulado del año)', '', tabla(c.m130.filas), '', `Trimestres anteriores tomados de: ${c.m130.origenAcumulado}.`);
  if (c.m349) {
    out.push('', '## Modelo 349', '', '| Operador | Clave | Base propia |', '|---|---|--:|');
    for (const p of c.m349.propios) out.push(`| ${p.pais}${p.nif} ${p.nombre} | ${p.clave} | ${eur(p.base)} |`);
    if (c.m349.diferencias.length) out.push('', ...c.m349.diferencias.map((d) => `- ⚠ ${d}`));
  }
  if (c.libro) {
    out.push('', '## Libro factura a factura', '');
    if (c.libro.soloGestor.length) {
      out.push('**En el libro de la gestoría pero no en tus facturas:**', '');
      for (const l of c.libro.soloGestor) out.push(`- ${l.fecha} · ${l.contraparte} · ${l.numero || 's/n'} · ${eur(l.total)} €`);
      out.push('');
    }
    if (c.libro.soloPropio.length) {
      out.push('**En tus facturas pero no en el libro de la gestoría:**', '');
      for (const a of c.libro.soloPropio) out.push(`- ${a.fecha} · ${a.contraparte} · ${a.numero} · ${eur(a.total)} €${a.archivo ? ` (${a.archivo})` : ''}`);
      out.push('');
    }
    if (c.libro.diferencias.length) {
      out.push('| Factura | Proveedor/cliente | Campo | Gestoría | ábaco |', '|---|---|---|--:|--:|');
      for (const d of c.libro.diferencias) out.push(`| ${d.numero} | ${d.contraparte} | ${d.campo} | ${d.gestor} | ${d.propio} |`);
    }
    if (!c.libro.soloGestor.length && !c.libro.soloPropio.length && !c.libro.diferencias.length) out.push('Todas las facturas coinciden.');
  }
  return out.join('\n') + '\n';
}
