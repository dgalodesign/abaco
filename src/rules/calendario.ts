/**
 * Plazos generales de un autónomo en estimación directa con IVA general, o solo la Renta si no hay actividad.
 * Fechas legales (art. 71 RIVA, art. 110 RIRPF, Orden HAC del 347): si el último día cae en
 * sábado o domingo pasa al siguiente día hábil. No se tienen en cuenta festivos: hay que
 * confirmarlas con el calendario del contribuyente de la AEAT de cada año.
 */
export interface Plazo {
  fecha: string; // AAAA-MM-DD
  modelos: string;
  concepto: string;
  periodo: string;
  tipo: 'trimestral' | 'anual' | 'renta' | 'reta';
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Mueve un sábado o domingo al lunes siguiente. */
export function habil(año: number, mes: number, dia: number): string {
  const d = new Date(Date.UTC(año, mes - 1, dia));
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

/** Plazos que vencen en el año natural `año`. */
export function plazosDelAño(año: number, opciones: { m349?: boolean; m347?: boolean; actividad?: boolean } = {}): Plazo[] {
  const { m349 = true, m347 = true, actividad = true } = opciones;
  const renta: Plazo = { fecha: habil(año, 6, 30), modelos: 'Renta (100)', concepto: 'Declaración de la Renta', periodo: `${año - 1}`, tipo: 'renta' };
  // Sin actividad económica no hay 303, 130, 349, 347 ni RETA
  if (!actividad) return [renta];
  const trimestrales = m349 ? '303 · 130 · 349' : '303 · 130';
  return [
    { fecha: habil(año, 1, 30), modelos: `${trimestrales} · 390`, concepto: 'Cuarto trimestre y resumen anual de IVA', periodo: `T4 ${año - 1}`, tipo: 'trimestral' },
    ...(m347 ? [{ fecha: habil(año, 2, 28), modelos: '347', concepto: 'Operaciones con terceros de más de 3.005,06 €', periodo: `${año - 1}`, tipo: 'anual' as const }] : []),
    { fecha: habil(año, 4, 20), modelos: trimestrales, concepto: 'Primer trimestre', periodo: `T1 ${año}`, tipo: 'trimestral' },
    renta,
    { fecha: habil(año, 7, 20), modelos: trimestrales, concepto: 'Segundo trimestre', periodo: `T2 ${año}`, tipo: 'trimestral' },
    { fecha: habil(año, 10, 20), modelos: trimestrales, concepto: 'Tercer trimestre', periodo: `T3 ${año}`, tipo: 'trimestral' },
    // Cambio de base del RETA: lo pedido entre el 1/09 y el 31/10 surte efecto el 1/11
    { fecha: `${año}-10-31`, modelos: 'RETA', concepto: 'Último día para cambiar la base de cotización con efecto 1 de noviembre', periodo: `${año}`, tipo: 'reta' },
  ];
}
