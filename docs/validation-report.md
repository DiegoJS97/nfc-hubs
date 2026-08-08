# Informe de validación de la Fase 1 (T040)

**Fecha:** 2026-08-08
**Suite:** 80 comprobaciones automáticas definidas — **75 pasan, 5 saltadas deliberadamente**, 0 fallando
**Compilación:** `_site/demo/index.html`
**En vivo:** <https://diegojs97.github.io/nfc-hubs/demo/>
**Valores pendientes:** 3, todos en `demo` y todos deliberados

Esta es la pasada de validación de `quickstart.md`. Registra el estado de cada criterio de éxito
SC-001…SC-010, incluidos los que **todavía no pueden pasar** y por qué.

> **Contra qué se valida.** Este informe se reescribió después del cambio de arquetipo
> (`docs/pivot-summary.md`). La versión anterior validaba contra los antiguos FR-016 y FR-018, que
> mandaban dos secuencias de entradas con nombre propio; el commit `4cd2737` los sustituyó por un
> catálogo de tipos y por «cada instancia elige». Un informe que siga citando los requisitos
> viejos no está validando el producto, está validando un contrato que ya no existe.

> **T040 sigue sin estar completo.** Seis de diez criterios pasan del todo. SC-003 pasa ya, cosa
> que antes no ocurría. Los otros tres no se pueden cerrar desde esta máquina: dependen de
> hardware real o de una segunda instancia configurada. Se listan como PARCIAL con la dependencia
> concreta, en vez de darse por verdes con evidencia a medias.

## Resumen

| Criterio | Estado | Bloqueado por |
|-----------|--------|---------------|
| SC-001 orden de entradas | ✅ PASA | — |
| SC-002 comportamiento pendiente | ✅ PASA | — |
| SC-003 estático sobre HTTPS | ✅ PASA | — *(cerrado con el despliegue)* |
| SC-004 sustitución solo de datos | ✅ PASA | — |
| SC-005 identidad visual propia | ⚠️ PARCIAL | el tema de un cliente real + una segunda instancia |
| SC-006 vCard en sus dos estados | ⚠️ PARCIAL | ningún negocio declara `vcard`; importación real (T039) |
| SC-007 sin WiFi/contadores/apps | ✅ PASA | — |
| SC-008 peso y tiempos | ⚠️ PARCIAL | los tiempos en iOS no son medibles (ver abajo) |
| SC-009 render idéntico con `?m=` | ✅ PASA | — |
| SC-010 WCAG 2.2 AA | ⚠️ PARCIAL | percepción con poca luz (T039) |

## Detalle

### ✅ SC-001 — El hub muestra todas sus entradas en el orden que definen sus datos

`tests/e2e/demo.spec.ts` comprueba la secuencia de etiquetas renderizada contra la lista que
declara `business.json`, en los dos dispositivos emulados, y verifica por separado que el orden de
ids del array es el orden que sale en la página — nada ordena ni filtra.

**Qué cambió respecto al informe anterior.** Antes esto se afirmaba contra una secuencia mandada
por la especificación (7 entradas en `copas`, 8 en `tapas`) y `validate.js` la imponía en tiempo
de compilación. Ahora la secuencia es un dato del negocio (FR-018), así que el test afirma lo que
ve un cliente de *este* local y deliberadamente **no** afirma una secuencia que otro negocio deba
copiar. La comprobación de orden de `validate.js` sigue viva y sigue probada, pero contra
`tests/fixtures/`, no contra un negocio real.

### ✅ SC-002 — Toda entrada sin confirmar muestra el aviso y no navega nunca

`tests/e2e/demo.spec.ts` toca cada control `[data-pending]`, comprueba que la URL no cambia y que
el aviso se hace visible. El recuento se afirma explícitamente (2 entradas: [ES] «Cómo llegar» y
[ES] «Reseña Google»), de modo que la comprobación no puede pasar contra un conjunto vacío.

Además se afirma que la cadena `PLACEHOLDER` no aparece en ningún sitio del texto renderizado, y
que ningún `href` de la página resuelve a un destino de Google Maps o de reseñas mientras el
`placeId` siga sin confirmar. Ese segundo test es el guardián directo del fallo del que trata el
Principio VII de la constitución: una demo apuntando al negocio de otro.

### ✅ SC-003 — Desplegable como contenido estático sobre HTTPS sin componente de servidor

**Cerrado. Era el único ⛔ del informe anterior.**

El sitio está en vivo en <https://diegojs97.github.io/nfc-hubs/demo/>, con HTTPS forzado,
desplegado por `.github/workflows/deploy.yml` desde `master`. No hay ningún proceso de aplicación:
GitHub Pages sirve ficheros.

Lo que verifica la suite: `npm run build` emite ficheros planos, y los tests corren contra esos
ficheros servidos por un servidor estático sin proceso de aplicación.

Lo que verificó el despliegue y la suite local no podía: que la compilación pasa entera en un
Ubuntu limpio y no solo en la máquina de desarrollo, y que la **ruta base** coincide con el
nombre real del repositorio. Ese segundo punto merece su propio párrafo.

#### La ruta base, y por qué necesitó una comprobación aparte

Una *project page* de GitHub se sirve desde `https://<usuario>.github.io/<repo>/`. Las referencias
a assets del layout eran absolutas, así que los hubs desplegados habrían cargado su HTML y luego
dado 404 en `base.css`, `theme.css` y `pending.js` — sin estilos, sin comportamiento de pendiente,
y **invisible en cualquier prueba local servida desde la raíz**.

`tests/validation/path-prefix.spec.ts` afirma las dos mitades: que toda referencia de primera
parte lleva el prefijo (detecta un `| url` que se cayó), y que cada una corresponde a un fichero
presente en `_site/` (detecta un prefijo puesto pero equivocado).

Lo que esa prueba **no** puede saber es si el prefijo coincide con el nombre real del repositorio:
en local es cierto por definición, porque el compilador y el servidor de tests leen la misma
constante. Eso lo comprueba un paso del workflow contra
`github.event.repository.name`, y es la única comprobación que solo CI puede hacer.

### ✅ SC-004 — Sustituir un dato pendiente no toca ningún fichero de estructura ni de estilos

`tests/rebuild/data-swap.spec.ts` sustituye un valor por uno confirmado, recompila y comprueba que
la entrada pasa a ser un enlace real con su aviso desaparecido — y luego restaura el centinela y
comprueba que el estado pendiente vuelve exactamente. En ninguna de las dos direcciones se toca
una plantilla, una hoja de estilos ni un fichero del motor.

`tests/rebuild/phase2-seam.spec.ts` prueba además que ningún destino está incrustado en el código,
por rastreo y no por inspección: todo `url` de la salida compilada tiene que poder trazarse hasta
`business.json`.

> **Nota sobre T038.** `resolve.js` contiene ahora **dos** plantillas de URL externas, no una: la
> base de writereview de Google y la base de la ficha de Google Maps. Ambas existen porque el
> esquema prohíbe una clave `url` en las entradas `review` y `maps`; la parte que identifica al
> negocio (`placeId`) sigue siendo un dato. La lista de excepciones del test es explícita y tiene
> exactamente dos elementos. Añadir una tercera debe seguir siendo un acto deliberado y visible en
> revisión.

> **Nota sobre el aislamiento.** Estos dos tests están en `tests/rebuild/` y corren los últimos y
> con `--workers=1`. Reescriben `business.json` y recompilan `_site/` mientras el resto de la
> suite lee ambas cosas; en paralelo compiten. La carrera existía desde antes del cambio de
> arquetipo pero el campo mutado nunca se afirmaba, así que era invisible. Pasó dos veces antes de
> fallar, que es peor que fallar en seco.

### ⚠️ SC-005 — Un hub se lee como la página de ese local y no como un resultado por defecto

**Parcial, y este criterio se ha debilitado de forma real con el cambio de arquetipo.**

El criterio tenía dos mitades. La segunda — que un usuario comparando dos hubs los identifique
como negocios distintos y no como la misma plantilla recoloreada — **no es comprobable hoy**: solo
hay una instancia configurada, así que no hay nada que comparar. La propia especificación lo dice
ahora explícitamente, en vez de dejar el criterio como si siguiera entero.

De la primera mitad — que el hub no parezca generado por defecto — hay evidencia automática de que
carga su propio tema y su propio registro visual, pero *que una persona lo perciba así* no lo
puede zanjar ningún test.

**Esa mitad tampoco está ya en T039.** Se retiró al reordenar las comprobaciones por prioridad: el
tema de la demo es una instancia de ejemplo del sistema de temas (`base.css` pone la estructura y
el suelo de accesibilidad; `theme.css` solo el color y la tipografía), así que juzgar «identidad
propia» sobre la paleta de un local ficticio no dice nada útil sobre el producto. El criterio
entero queda aplazado hasta que exista el tema de un cliente real — que es también el momento en
que su mitad comparativa vuelve a tener sentido.

### ⚠️ SC-006 — La vCard se produce solo cuando los cuatro valores están confirmados

**Parcial, y también más débil que antes, por una razón distinta.**

Verificado: el generador tal y como se publica en `src/_engine/vcard.js` produce una vCard 3.0 con
los cuatro valores, con finales de línea CRLF y escapado RFC 2426 de `,` `;` `\`, sin ninguna
petición de red, en los dos motores emulados. También está verificado el **seam de carga**: un hub
descarga `/_engine/vcard.js` si y solo si sus datos declaran una entrada `vcard`, derivado de los
datos de cada negocio y no de un nombre de negocio concreto.

No verificado, y este es el hueco nuevo: **ningún negocio del repositorio declara hoy una entrada
`vcard`**, así que la rama confirmada de `entry-vcard.njk` no tiene ningún negocio que la
renderice. `tests/e2e/vcard-module.spec.ts` cubre el generador cargando el módulo publicado sobre
la página de la demo y disparándolo con un botón inyectado, y deja escrito ese límite en el propio
fichero.

No verificado tampoco, como antes: **si iOS Safari abre realmente el importador de contactos.**
Esta es la suposición frágil conocida (research.md D5). Un WebKit emulado ejercita el Blob y el
atributo `download`; no ejercita cómo trata iOS el fichero resultante. Va a T039, que ahora
requiere activar temporalmente una entrada `vcard` con datos de prueba.

### ✅ SC-007 — Sin mecanismo de conexión WiFi, sin contadores de visitas, sin enlaces a apps

El WiFi se renderiza como un `<div>` sin `<a>`, sin `<button>`, sin `role` y sin `tabindex`.
`localStorage`, `sessionStorage` y `document.cookie` se afirman vacíos tras la carga. Toda petición
se afirma de primera parte, así que ningún beacon ni contador puede estar llegando a ninguna
parte.

### ⚠️ SC-008 — ≤100 KB de peso; contenido esencial ≤1,5 s en 4G y ≤3 s degradado

**Parcial — se cumple con holgura en Chromium; no es medible en WebKit.**

| | peso | 4G típico | degradado |
|---|---|---|---|
| demo | 10 389 B (10,1 KB) | 286 ms | 577 ms |
| presupuesto | 100 KB | 1500 ms | 3000 ms |

Desglose del peso: `/demo/` 2509 B, `base.css` 4507 B, `theme.css` 2057 B, `pending.js` 1316 B.
No se descarga `vcard.js`, porque la demo no declara esa entrada — el seam de carga es visible
directamente en la medición.

El peso y las afirmaciones de primera parte corren en los dos motores. **Los tiempos corren solo
en Chromium**: el estrangulamiento de red requiere CDP, que WebKit no expone. Los tiempos de carga
en iOS sobre la conexión degradada de un local siguen sin verificarse — es un hueco de cobertura
real, y va con T039.

### ✅ SC-009 — Render idéntico con `?m=`, sin él, vacío y con un valor desconocido

`tests/e2e/table-param.spec.ts` compara el `innerHTML` de `<main>` entre las cuatro variantes y
afirma igualdad byte a byte, además de que un token improbable pasado como `?m=` no aparece nunca
en el texto renderizado y de que no se persiste nada en el cliente.

### ⚠️ SC-010 — WCAG 2.2 AA sin fallos de contraste ni de tamaño de objetivo

**Parcial — las comprobaciones automáticas están limpias; falta la comprobación perceptiva.**

Verificado: axe reporta cero violaciones en `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y
`wcag22aa` sobre el hub en su registro nocturno. `color-contrast` y `target-size` se afirman
además como *efectivamente evaluadas*, ya que un id de regla desconocido daría cero violaciones y
pasaría sin haber comprobado nada. También se afirma que el estado pendiente sobrevive sin color.

No verificado: axe evalúa colores **declarados**. No puede decir si el registro nocturno resulta
cómodo de leer en un móvil real en una habitación a oscuras, que es exactamente el escenario al
que empuja FR-015 (research.md D8). T039.

## Qué falta para cerrar T040

1. **Completar T039** en hardware real — ver [`t039-device-checks.md`](./t039-device-checks.md).
   Cierra las mitades pendientes de SC-006, SC-008 y SC-010. Ahora requiere activar temporalmente
   una entrada `vcard` con datos de prueba, porque ningún negocio declara una. Sus cuatro
   comprobaciones están priorizadas: la 1 (vCard en iOS) es la única que puede cambiar el plan, y
   la 4 (tap NFC) ya está prácticamente cerrada en Android, con la lectura en pantalla bloqueada
   anotada como restricción de plataforma y no como defecto.
2. **Conseguir el tema de un cliente real y configurar una segunda instancia.** Es lo que devuelve
   a SC-005 ambas mitades, y lo que hace que la comprobación 3 de T039 evalúe una paleta que
   alguien vaya a usar de verdad. Hasta entonces SC-005 está declarado como no comprobable, no
   como aprobado.
3. **Conseguir un local real** y sus datos. No es un criterio en sí mismo, pero mientras tanto lo
   único que existe es una demo ficticia, y los tres valores centinela que quedan seguirán —
   correctamente — sin confirmar.

Solo después de eso una pasada completa de `quickstart.md` significará lo que dice.

## Cómo reproducir estos números

```bash
npm run build && npm test        # 75 pasan, 5 saltadas
npm run audit:placeholders       # 3 pendientes: placeId, contact.phone, la url provisional de maps
```

Las cifras de peso y tiempo las imprime `npm run test:budget` por consola en cada pasada; las de
este informe salen de la ejecución del 2026-08-08 sobre el árbol limpio.
