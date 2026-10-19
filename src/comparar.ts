import fs from 'node:fs';
import path from 'node:path';
import { Perfil, Registro, type Apunte, type Casillas, type Operador349 } from './tipos.js';
import { amortizaciones, cuotasReta, deducible, r2 } from './calc/deducible.js';
import { calcular130, calcular303, calcular349, totales130, type Acumulado130 } from './calc/modelos.js';
import { leerDeclaracion, type DeclaracionAeat } from './parsers/aeat.js';
import { leerLibroSimple, leerLibroTaxfix, type LineaLibro } from './parsers/libroTaxfix.js';

/** Casillas que son tipos impositivos o bases informativas: se muestran pero no cuentan como discrepancia. */
const INFORMATIVAS: Record<string, string[]> = {
  '303': ['02', '05', '08', '28'],
  '130': [],
};
const RELEVANTES: Record<string, string[]> = {
  '303': ['01', '03', '04', '06', '07', '09', '10', '11', '12', '13', '27', '28', '29', '36', '37', '45', '46', '59', '120'],
  '130': ['01', '02', '03', '04', '05', '06', '07', '12', '13', '14', '15', '17', '19'],
};

export interface FilaCasilla { casilla: string; gestor?: number; propio?: number; dif: number; informativa: boolean; redondeo: boolean }
export interface FilaFactura { numero: string; contraparte: string; campo: string; gestor: string; propio: string }

export interface Comparacion {
  ejercicio: number;
  trimestre: number;
  m303?: { decl: DeclaracionAeat; filas: FilaCasilla[] };
  m130?: { decl: DeclaracionAeat; filas: FilaCasilla[]; origenAcumulado: string };
  m349?: { decl: DeclaracionAeat; propios: Operador349[]; diferencias: string[] };
  libro?: { soloGestor: LineaLibro[]; soloPropio: Apunte[]; diferencias: FilaFactura[] };
  avisos: string[];
}

const norm = (s = '') => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const mes = (f: string) => f.slice(0, 7);

function compararCasillas(modelo: string, gestor: Casillas, propio: Casillas, tol: number): FilaCasilla[] {
  return RELEVANTES[modelo]
    .filter((k) => k in gestor || (propio[k] ?? 0) !== 0)
    .map((k) => {
      const g = gestor[k] ?? 0;
      const p = propio[k] ?? 0;
      const informativa = INFORMATIVAS[modelo].includes(k);
      return { casilla: k, gestor: gestor[k], propio: propio[k], dif: r2(p - g), informativa, redondeo: Math.abs(p - g) <= tol };
    });
}

export function rutasTrimestre(base: string, ejercicio: number, t: number) {
  const decl = path.join(base, String(ejercicio), `T${t}`, 'Declaraciones');
  const presentado = (m: number) => path.join(decl, `${m}+${t}T+${ejercicio}.pdf`);
  return {
    decl,
    m303: presentado(303),
    m130: presentado(130),
    m349: presentado(349),
    libro: path.join(decl, `T${t}_de_${ejercicio}-Libro_de_ingresos_y_gastos.xlsx`),
    // Formato antiguo: un libro de recibidas y otro de emitidas
    libroRecibidas: path.join(base, String(ejercicio), `T${t}`, 'Facturas-Gastos', 'Libro+de+Facturas+Recibidas.XLSX'),
    libroEmitidas: path.join(base, String(ejercicio), `T${t}`, 'Facturas-Ingresos', 'Libro+de+Facturas+Emitidas.XLSX'),
    registro: path.join(base, '_autogestor', 'registros', `${ejercicio}-T${t}.json`),
  };
}

const existe = (p: string) => fs.existsSync(p);

/** Gastos que no llegan como factura: cuotas del RETA y amortizaciones. */
const automaticos = (ejercicio: number, t: number, p: Perfil) => [...cuotasReta(ejercicio, t, p), ...amortizaciones(ejercicio, t, p)];

function cargarRegistro(ruta: string) {
  return Registro.parse(JSON.parse(fs.readFileSync(ruta, 'utf8')));
}

/** Acumulado de trimestres anteriores: registro propio si existe; si no, el 130 presentado del trimestre anterior. */
async function acumuladoPrevio(base: string, ejercicio: number, t: number, perfil: Perfil): Promise<{ acc: Acumulado130; origen: string }> {
  const vacio: Acumulado130 = { ingresos: 0, gastos: 0, retenciones: 0, pagosPrevios: 0, negativosPrevios: 0 };
  if (t === 1) return { acc: vacio, origen: 'primer trimestre del año' };

  const propios = Array.from({ length: t - 1 }, (_, i) => rutasTrimestre(base, ejercicio, i + 1).registro);
  if (propios.every(existe)) {
    const acc = { ...vacio };
    for (const [i, ruta] of propios.entries()) {
      const ap = [...cargarRegistro(ruta).apuntes, ...automaticos(ejercicio, i + 1, perfil)];
      const c = calcular130(ap, perfil, acc);
      const tot = totales130(ap, perfil);
      acc.ingresos = r2(acc.ingresos + tot.ingresos);
      acc.gastos = r2(acc.gastos + tot.gastos);
      acc.retenciones = r2(acc.retenciones + tot.retenciones);
      acc.pagosPrevios = r2(acc.pagosPrevios + Math.max(0, c['07']));
    }
    return { acc, origen: 'registros propios de los trimestres anteriores' };
  }

  const ant = rutasTrimestre(base, ejercicio, t - 1).m130;
  if (!existe(ant)) throw new Error(`Falta el 130 del T${t - 1} (${ant}) o los registros propios anteriores`);
  const c = (await leerDeclaracion(ant)).casillas;
  const pct = perfil.dificilJustificacion.pct;
  const ingresos = c['01'] ?? 0;
  // La casilla 02 incluye la difícil justificación: g02 = G + pct·(I − G)  ⇒  G = (g02 − pct·I) / (1 − pct)
  const gastos = r2(((c['02'] ?? 0) - pct * ingresos) / (1 - pct));
  return {
    acc: {
      ingresos,
      gastos,
      retenciones: c['06'] ?? 0,
      pagosPrevios: r2((c['05'] ?? 0) + Math.max(0, c['07'] ?? 0)),
      negativosPrevios: 0,
    },
    origen: `130 presentado del T${t - 1} (aún no hay registro propio de ese trimestre)`,
  };
}

function compararLibro(libro: LineaLibro[], apuntes: Apunte[], perfil: Perfil) {
  const pendientes = [...libro];
  const soloPropio: Apunte[] = [];
  const diferencias: FilaFactura[] = [];
  const tol = perfil.tolerancia;

  for (const a of apuntes) {
    let i = pendientes.findIndex((l) => l.tipo === a.tipo && norm(l.numero) && norm(l.numero) === norm(a.numero));
    if (i < 0) {
      i = pendientes.findIndex(
        (l) => l.tipo === a.tipo && norm(l.nif).replace(/^[A-Z]{2}(?=\d)/, '') === norm(a.nif).replace(/^[A-Z]{2}(?=\d)/, '') && mes(l.fecha) === mes(a.fecha) && Math.abs(l.total - a.total) <= tol,
      );
    }
    if (i < 0 && a.categoria === 'cuota_reta') {
      const tgss = (l: LineaLibro) => l.tipo === 'gasto' && /TGSS/i.test(l.contraparte) && mes(l.fecha) === mes(a.fecha);
      // Primero la línea del mismo importe: la gestoría a veces etiqueta otros recibos como TGSS
      i = pendientes.findIndex((l) => tgss(l) && Math.abs(l.total - a.total) <= tol);
      if (i < 0) i = pendientes.findIndex(tgss);
    }
    if (i < 0) {
      // Última opción: mismo mes e importe (líneas con el proveedor mal etiquetado en el libro)
      const mismas = pendientes.filter((l) => l.tipo === a.tipo && mes(l.fecha) === mes(a.fecha) && Math.abs(l.total - a.total) <= tol);
      if (mismas.length === 1) i = pendientes.indexOf(mismas[0]);
    }
    if (i < 0) {
      soloPropio.push(a);
      continue;
    }
    const l = pendientes.splice(i, 1)[0];
    const dif = (campo: string, g: number, p: number) => {
      if (Math.abs(g - p) > tol) diferencias.push({ numero: a.numero, contraparte: a.contraparte, campo, gestor: g.toFixed(2), propio: p.toFixed(2) });
    };
    if (a.tipo === 'gasto') {
      const d = deducible(a, perfil);
      dif('Gasto deducible', l.gastoDeducible, d.gasto);
      const ivaGestor = a.regimenIva === 'interior' ? l.cuotaIva : 0;
      const ivaPropio = a.regimenIva === 'interior' ? d.cuotaIva : 0;
      dif('IVA deducible', ivaGestor, ivaPropio);
    } else {
      dif('Base', l.base, a.base);
      dif('IVA', l.cuotaIva, a.cuotaIva);
      dif('Retención', l.cuotaIrpf, a.cuotaIrpf);
    }
    const fechaPropia = a.fechaDevengo ?? a.fecha;
    if (l.fecha !== fechaPropia && a.tipo === 'gasto') {
      diferencias.push({ numero: a.numero, contraparte: a.contraparte, campo: 'Fecha (informativa)', gestor: l.fecha, propio: a.fecha });
    }
  }
  return { soloGestor: pendientes, soloPropio, diferencias };
}

export async function comparar(base: string, ejercicio: number, t: number): Promise<Comparacion> {
  const perfil = Perfil.parse(JSON.parse(fs.readFileSync(path.join(base, '_autogestor', 'perfil.json'), 'utf8')));
  const rutas = rutasTrimestre(base, ejercicio, t);
  if (!existe(rutas.registro)) throw new Error(`Falta el registro propio: ${rutas.registro}`);
  const registro = cargarRegistro(rutas.registro);
  const apuntes = [...registro.apuntes, ...automaticos(ejercicio, t, perfil)];
  const tol = perfil.tolerancia;
  const res: Comparacion = { ejercicio, trimestre: t, avisos: [] };

  if (existe(rutas.m303)) {
    const decl = await leerDeclaracion(rutas.m303);
    res.m303 = { decl, filas: compararCasillas('303', decl.casillas, calcular303(apuntes, perfil), tol) };
  } else res.avisos.push('No encuentro el 303 presentado del trimestre.');

  if (existe(rutas.m130)) {
    const decl = await leerDeclaracion(rutas.m130);
    const { acc, origen } = await acumuladoPrevio(base, ejercicio, t, perfil);
    res.m130 = { decl, filas: compararCasillas('130', decl.casillas, calcular130(apuntes, perfil, acc), tol), origenAcumulado: origen };
  } else res.avisos.push('No encuentro el 130 presentado del trimestre.');

  const propios349 = calcular349(apuntes);
  if (existe(rutas.m349)) {
    const decl = await leerDeclaracion(rutas.m349);
    const diferencias: string[] = [];
    for (const p of propios349) {
      const g = decl.operadores349.find((o) => norm(o.nif) === norm(p.nif) && o.clave === p.clave);
      if (!g) diferencias.push(`${p.pais}${p.nif} ${p.nombre} (clave ${p.clave}, ${p.base.toFixed(2)} €) no aparece en el 349 presentado`);
      else if (Math.abs(g.base - p.base) > tol) diferencias.push(`${p.nombre}: presentado ${g.base.toFixed(2)} €, propio ${p.base.toFixed(2)} €`);
    }
    for (const g of decl.operadores349) {
      if (!propios349.some((p) => norm(p.nif) === norm(g.nif) && p.clave === g.clave)) diferencias.push(`${g.pais}${g.nif} ${g.nombre} está en el 349 presentado pero no en el registro propio`);
    }
    res.m349 = { decl, propios: propios349, diferencias };
  } else if (propios349.length) res.avisos.push('Hay operaciones intracomunitarias pero no encuentro el 349 presentado.');

  const libro = existe(rutas.libro)
    ? leerLibroTaxfix(rutas.libro)
    : existe(rutas.libroRecibidas) && existe(rutas.libroEmitidas)
      ? [...leerLibroSimple(rutas.libroEmitidas, 'ingreso'), ...leerLibroSimple(rutas.libroRecibidas, 'gasto')]
      : undefined;
  // Seguro de salud: límite anual por persona (art. 30.2.5.ª LIRPF)
  const delAño = Array.from({ length: t }, (_, i) => rutasTrimestre(base, ejercicio, i + 1).registro).filter(existe);
  const primas = r2(delAño.flatMap((r) => cargarRegistro(r).apuntes).filter((a) => a.categoria === 'seguro_salud').reduce((s, a) => s + a.total, 0));
  if (primas > perfil.limiteSeguroSalud) {
    res.avisos.push(`Seguro de salud: ${primas.toFixed(2)} € deducidos en ${ejercicio} hasta el T${t}, por encima del límite de ${perfil.limiteSeguroSalud} € por persona. El exceso no es deducible.`);
  } else if (t < 4 && primas > (perfil.limiteSeguroSalud * t) / 4) {
    res.avisos.push(`Seguro de salud: ${primas.toFixed(2)} € hasta el T${t}. A este ritmo se superará el límite anual de ${perfil.limiteSeguroSalud} € por persona; el exceso no es deducible.`);
  }

  if (libro) res.libro =compararLibro(libro, apuntes.filter((a) => a.categoria !== 'amortizacion'), perfil);
  else res.avisos.push('No encuentro el libro de ingresos y gastos de la gestoría.');

  return res;
}
