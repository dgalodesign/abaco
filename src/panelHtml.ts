/**
 * Página HTML autocontenida del panel: datos, estilos y script en un solo archivo que se abre en local.
 * El contenido va escrito en el HTML (ver panelCuerpo.ts). Solo carga las fuentes de internet, con alternativa del sistema.
 */
import { cuerpo } from './panelCuerpo.js';

export interface MetaPanel {
  titulo: string;
  ejercicio: number;
  generado: string; // AAAA-MM-DD
  /** Tiene actividad económica: si no, se ocultan los trimestres y las cifras de la actividad. */
  actividad?: boolean;
}


export function panelHtml(datos: Record<string, unknown[]>, meta: MetaPanel): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.titulo}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400;9..144,500&display=swap">
<style>
/* Layout: una columna de lectura; arriba lo que pide acción (avisos, plazos), abajo el registro (declaraciones, cifras, previsiones). */
:root {
  --bg: #f6f7f6; --panel: #ffffff; --fg: #17201f; --muted: #5b6866; --line: #dde3e1;
  --accent: #0f5c63; --accent-soft: #e3eff0;
  --ok: #1d7a4a; --ok-soft: #e2f2e9; --warn: #9a6200; --warn-soft: #fbf0d9; --bad: #b3261e; --bad-soft: #fbe5e3;
  --bar-a: #0f5c63; --bar-b: #9fb6b4;
  --display: "Fraunces", Georgia, "Times New Roman", serif;
  --text: "Public Sans", "Segoe UI", system-ui, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #101615; --panel: #171f1e; --fg: #e5ecea; --muted: #94a3a0; --line: #2a3533;
    --accent: #6cc3c9; --accent-soft: #1b3133;
    --ok: #6fd19b; --ok-soft: #173126; --warn: #e8b45a; --warn-soft: #33290f; --bad: #f08a80; --bad-soft: #3a1b18;
    --bar-a: #6cc3c9; --bar-b: #4b5d5b; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #101615; --panel: #171f1e; --fg: #e5ecea; --muted: #94a3a0; --line: #2a3533;
  --accent: #6cc3c9; --accent-soft: #1b3133;
  --ok: #6fd19b; --ok-soft: #173126; --warn: #e8b45a; --warn-soft: #33290f; --bad: #f08a80; --bad-soft: #3a1b18;
  --bar-a: #6cc3c9; --bar-b: #4b5d5b; color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 var(--text); }
.pagina { max-width: 64rem; margin-inline: auto; padding-block: 2rem 3rem; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 2.25rem; }
h1, h2 { font-family: var(--display); font-weight: 400; text-wrap: balance; margin: 0; }
h1 { font-size: 2rem; line-height: 1.15; }
h2 { font-size: 1.35rem; }
.cab { display: grid; gap: .4rem; }
.cab .linea { color: var(--muted); }
.resumen { font-size: 1.05rem; max-width: 60ch; }
.etiqueta { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
section { display: grid; gap: .9rem; }
.tarjeta { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; }
.num { font-variant-numeric: tabular-nums; }

/* Avisos */
.avisos { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
.aviso { display: grid; grid-template-columns: 4px 1fr; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.aviso::before { content: ""; background: var(--muted); }
.aviso[data-nivel="alto"]::before { background: var(--bad); }
.aviso[data-nivel="medio"]::before { background: var(--warn); }
.aviso > div { padding: .75rem 1rem; display: grid; gap: .2rem; min-width: 0; }
.aviso .titulo { font-weight: 600; }
.aviso .det { color: var(--muted); font-size: .92rem; }

/* Plazos */
.plazos { list-style: none; margin: 0; padding: 0; }
.plazo { display: grid; grid-template-columns: 6.5rem 1fr auto; gap: .25rem 1rem; align-items: baseline; padding: .7rem 1rem; border-top: 1px solid var(--line); }
.plazo:first-child { border-top: 0; }
.plazo .fecha { font-weight: 600; }
.plazo .cuando { font-size: .85rem; color: var(--muted); grid-column: 1; }
.plazo .que { grid-column: 2; grid-row: 1 / span 2; min-width: 0; }
.plazo .quien { color: var(--muted); font-size: .88rem; }
.plazo[data-estado="presentado"] { color: var(--muted); }
.plazo[data-estado="presentado"] .fecha { text-decoration: line-through; font-weight: 400; }
.pill { display: inline-block; font-size: .75rem; font-weight: 600; padding: .1rem .55rem; border-radius: 999px; white-space: nowrap; background: var(--accent-soft); color: var(--accent); }
.pill.ok { background: var(--ok-soft); color: var(--ok); }
.pill.warn { background: var(--warn-soft); color: var(--warn); }
.pill.bad { background: var(--bad-soft); color: var(--bad); }
.pill.gris { background: transparent; color: var(--muted); border: 1px solid var(--line); }

/* Tablas */
.desliza { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: .65rem 1rem; border-top: 1px solid var(--line); vertical-align: top; }
thead th { border-top: 0; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
td .nota { color: var(--muted); font-size: .88rem; display: block; margin-top: .25rem; max-width: 46ch; }

/* Cifras */
.cifras { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 10.5rem), 1fr)); gap: .75rem; }
.cifra { padding: 1rem; display: grid; gap: .2rem; }
.cifra .valor { font-family: var(--display); font-size: 1.9rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
.cifra .sub { color: var(--muted); font-size: .85rem; }
.grafico { padding: 1rem; display: grid; gap: .5rem; }
.grafico svg { width: 100%; height: auto; display: block; }
.grafico text { fill: var(--muted); font: 12px var(--text); }
.leyenda { display: flex; gap: 1rem; flex-wrap: wrap; font-size: .85rem; color: var(--muted); }
.leyenda i { display: inline-block; width: .7rem; height: .7rem; border-radius: 2px; margin-right: .35rem; vertical-align: -1px; }

/* Previsiones */
.prev { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: .75rem; }
.prev .tarjeta { padding: 1rem; display: grid; gap: .3rem; align-content: start; }
.prev .importe { font-family: var(--display); font-size: 1.5rem; font-variant-numeric: tabular-nums; }
.prev .importe.pagar { color: var(--bad); }
.prev .importe.cobrar { color: var(--ok); }
.prev .nota { color: var(--muted); font-size: .88rem; }
/* Renta y ahorro */
.renta { padding: 1rem; display: grid; gap: 1rem; }
.renta-cab { display: grid; gap: .2rem; }
.renta .valor { font-family: var(--display); font-size: 1.9rem; line-height: 1.1; font-variant-numeric: tabular-nums; }
.renta .valor.pagar { color: var(--bad); }
.renta .valor.cobrar { color: var(--ok); }
.renta .sub { color: var(--muted); font-size: .88rem; }
.limite { display: grid; gap: .35rem; }
.limite-txt { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; font-size: .88rem; font-variant-numeric: tabular-nums; }
.barra { height: .6rem; border-radius: 999px; background: var(--line); overflow: hidden; }
.barra span { display: block; height: 100%; border-radius: 999px; background: var(--accent); }
.barra span.justo { background: var(--warn); }
.renta details { font-size: .9rem; color: var(--muted); }
.renta summary { cursor: pointer; color: var(--fg); }
.renta details ul { margin: .5rem 0 0; padding-left: 1.1rem; display: grid; gap: .3rem; }
.recs { list-style: none; margin: 0; padding: 0; display: grid; gap: .6rem; }
.rec { padding: .85rem 1rem; display: grid; gap: .35rem; }
.rec-cab { display: flex; gap: .6rem; align-items: baseline; flex-wrap: wrap; }
.rec p { margin: 0; color: var(--muted); font-size: .92rem; max-width: 75ch; }
a { color: var(--accent); }
a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
footer { color: var(--muted); font-size: .82rem; border-top: 1px solid var(--line); padding-top: 1rem; }

@media (max-width: 34rem) {
  .plazo { grid-template-columns: 1fr auto; }
  .plazo .que { grid-column: 1 / -1; grid-row: auto; }
  .plazo .cuando { grid-column: 1; }
  h1 { font-size: 1.6rem; }
}
</style>
</head>
${cuerpo(datos, meta)}`;
}
