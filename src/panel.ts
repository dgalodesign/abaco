import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Perfil, Registro, tieneActividad } from './tipos.js';
import { amortizaciones, cuotasReta, r2 } from './calc/deducible.js';
import { calcular130, calcular303, totales130, type Acumulado130 } from './calc/modelos.js';
import { comparar, rutasTrimestre } from './comparar.js';
import { leerDeclaracion } from './parsers/aeat.js';
import { plazosDelAño } from './rules/calendario.js';
import { panelHtml } from './panelHtml.js';
import { analizar } from './asesor.js';

const Seguimiento = z.object({
  pendientes: z.array(z.object({ fecha: z.string(), titulo: z.string(), detalle: z.string(), quien: z.string(), nivel: z.enum(['alto', 'medio', 'info']) })),
  previsiones: z.array(z.object({ concepto: z.string(), importe: z.number(), signo: z.enum(['pagar', 'cobrar', 'margen']), cuando: z.string(), nota: z.string() })),
  revisiones: z.record(z.string(), z.object({ estado: z.enum(['coincide', 'explicadas', 'diferencias']), resumen: z.string() })),
});

const DIA = 86_400_000;

const dias = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA);

/**
 * Genera los datos del panel (un JSON por dataset) en <base>/_autogestor/panel/.
 * Las cifras salen de los registros propios y de los modelos presentados; los pendientes y previsiones, de seguimiento.json.
 */
export async function generarPanel(base: string, ejercicio: number, hoy: string) {
  const dir = path.join(base, '_autogestor');
  const perfil = Perfil.parse(JSON.parse(fs.readFileSync(path.join(dir, 'perfil.json'), 'utf8')));
  const seg = Seguimiento.parse(JSON.parse(fs.readFileSync(path.join(dir, 'seguimiento.json'), 'utf8')));
  const out = path.join(dir, 'panel');
  // Sin actividad económica (solo asalariado) no hay trimestres ni plazos de autónomo: solo la Renta
  const actividad = tieneActividad(perfil);
  // Quién se encarga de cada tipo de plazo
  const nombre = perfil.nombre?.trim().split(' ')[0];
  const titular = nombre || 'Tú';
  // Sin gestoría en el perfil: un autónomo la tiene para los trimestres; un asalariado hace su Renta
  const gestoria = perfil.gestoria ?? (actividad ? { nombre: 'Gestoría', incluyeRenta: true } : undefined);
  const gestor = gestoria?.nombre ?? titular;
  const renta = !gestoria ? titular : gestoria.incluyeRenta ? gestor : `${titular} (no entra en el servicio de la gestoría)`;
  const RESPONSABLE: Record<string, string> = { trimestral: gestor, anual: gestor, renta, reta: titular };
  fs.mkdirSync(out, { recursive: true });

  // Trimestres: lo presentado y la comprobación
  const trimestres = [];
  const cifras = [];
  const acc: Acumulado130 = { ingresos: 0, gastos: 0, retenciones: 0, pagosPrevios: 0, negativosPrevios: 0 };
  for (let t = 1; t <= 4 && actividad; t++) {
    const rutas = rutasTrimestre(base, ejercicio, t);
    if (!fs.existsSync(rutas.registro)) continue;
    const apuntes = [...Registro.parse(JSON.parse(fs.readFileSync(rutas.registro, 'utf8'))).apuntes, ...cuotasReta(ejercicio, t, perfil), ...amortizaciones(ejercicio, t, perfil)];

    const c303 = calcular303(apuntes, perfil);
    const c130 = calcular130(apuntes, perfil, acc);
    const tot = totales130(apuntes, perfil);
    cifras.push({
      trimestre: `T${t}`,
      ingresos: tot.ingresos,
      gastos: r2(tot.gastos),
      ingresos_acum: c130['01'],
      gastos_acum: c130['02'],
      rendimiento_acum: c130['03'],
      retenciones_acum: c130['06'],
      iva_devengado: c303['27'],
      iva_deducible: c303['45'],
    });
    acc.ingresos = r2(acc.ingresos + tot.ingresos);
    acc.gastos = r2(acc.gastos + tot.gastos);
    acc.retenciones = r2(acc.retenciones + tot.retenciones);
    acc.pagosPrevios = r2(acc.pagosPrevios + Math.max(0, c130['07']));

    const leer = async (p: string) => (fs.existsSync(p) ? (await leerDeclaracion(p)).casillas : undefined);
    const [p303, p130] = await Promise.all([leer(rutas.m303), leer(rutas.m130)]);
    const p349 = fs.existsSync(rutas.m349) ? await leerDeclaracion(rutas.m349) : undefined;
    const comp = await comparar(base, ejercicio, t);
    const avisosComp = [comp.m303, comp.m130].flatMap((m) => m?.filas ?? []).filter((f) => !f.informativa && !f.redondeo).length;
    const revision = seg.revisiones[`${ejercicio}-T${t}`];
    trimestres.push({
      trimestre: `T${t}`,
      iva_303: p303 ? (p303['71'] ?? p303['46'] ?? null) : null,
      irpf_130: p130 ? (p130['19'] ?? null) : null,
      operaciones_349: p349 ? p349.operadores349.reduce((s, o) => s + o.base, 0) : null,
      comprobacion: revision?.estado ?? (avisosComp ? 'diferencias' : 'coincide'),
      resumen: revision?.resumen ?? (avisosComp ? `${avisosComp} casilla(s) no coinciden: ver informe` : 'Coincide con lo presentado'),
    });
  }

  // Plazos: calendario general + pendientes propios, desde hoy hasta dentro de un año
  const fin = new Date(Date.parse(hoy) + 365 * DIA).toISOString().slice(0, 10);
  const plazos = [...plazosDelAño(ejercicio, { actividad }), ...plazosDelAño(ejercicio + 1, { actividad })]
    .filter((p) => p.fecha >= hoy && p.fecha <= fin)
    .map((p) => {
      // Un trimestre ya presentado (su 303 está archivado) no es un plazo pendiente
      const [, t, a] = p.periodo.match(/^T(\d) (\d{4})$/) ?? [];
      const presentado = p.tipo === 'trimestral' && t !== undefined && fs.existsSync(rutasTrimestre(base, Number(a), Number(t)).m303);
      return { fecha: p.fecha, dias: dias(hoy, p.fecha), que: `${p.modelos}: ${p.concepto}`, periodo: p.periodo, quien: RESPONSABLE[p.tipo], tipo: p.tipo as string, estado: presentado ? 'presentado' : 'pendiente' };
    });
  for (const p of seg.pendientes.filter((x) => x.fecha <= fin)) {
    plazos.push({ fecha: p.fecha, dias: dias(hoy, p.fecha), que: p.titulo, periodo: '', quien: p.quien, tipo: 'tarea', estado: 'pendiente' });
  }
  plazos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Avisos: pendientes con nivel + plazos de los próximos 7 días
  const avisos = [
    ...seg.pendientes.map((p) => ({ nivel: p.nivel, titulo: p.titulo, detalle: p.detalle, fecha: p.fecha, dias: dias(hoy, p.fecha) })),
    ...plazos.filter((p) => p.dias >= 0 && p.dias <= 7 && p.tipo !== 'tarea' && p.estado === 'pendiente').map((p) => ({ nivel: 'alto' as const, titulo: `Vence en ${p.dias} días: ${p.que}`, detalle: `Periodo ${p.periodo}.`, fecha: p.fecha, dias: p.dias })),
  ].sort((a, b) => ['alto', 'medio', 'info'].indexOf(a.nivel) - ['alto', 'medio', 'info'].indexOf(b.nivel) || a.fecha.localeCompare(b.fecha));

  // Asesor: Renta estimada, recomendaciones y ayudas (si el perfil tiene datos personales)
  const analisis = perfil.personal ? await analizar(base, ejercicio, hoy) : undefined;
  const previsiones = [...seg.previsiones];
  if (analisis) {
    const r = analisis.renta.resultado;
    previsiones.unshift({ concepto: `Renta ${ejercicio}`, importe: Math.abs(r), signo: r > 0 ? 'pagar' : 'cobrar', cuando: `abril–junio de ${ejercicio + 1}`, nota: 'Estimación de autogestor: detalle en «Renta y ahorro».' });
  }
  const datos = {
    trimestres, cifras, plazos, avisos, previsiones,
    renta: analisis ? [analisis.renta] : [],
    supuestos: analisis?.supuestos.map((texto) => ({ texto })) ?? [],
    recomendaciones: analisis?.recomendaciones ?? [],
    ayudas: analisis?.ayudas ?? [],
  };
  for (const [nombre, filas] of Object.entries(datos)) fs.writeFileSync(path.join(out, `${nombre}.json`), JSON.stringify(filas, null, 2));
  const html = path.join(out, 'panel.html');
  fs.writeFileSync(html, panelHtml(datos, { titulo: nombre ? `Panel fiscal de ${nombre}` : 'Panel fiscal', ejercicio, generado: hoy, actividad }));
  return { dir: out, html, datos };
}
