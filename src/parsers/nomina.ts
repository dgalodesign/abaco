import fs from 'node:fs';
import { extractText, getDocumentProxy } from 'unpdf';

/** Datos de una nómina que importan para la Renta. */
export interface Nomina {
  mes: number;
  año: number;
  devengado: number;
  /** Cotizaciones del trabajador a la Seguridad Social (gasto deducible del trabajo). */
  seguridadSocial: number;
  retencionPct: number;
  retencion: number;
  liquido: number;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const n = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const NUM = '(\\d[\\d.]*,\\d{2})';

/**
 * Lee una nómina con el modelo oficial de recibo de salarios (Orden ESS/2098/2014).
 * Tras "<mes> <año>" vienen: total devengado, total a deducir, líquido; cuatro pares tipo/importe
 * de cotizaciones del trabajador; total de aportaciones; tipo y cuota del IRPF.
 */
export async function leerNomina(ruta: string): Promise<Nomina> {
  const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(ruta)));
  const { text } = await extractText(pdf, { mergePages: true });
  const t = text.replace(/\s+/g, ' ');
  const re = new RegExp(`(${MESES.join('|')}) (\\d{4}) ${NUM} ${NUM} ${NUM} (?:${NUM} ${NUM} ){4}${NUM} ${NUM} ${NUM}`);
  const m = t.match(re);
  if (!m) throw new Error(`No reconozco el formato de la nómina ${ruta}`);
  return {
    mes: MESES.indexOf(m[1]) + 1,
    año: Number(m[2]),
    devengado: n(m[3]),
    liquido: n(m[5]),
    seguridadSocial: n(m[8]),
    retencionPct: n(m[9]),
    retencion: n(m[10]),
  };
}
