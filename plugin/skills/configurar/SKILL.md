---
name: configurar
description: "Prepara ábaco para alguien nuevo: autónomo o solo asalariado. Hace las preguntas imprescindibles, crea el perfil y la estructura de carpetas, y propone las revisiones periódicas. Úsalo cuando alguien instale ábaco, diga \"configura ábaco\" (o \"abaco\"), \"empezar con ábaco\" o cuando estructura_carpeta indique que falta el perfil."
---

# Configurar ábaco

ábaco es un segundo check fiscal. Para autónomos en **estimación directa con IVA general** recalcula el 303, el 130 y el 349 y los compara con lo que presenta la gestoría; para todos (también quien solo tiene nómina) estima la Renta, propone ahorros y cruza el perfil con ayudas. No sustituye al asesor ni presenta nada: calcula, compara y avisa. Dilo al principio en una frase.

## Principio: solo lo imprescindible

Pregunta solo lo que cambia un cálculo. **No pidas** nombre completo, NIF, DNI, fecha de nacimiento exacta, dirección, empresa ni planes personales: ábaco no los usa. Si el usuario los da, no los guardes. Prefiere preguntas de sí/no con opciones y pide un importe solo cuando la respuesta es «sí». Lo que se pueda leer de los documentos (nóminas, facturas) no se pregunta.

## 1. Comprobar la carpeta

Llama a `estructura_carpeta`. Si da error porque falta la carpeta, explica que se configura al activar el plugin (opción «Carpeta del autónomo», que sirve igual para un asalariado) y para.

## 2. Preguntas para todos (una sola tanda, con opciones)

1. **¿Eres autónomo o solo asalariado?** Autónomo (con o sin nómina además) → `tipo: "autonomo"`. Solo asalariado (trabaja por cuenta ajena, sin actividad económica) → `tipo: "asalariado"`. Si duda: si no está dado de alta en Hacienda como autónomo (modelo 036/037) ni paga el RETA, es solo asalariado.
2. **¿Vives en Andalucía?** Sí → `ccaa: "andalucia"`. No → explica que de momento solo hay parámetros de Andalucía y que la estimación de la Renta no saldrá; guarda su comunidad en minúsculas sin tildes (p. ej. `"madrid"`).
3. **¿En qué año naciste?** → `añoNacimiento`. Sirve solo para los requisitos de edad (menos de 35 años).
4. **¿Vives de alquiler? ¿Cuánto pagas tú al mes?** (tu parte, si es compartido) → `alquilerMensual`; si no, no lo pongas.
5. **¿Tienes hijos, mayores a tu cargo o alguna discapacidad reconocida?** Sí/no → `circunstanciasFamiliares`. No preguntes detalles: la estimación aún no los calcula y el panel lo avisará.
6. **¿Este año has vendido acciones, fondos o cripto, o aportas a un plan de pensiones?** Solo si dice que sí a cada cosa, pide el importe aproximado: ganancia neta → `gananciasAhorro`; aportación del año → `aportacionPlanPensiones`.
7. **¿Cómo quieres que te llame en el panel?** (opcional) → `nombre`. Un nombre de pila o un apodo basta.

## 3. Preguntas solo para autónomos

1. **Régimen**: confirma estimación directa (normal o simplificada) e IVA general. Si es módulos, recargo de equivalencia o franquiciado, explica que ábaco aún no cubre sus trimestres; puede usarlo para la Renta si además tiene nómina, pero sin las cifras de la actividad.
2. **Cuota mensual del RETA** → `cuotaReta`. Si tiene a mano un recibo de autónomos, léelo en lugar de preguntar.
3. **¿Trabajas desde casa?** Si sí: «¿cuántos m² tiene el despacho y cuántos la casa?». Calcula tú `suministros.afectacion` = m² despacho / m² totales. Si no: `suministros: { afectacion: 0 }`.
4. **Teléfono e internet**: opciones «solo para trabajar» (`afectacionTelefonia: 1`), «mitad y mitad» (`0.5`) u otro porcentaje.
5. **Gestoría**: cómo se llama y si su servicio incluye la Renta → `gestoria: { nombre, incluyeRenta }`.
6. **Bienes de años anteriores**: «¿compraste en años anteriores algún equipo de más de 300 € que sigas amortizando?» (descripción, fecha, valor sin IVA; coeficiente habitual 26 % para equipos informáticos) → `bienesInversion`. Los de este año los detecta la revisión trimestral en las facturas.

Un asalariado sin gestoría no necesita `gestoria`: el panel pone «Tú» como responsable de la Renta. Si alguien le hace la Renta, guárdalo así: `gestoria: { nombre, incluyeRenta: true }`.

## 4. Guardar el perfil

Llama a `esquema_perfil` para ver los campos, construye el objeto con las respuestas (todos los datos de la Renta van dentro de `personal`) y guárdalo con `guardar_perfil`. Un asalariado no necesita `cuotaReta` ni `suministros`. Repite solo los campos que fallen.

## 5. Ordenar la carpeta

- **Nóminas**: dile que las deje en PDF en `Nóminas/<año>/` (p. ej. `Nóminas/2026/`). No preguntes por la carpeta; si ya las tiene en otra, guarda esa ruta en `personal.carpetaNominas`. ábaco solo lee los importes; el resto de la nómina no sale de su ordenador.
- **Autónomo**: explica la estructura de facturas y declaraciones que espera ábaco (te la da `estructura_carpeta` en `convenciones`) y ofrece mover los documentos que ya tenga. Lo nuevo sin revisar va a `_Entrada/`.
- No borres nada.

## 6. Primera comprobación

- Autónomo: si hay un trimestre con modelos presentados, ofrece hacer la primera comprobación con la skill `revision-trimestral`.
- Asalariado: llama a `analizar_renta` y a `generar_panel`, y cuéntale el resultado estimado y los supuestos. Si ya presentó la Renta del año pasado y tiene sus nóminas, ofrece estimarla también y compararla con lo que presentó: es la mejor forma de comprobar que ábaco acierta.

## 7. Revisiones periódicas

Propón tareas programadas, si el entorno las permite (en la app de escritorio de Claude: «Programadas»):

- Autónomo, **semanal** (lunes): procesar la bandeja, regenerar el panel con `generar_panel` y avisar de plazos de los próximos 7 días.
- Todos, **mensual** (día 5): `analizar_renta` (con la nómina nueva), buscar ayudas y novedades en fuentes oficiales y actualizar `_autogestor/seguimiento.json`. Para un asalariado basta con esta.

Créalas solo si el usuario dice que sí. Explica que solo se ejecutan con la app abierta.

## Reglas

- Los datos fiscales se quedan en el ordenador del usuario: no los subas a ningún servicio, artifact ni web.
- Toda afirmación legal o fiscal se valida con fuentes oficiales (BOE, sede de la AEAT, Seguridad Social, boletín de la comunidad) y se enlaza.
- ábaco no es asesoramiento profesional: ante dudas de criterio, el usuario lo consulta con su gestoría.
