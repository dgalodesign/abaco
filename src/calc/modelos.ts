import type { Apunte, Casillas, Operador349, Perfil } from '../tipos.js';
import { deducible, r2, TIPO_GENERAL } from './deducible.js';

const suma = (xs: number[]) => r2(xs.reduce((s, x) => s + x, 0));

/** Casillas del IVA devengado en régimen general por tipo: [base, tipo, cuota]. */
const CASILLAS_TIPO: Record<number, [string, string, string]> = {
  4: ['01', '02', '03'],
  10: ['04', '05', '06'],
  21: ['07', '08', '09'],
};

/** Modelo 303 de un trimestre a partir de sus apuntes. */
export function calcular303(apuntes: Apunte[], p: Perfil): Casillas {
  const c: Casillas = {};
  const ingresos = apuntes.filter((a) => a.tipo === 'ingreso');
  const gastos = apuntes.filter((a) => a.tipo === 'gasto');

  for (const [tipo, [cb, ct, cc]] of Object.entries(CASILLAS_TIPO)) {
    const delTipo = ingresos.filter((a) => a.regimenIva === 'interior' && a.ivaPct === Number(tipo));
    if (!delTipo.length) continue;
    c[cb] = suma(delTipo.map((a) => a.base));
    c[ct] = Number(tipo);
    c[cc] = suma(delTipo.map((a) => a.cuotaIva));
  }

  const intra = gastos.filter((a) => a.regimenIva === 'intracomunitaria');
  const isp = gastos.filter((a) => a.regimenIva === 'inversion_sp');
  c['10'] = suma(intra.map((a) => a.base));
  c['11'] = r2((c['10'] * TIPO_GENERAL) / 100);
  c['12'] = suma(isp.map((a) => a.base));
  c['13'] = r2((c['12'] * TIPO_GENERAL) / 100);
  c['27'] = suma(['03', '06', '09', '11', '13'].map((k) => c[k] ?? 0));

  // 28/29: operaciones interiores corrientes, incluida la inversión del sujeto pasivo de fuera de la UE.
  const interiores = gastos.filter((a) => a.regimenIva === 'interior' || a.regimenIva === 'inversion_sp');
  const ded = interiores.map((a) => deducible(a, p));
  c['28'] = suma(ded.map((d) => d.baseIva));
  c['29'] = suma(ded.map((d) => d.cuotaIva));
  c['36'] = c['10'];
  c['37'] = c['11'];
  c['45'] = suma([c['29'], c['37']]);
  c['46'] = r2(c['27'] - c['45']);

  // Información adicional
  const intraIngresos = ingresos.filter((a) => a.regimenIva === 'intracomunitaria');
  c['59'] = suma(intraIngresos.map((a) => a.base));
  c['120'] = suma(ingresos.filter((a) => a.regimenIva === 'no_sujeta').map((a) => a.base));
  return c;
}

export interface Acumulado130 {
  /** Ingresos y gastos (sin difícil justificación) de los trimestres anteriores del año. */
  ingresos: number;
  gastos: number;
  retenciones: number;
  /** Suma de las casillas 07 positivas de los trimestres anteriores (casilla 05). */
  pagosPrevios: number;
  /** Resultados negativos pendientes de trimestres anteriores (casilla 15). */
  negativosPrevios: number;
}

/** Ingresos y gastos fiscales de un trimestre, sin la provisión de difícil justificación. */
export function totales130(apuntes: Apunte[], p: Perfil) {
  const ingresos = apuntes.filter((a) => a.tipo === 'ingreso');
  const gastos = apuntes.filter((a) => a.tipo === 'gasto');
  return {
    ingresos: suma(ingresos.map((a) => a.base)),
    gastos: suma(gastos.map((a) => deducible(a, p).gasto)),
    retenciones: suma(ingresos.map((a) => a.cuotaIrpf)),
  };
}

/** Modelo 130 (datos acumulados desde el 1 de enero). */
export function calcular130(apuntes: Apunte[], p: Perfil, prev: Acumulado130): Casillas {
  const t = totales130(apuntes, p);
  const ingresos = r2(prev.ingresos + t.ingresos);
  const gastosSinDJ = r2(prev.gastos + t.gastos);
  const dj = Math.min(Math.max(0, (ingresos - gastosSinDJ) * p.dificilJustificacion.pct), p.dificilJustificacion.maximo);
  const c: Casillas = {};
  c['01'] = ingresos;
  c['02'] = r2(gastosSinDJ + dj);
  c['03'] = r2(c['01'] - c['02']);
  c['04'] = c['03'] > 0 ? r2(c['03'] * 0.2) : 0;
  c['05'] = prev.pagosPrevios;
  c['06'] = r2(prev.retenciones + t.retenciones);
  c['07'] = r2(c['04'] - c['05'] - c['06']);
  c['12'] = Math.max(0, c['07']);
  c['13'] = p.minoracion130;
  c['14'] = r2(c['12'] - c['13']);
  c['15'] = c['14'] > 0 ? Math.min(prev.negativosPrevios, c['14']) : 0;
  c['17'] = r2(c['14'] - c['15']);
  c['19'] = c['17'];
  return c;
}

/** Modelo 349: adquisiciones (clave I) y prestaciones (clave S) de servicios intracomunitarios. */
export function calcular349(apuntes: Apunte[]): Operador349[] {
  const porNif = new Map<string, Operador349>();
  for (const a of apuntes.filter((x) => x.regimenIva === 'intracomunitaria')) {
    const clave = a.tipo === 'gasto' ? 'I' : 'S';
    const nif = (a.nif ?? '').replace(/^[A-Z]{2}/, '');
    const k = `${a.pais}${nif}${clave}`;
    const op = porNif.get(k) ?? { pais: a.pais, nif, nombre: a.contraparte, clave, base: 0 };
    op.base = r2(op.base + a.base);
    porNif.set(k, op);
  }
  return [...porNif.values()];
}
