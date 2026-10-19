import type { Apunte, Perfil } from '../tipos.js';

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Tipo de IVA que se autorrepercute en la inversión del sujeto pasivo de servicios. */
export const TIPO_GENERAL = 21;

export interface Deducible {
  /** Gasto fiscalmente deducible en IRPF (modelo 130). */
  gasto: number;
  /** Base y cuota de IVA soportado deducible (modelo 303). */
  baseIva: number;
  cuotaIva: number;
}

/** Calcula cuánto de un gasto es deducible en IRPF e IVA según el perfil. */
export function deducible(a: Apunte, p: Perfil): Deducible {
  if (a.tipo !== 'gasto') throw new Error(`${a.numero} no es un gasto`);

  if (a.bienInversion) {
    // Se amortiza: el gasto entra por amortizaciones(); el IVA soportado, si lo hay, sí se deduce
    return { gasto: 0, baseIva: a.regimenIva === 'interior' ? a.base : 0, cuotaIva: a.regimenIva === 'interior' ? a.cuotaIva : 0 };
  }
  if (a.regimenIva === 'intracomunitaria' || a.regimenIva === 'inversion_sp') {
    return { gasto: a.base, baseIva: a.base, cuotaIva: r2((a.base * TIPO_GENERAL) / 100) };
  }
  if (a.regimenIva === 'exenta') {
    return { gasto: a.total, baseIva: 0, cuotaIva: 0 };
  }

  if (a.categoria === 'suministro') {
    // Sin datos de vivienda afecta (perfil sin actividad), los suministros no son deducibles
    const { afectacion, factorIrpf, criterioIva } = p.suministros ?? { afectacion: 0, factorIrpf: 0, criterioIva: 'irpf' };
    const fIrpf = afectacion * factorIrpf;
    const fIva = criterioIva === 'irpf' ? fIrpf : afectacion;
    return {
      gasto: r2((a.base + a.noSujeto) * fIrpf),
      baseIva: r2(a.base * fIva),
      cuotaIva: r2(a.cuotaIva * fIva),
    };
  }
  if (a.categoria === 'telefonia') {
    const f = p.afectacionTelefonia;
    return { gasto: r2(a.base * f), baseIva: r2(a.base * f), cuotaIva: r2(a.cuotaIva * f) };
  }
  return { gasto: a.base, baseIva: a.base, cuotaIva: a.cuotaIva };
}

const DIA = 86_400_000;

/** Amortización lineal por días de cada bien de inversión en el trimestre. */
export function amortizaciones(ejercicio: number, trimestre: number, p: Perfil): Apunte[] {
  const inicio = Date.UTC(ejercicio, (trimestre - 1) * 3, 1);
  const fin = Date.UTC(ejercicio, trimestre * 3, 0); // último día del trimestre
  const diasAño = (Date.UTC(ejercicio + 1, 0, 1) - Date.UTC(ejercicio, 0, 1)) / DIA;
  return p.bienesInversion.flatMap((b) => {
    const alta = Date.parse(b.fechaAlta);
    const desde = Math.max(inicio, alta);
    if (desde > fin) return [];
    // Pendiente de amortizar al inicio del periodo
    const usado = Math.max(0, (inicio - alta) / DIA);
    const pendiente = b.valor - (b.valor * b.coeficiente * usado) / 365;
    if (pendiente <= 0) return [];
    const dias = (fin - desde) / DIA + 1;
    const cuota = r2(Math.min(pendiente, (b.valor * b.coeficiente * dias) / diasAño));
    return [
      {
        tipo: 'gasto',
        numero: `AMORT-${b.descripcion}-${ejercicio}T${trimestre}`,
        fecha: new Date(fin).toISOString().slice(0, 10),
        contraparte: 'Amortización',
        pais: 'ES',
        concepto: `${b.descripcion} (${(b.coeficiente * 100).toFixed(0)} %, ${dias} días)`,
        base: cuota,
        ivaPct: 0,
        cuotaIva: 0,
        noSujeto: 0,
        irpfPct: 0,
        cuotaIrpf: 0,
        total: cuota,
        categoria: 'amortizacion',
        regimenIva: 'exenta',
        bienInversion: false,
      } satisfies Apunte,
    ];
  });
}

/** Cuotas del RETA del trimestre como apuntes de gasto (no llegan como factura). */
export function cuotasReta(ejercicio: number, trimestre: number, p: Perfil): Apunte[] {
  const cuota = p.cuotaReta;
  if (!cuota) return [];
  return [0, 1, 2].map((i) => {
    const mes = (trimestre - 1) * 3 + 1 + i;
    const ultimo = new Date(Date.UTC(ejercicio, mes, 0)).getUTCDate();
    const fecha = `${ejercicio}-${String(mes).padStart(2, '0')}-${ultimo}`;
    return {
      tipo: 'gasto',
      numero: `RETA-${ejercicio}-${String(mes).padStart(2, '0')}`,
      fecha,
      contraparte: 'TGSS',
      pais: 'ES',
      concepto: 'Cuota autónomo',
      base: cuota,
      ivaPct: 0,
      cuotaIva: 0,
      noSujeto: 0,
      irpfPct: 0,
      cuotaIrpf: 0,
      total: cuota,
      categoria: 'cuota_reta',
      regimenIva: 'exenta',
        bienInversion: false,
    } satisfies Apunte;
  });
}
