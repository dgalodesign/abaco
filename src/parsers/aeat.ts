import fs from 'node:fs';
import { getDocumentProxy, extractText } from 'unpdf';
import type { Casillas, Operador349 } from '../tipos.js';

export interface DeclaracionAeat {
  modelo: string;
  presentada: boolean;
  justificante?: string;
  fechaPresentacion?: string;
  casillas: Casillas;
  operadores349: Operador349[];
}

const numero = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));

/**
 * Lee un PDF de modelo de la AEAT (303, 130, 349). Las casillas se identifican por posición:
 * cada importe se asigna al número de casilla más cercano a su izquierda en la misma línea.
 */
export async function leerDeclaracion(ruta: string): Promise<DeclaracionAeat> {
  const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(ruta)));
  const casillas: Casillas = {};

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const items = (await page.getTextContent()).items
      .filter((it): it is typeof it & { str: string; transform: number[] } => 'str' in it)
      .map((it) => ({ s: it.str.trim(), x: it.transform[4], y: it.transform[5] }))
      .filter((it) => it.s);
    const etiquetas = items.filter((it) => /^\d{2,3}$/.test(it.s));
    const importes = items.filter((it) => /^-?[\d.]+,\d{2}$/.test(it.s));
    for (const v of importes) {
      const candidata = etiquetas
        .filter((e) => Math.abs(e.y - v.y) <= 4 && e.x < v.x)
        .sort((a, b) => b.x - a.x)[0];
      if (candidata && !(candidata.s in casillas)) casillas[candidata.s] = numero(v.s);
    }
  }

  const { text } = await extractText(pdf, { mergePages: true });
  const modelo = text.match(/Modelo\s+(\d{3})/)?.[1] ?? '?';
  const operadores349: Operador349[] = [];
  if (modelo === '349') {
    for (const m of text.matchAll(/^([A-Z]{2}) (\S+) (.+?) ([AEIST]) (-?[\d.]+,\d{2})$/gm)) {
      operadores349.push({ pais: m[1], nif: m[2], nombre: m[3], clave: m[4], base: numero(m[5]) });
    }
  }
  return {
    modelo,
    presentada: /INFORMACIÓN DE LA PRESENTACIÓN/.test(text),
    justificante: text.match(/Número de justificante:\s*(\d+)/)?.[1],
    fechaPresentacion: text.match(/Presentación realizada el:\s*([\d-]+)/)?.[1],
    casillas,
    operadores349,
  };
}
