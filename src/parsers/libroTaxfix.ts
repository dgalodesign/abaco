import XLSX from 'xlsx';

/** Una línea del "Libro de ingresos y gastos" que exporta Taxfix. */
export interface LineaLibro {
  tipo: 'ingreso' | 'gasto';
  numero: string;
  fecha: string; // AAAA-MM-DD
  nif: string;
  contraparte: string;
  concepto: string;
  base: number;
  cuotaIva: number;
  ivaPct: number;
  cuotaIrpf: number;
  total: number;
  /** Solo gastos: importe deducible en IRPF según la gestoría. */
  gastoDeducible: number;
}

// Taxfix exporta "4,400.00": la coma es separador de miles
const num = (v: unknown) => Number(String(v ?? '0').trim().replace(/,/g, '') || 0);
const fecha = (v: unknown) => {
  const [d, m, a] = String(v).trim().split('-');
  return `${a}-${m}-${d}`;
};

function filas(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
  const cab = matriz.findIndex((f) => f[0] === 'Actividad' && /Proveedor|Cliente|Inversi/.test(String(f[1])));
  if (cab < 0) throw new Error('No encuentro la cabecera del libro');
  const nombres = matriz[cab].map(String);
  return matriz
    .slice(cab + 1)
    .filter((f) => f.some((c) => String(c).trim()))
    .map((f) => Object.fromEntries(nombres.map((n, i) => [n, f[i]])));
}

export function leerLibroTaxfix(ruta: string): LineaLibro[] {
  const wb = XLSX.readFile(ruta);
  const out: LineaLibro[] = [];
  for (const f of filas(wb.Sheets['Ingresos'])) {
    out.push({
      tipo: 'ingreso',
      numero: String(f['Nº Factura']).trim(),
      fecha: fecha(f['Fecha de devengo'] || f['Fecha de factura']),
      nif: String(f['NIF - Cliente']).trim(),
      contraparte: String(f['Nombre/Razón social - Cliente']).trim(),
      concepto: String(f['Concepto']).trim(),
      base: num(f['Base Imponible (€)']),
      cuotaIva: num(f['Cuota IVA (€)']),
      ivaPct: num(f['IVA (%)']),
      cuotaIrpf: Math.abs(num(f['Cuota IRPF (€)'])),
      total: num(f['Total factura (€)']),
      gastoDeducible: 0,
    });
  }
  for (const f of filas(wb.Sheets['Gastos'])) {
    out.push({
      tipo: 'gasto',
      numero: String(f['Nº Factura']).trim(),
      fecha: fecha(f['Fecha de factura']),
      nif: String(f['NIF - Proveedor']).trim(),
      contraparte: String(f['Nombre/Razón social - Proveedor']).trim(),
      concepto: String(f['Concepto']).trim(),
      base: num(f['Base Imponible (€)']),
      cuotaIva: num(f['Cuota IVA (€)']),
      ivaPct: num(f['IVA (%)']),
      cuotaIrpf: Math.abs(num(f['Cuota IRPF (€)'])),
      total: num(f['Total factura (€)']),
      gastoDeducible: num(f['Gasto Deducible (€)']),
    });
  }
  return out;
}

/**
 * Formato antiguo de la gestoría: "Libro de facturas recibidas" / "Libro de facturas expedidas",
 * uno por archivo, con columnas Orden, Fecha, …, Base, Tipo, Cuota, Total.
 */
export function leerLibroSimple(ruta: string, tipo: 'ingreso' | 'gasto'): LineaLibro[] {
  const wb = XLSX.readFile(ruta);
  const matriz = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
  const cab = matriz.findIndex((f) => f[0] === 'Orden' && f[4] === 'Factura');
  if (cab < 0) throw new Error(`No reconozco el formato del libro ${ruta}`);
  return matriz
    .slice(cab + 1)
    .filter((f) => /^\d+$/.test(String(f[0]).trim()))
    .map((f) => {
      const [d, m, a] = String(f[1]).trim().split('/');
      const base = num(f[9]);
      return {
        tipo,
        numero: String(f[4]).trim(),
        fecha: `20${a.slice(-2)}-${m}-${d}`,
        nif: String(f[8]).trim(),
        contraparte: String(f[7]).trim(),
        concepto: '',
        base,
        ivaPct: num(f[10]),
        cuotaIva: num(f[11]),
        cuotaIrpf: 0,
        total: num(f[14]),
        gastoDeducible: tipo === 'gasto' ? base : 0,
      };
    });
}
