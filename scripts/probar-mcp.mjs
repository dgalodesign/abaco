// Prueba de punta a punta del servidor MCP empaquetado: node scripts/probar-mcp.mjs [carpeta del autónomo]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const servidor = path.resolve(import.meta.dirname, '..', 'plugin', 'server', 'autogestor-mcp.mjs');

async function conectar(dir) {
  const c = new Client({ name: 'prueba', version: '1.0.0' });
  await c.connect(new StdioClientTransport({ command: process.execPath, args: [servidor], env: { ...process.env, AUTOGESTOR_DIR: dir }, stderr: 'ignore' }));
  return c;
}
const llamar = async (c, name, args = {}) => {
  const r = await c.callTool({ name, arguments: args });
  return { error: !!r.isError, texto: r.content[0].text };
};
let fallos = 0;
const comprobar = (ok, msg) => {
  console.log(`${ok ? '✔' : '✘'} ${msg}`);
  if (!ok) fallos++;
};

// 1. Carpeta nueva: el flujo de alguien que instala el plugin
const vacia = fs.mkdtempSync(path.join(os.tmpdir(), 'autogestor-'));
const c1 = await conectar(vacia);
const herramientas = (await c1.listTools()).tools.map((t) => t.name);
comprobar(herramientas.length >= 10, `${herramientas.length} herramientas: ${herramientas.join(', ')}`);
comprobar((await llamar(c1, 'estructura_carpeta')).texto.includes('falta _autogestor/perfil.json'), 'carpeta nueva: detecta que falta el perfil');
comprobar((await llamar(c1, 'guardar_perfil', { perfil: { nombre: 'Ana Prueba', nif: '00000000T' } })).error, 'perfil incompleto: lo rechaza con errores');
const perfil = { nombre: 'Ana Prueba', nif: '00000000T', cuotaReta: 300, suministros: { afectacion: 0.1 } };
comprobar(!(await llamar(c1, 'guardar_perfil', { perfil })).error, 'perfil mínimo: guardado');
const apunte = { tipo: 'ingreso', numero: 'A-1', fecha: '2026-02-10', contraparte: 'Cliente SL', pais: 'ES', base: 1000, ivaPct: 21, cuotaIva: 210, irpfPct: 15, cuotaIrpf: 150, total: 1060, categoria: 'servicios', regimenIva: 'interior' };
comprobar(!(await llamar(c1, 'guardar_registro', { año: 2026, trimestre: 1, apuntes: [apunte] })).error, 'registro de prueba: guardado');
comprobar((await llamar(c1, 'guardar_registro', { año: 2026, trimestre: 1, apuntes: [{ ...apunte, regimenIva: 'otro' }] })).error, 'registro inválido: rechazado');
const comp = await llamar(c1, 'comparar_trimestre', { año: 2026, trimestre: 1 });
comprobar(comp.texto.includes('No encuentro el 303 presentado'), 'comparar sin modelos: avisa de lo que falta');
comprobar(!(await llamar(c1, 'generar_panel', { año: 2026 })).error, 'panel con datos mínimos: generado');
comprobar((await llamar(c1, 'analizar_renta', { año: 2026 })).texto.includes('personal'), 'Renta sin datos personales: lo explica');
// Solo asalariado: sin RETA ni suministros; solo el plazo de la Renta
const asalariado = { tipo: 'asalariado', personal: { añoNacimiento: 1990, ccaa: 'andalucia', alquilerMensual: 500 } };
comprobar(!(await llamar(c1, 'guardar_perfil', { perfil: asalariado })).error, 'perfil de solo asalariado: guardado sin nombre, NIF, RETA ni suministros');
const plazos = JSON.parse((await llamar(c1, 'plazos', { año: 2027 })).texto);
comprobar(plazos.length === 1 && plazos[0].tipo === 'renta', 'solo asalariado: el calendario solo tiene la Renta');
comprobar(!(await llamar(c1, 'generar_panel', { año: 2026 })).error, 'solo asalariado: panel generado');
await c1.close();
fs.rmSync(vacia, { recursive: true, force: true });

// 2. Carpeta real (opcional)
const real = process.argv[2];
if (real) {
  const c2 = await conectar(real);
  const t3 = await llamar(c2, 'comparar_trimestre', { año: 2026, trimestre: 3 });
  comprobar(t3.texto.includes('**303:** ✔ Coincide') && t3.texto.includes('**130:**') && t3.texto.includes('**349:** ✔ Coincide'), 'carpeta real: 303 y 349 del T3 coinciden; 130 comparado');
  const renta = JSON.parse((await llamar(c2, 'analizar_renta', { año: 2026 })).texto);
  comprobar(typeof renta.renta.resultado === 'number', `carpeta real: Renta estimada ${renta.renta.resultado} €`);
  await c2.close();
}

console.log(fallos ? `\n${fallos} comprobación(es) fallida(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
