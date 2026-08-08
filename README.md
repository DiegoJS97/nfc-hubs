# NFC Hubs — Fase 1

Páginas «hub» activadas por NFC para locales de hostelería. Cada mesa lleva una etiqueta física;
al acercar el móvil se abre una lista corta de enlaces útiles de ese local. Salida estática pura,
sin backend.

Hay **un solo arquetipo genérico**, no uno por tipo de negocio. El motor soporta un catálogo de
tipos de entrada, y cada instancia de negocio elige cuáles usa y en qué orden, en sus propios
datos.

| Hub | URL local | En producción | Registro visual |
|-----|-----------|---------------|-----------------|
| `demo` — [ES] «Taberna Vela y Sal» | `/demo/` | <https://diegojs97.github.io/nfc-hubs/demo/> | nocturno |

`demo` es un local **ficticio**, creado para poder enseñar el producto a un cliente potencial.
No es un cliente real y sus datos están inventados a propósito.

Los requisitos viven en [`specs/001-nfc-hubs-fase1/`](specs/001-nfc-hubs-fase1/) y en
[`.specify/memory/constitution.md`](.specify/memory/constitution.md). Este fichero cubre cómo
ejecutar el proyecto y, sobre todo, cómo sustituir los datos marcados como pendientes por
valores reales.

## Puesta en marcha

Requiere **Node 24 LTS** (fijado en `.nvmrc`).

```bash
npm install
npx playwright install chromium webkit   # solo hace falta para ejecutar los tests
npm run dev                              # http://localhost:8080/demo/
```

## Sustituir datos pendientes por datos reales

**Este es todo el flujo de mantenimiento.** Poner valores reales significa editar un fichero por
negocio y nada más:

```
src/businesses/demo/business.json
```

Nunca se toca una plantilla, una hoja de estilos ni código para confirmar datos reales.

### El centinela

Todo valor que el dueño del local aún no ha confirmado contiene exactamente esta cadena:

```
[PLACEHOLDER - replace]
```

Sustituir la cadena por el valor real es toda la operación:

```diff
- { "id": "menu", "label": "Carta", "type": "link", "url": "[PLACEHOLDER - replace]" }
+ { "id": "menu", "label": "Carta", "type": "link", "url": "https://ejemplo.es/carta" }
```

Se reconstruye y esa entrada pasa de ser un botón que no navega y muestra
[ES] *«Pendiente de confirmar»* a ser un enlace real. Todo lo que siga con el centinela sigue
mostrando el aviso, así que a un cliente nunca se le manda a un destino muerto o equivocado.

**El centinela tiene que ser exacto.** Un espacio de más, o un sustituto amable tipo
`"Taberna (nombre pendiente)"`, se lee como *valor confirmado* — y se le enseñaría al cliente
como si fuera real. La compilación rechaza los casi-aciertos, pero no puede detectar una cadena
inventada completamente distinta. Esto vale también para `name`.

### Qué queda pendiente

```bash
npm run audit:placeholders            # lista cada valor sin confirmar y dónde está
npm run audit:placeholders -- --strict # sale con código ≠ 0 si queda alguno (control previo al lanzamiento)
```

Ahora mismo quedan **3**, todos en `demo`, y **están así a propósito**:

| Valor | Por qué sigue siendo el centinela |
|---|---|
| `placeId` | Un place ID real haría que «Reseña Google» dejara una reseña en un local ajeno, y que «Cómo llegar» llevara al cliente potencial a otra ciudad |
| `contact.phone` | España no reserva ningún rango de números ficticios: cualquier `+34` verosímil puede ser de una persona real |
| `entries[2].url` (el enlace provisional de «Cómo llegar») | Llevaba el mismo place ID una segunda vez |

Tres entradas pendientes en una demo es honesto, y además sirve de demostración en vivo del
estado «pendiente» — una función que, si no, el cliente potencial tendría que creerse sin verla.
No hay que «terminarlas».

### Reglas que importan

- **Nunca renombrar un `id`.** Los ids de entrada (`menu`, `reserve`, `review`, …) se convierten
  en los segmentos de ruta `/r/<id>` de la analítica de la Fase 2. Renombrar uno hoy es gratis y
  rompe en silencio la atribución de taps una vez que las etiquetas están puestas en las mesas.
  Ver [`contracts/hub-url.md`](specs/001-nfc-hubs-fase1/contracts/hub-url.md).
- **Añadir, quitar o reordenar entradas SÍ está permitido.** Es un cambio de datos, no de
  especificación (FR-018). El orden del array *es* el orden de prioridad que ve el cliente. Lo
  que sí es un cambio de especificación es añadir un **tipo** nuevo al catálogo (FR-016).
- **Nunca añadir una contraseña de WiFi.** Solo se muestra el *nombre* de la red, como texto
  inerte. La conexión real la resuelve el registro NDEF «Wi-Fi Simple Config» de la propia
  etiqueta, escrito al programarla — no este sitio.
- **La tarjeta de contacto es todo o nada.** [ES] «Guardar contacto» genera una vCard solo
  cuando `name`, `phone`, `address` y `website` están *todos* confirmados. Hasta entonces
  muestra el aviso de pendiente y no genera nada, en vez de guardar un contacto a medias en el
  móvil de alguien.

### El catálogo de tipos de entrada

Un negocio elige de esta lista. Añadir un tipo nuevo es un cambio de especificación (FR-016).

| Tipo | Destino | Se confirma cuando |
|---|---|---|
| `link` | la `url` de esa misma entrada | `url` no es el centinela |
| `review` | reseña de Google (writereview), a partir de `placeId` | `placeId` no es el centinela |
| `maps` | ficha del negocio en Google Maps, a partir del mismo `placeId` | `placeId` no es el centinela |
| `tel` | URI `tel:` a partir de `contact.phone` | `contact.phone` no es el centinela |
| `wifi` | ninguno — texto informativo inerte | `wifiSsid` no es el centinela |
| `vcard` | acción local del navegador | los cuatro valores de contacto están confirmados |

`maps` es deliberadamente un enlace normal a la ficha del sitio. Ninguna API web añade un lugar
a la lista de guardados de Google de nadie, así que el hub no puede dar a entender que lo hace.

El módulo de vCard es **opcional**: un hub lo tiene exactamente cuando sus datos declaran una
entrada `vcard`, y un hub sin ella no descarga nada de ese código. `demo` no la declara.

### Qué se niega a aceptar la compilación

`npm run build` falla, nombrando el campo culpable, ante:

- una clave obligatoria que falta
- una cadena vacía o `null` (usa el centinela en su lugar)
- un casi-centinela, por ejemplo con un espacio final
- una `slug` que no coincide con el nombre de su carpeta
- una entrada `tel` o `vcard` en un negocio sin bloque `contact`

Es deliberado: una errata que marcara en silencio una entrada como «confirmada» mandaría a los
clientes a `undefined`.

## Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo de Eleventy con recarga en vivo |
| `npm run build` | Compila a `_site/` |
| `npm run serve` | Sirve el `_site/` compilado (lo que usan los tests) |
| `npm test` | Validación + E2E + accesibilidad + presupuesto + rebuild |
| `npm run test:validation` | Casos de rechazo del contrato de datos, tipos de entrada, ruta base |
| `npm run test:e2e` | Orden de entradas, comportamiento pendiente, WiFi inerte, vCard, `?m=` |
| `npm run test:a11y` | WCAG 2.2 AA con axe |
| `npm run test:budget` | Carga ≤100 KB, sin peticiones a terceros, tiempos |
| `npm run test:rebuild` | Los dos tests que reescriben `business.json` y recompilan |
| `npm run audit:placeholders` | Lista los valores sin confirmar |

Ejecutar un fichero o un test concreto:

```bash
npx playwright test tests/e2e/demo.spec.ts
npx playwright test -g "SC-001"
```

Los tests corren solo en dos dispositivos emulados (iPhone/WebKit, Pixel/Chromium). No hay
viewport de escritorio: tras un tap, el tráfico es 100% móvil.

**`tests/rebuild/` va aparte y con `--workers=1` a propósito.** Esos dos tests reescriben
`business.json` y recompilan `_site/` mientras el resto de la suite lee ambas cosas. En paralelo
compiten, y el síntoma es un fallo cuyo valor *esperado* es el centinela. Si mueves un test a esa
carpeta, acuérdate de que cada script filtra por ruta: moverlo sin engancharlo a `test:rebuild`
dejaría la suite en verde mientras el test deja de ejecutarse.

## El parámetro de mesa

Las etiquetas codifican `https://<host>/<slug>/?m=<mesa>`. La Fase 1 **ignora** `m` por completo:
no se lee, ni se muestra, ni se guarda, ni se transmite. Existe en la URL para que la Fase 2
pueda atribuir un tap a su mesa sin que nadie tenga que reescribir físicamente las etiquetas.

## Despliegue

**En producción:** <https://diegojs97.github.io/nfc-hubs/demo/> — HTTPS forzado.

`.github/workflows/deploy.yml` compila con Eleventy, ejecuta la suite completa como control de
publicación y despliega `_site/` en GitHub Pages en cada push a `master`.

### La ruta base

Una *project page* de GitHub se sirve desde `https://<usuario>.github.io/<repo>/`, no desde la
raíz del host. Como todas las referencias a assets del layout son absolutas, sin prefijo el sitio
desplegado cargaría el HTML y luego daría 404 en `base.css`, `theme.css` y `pending.js`: una
página sin estilos y sin comportamiento de pendiente, invisible en cualquier prueba local servida
desde la raíz.

`scripts/lib/path-prefix.mjs` contiene `PATH_PREFIX = "/nfc-hubs/"`. Una constante, dos
consumidores: `eleventy.config.js` se la pasa al filtro `url`, y `scripts/serve-static.mjs` la
quita, de modo que la suite pide los assets en sus URLs reales de producción.

> ⚠ **`PATH_PREFIX` está atado al nombre del repositorio.** Renombrarlo, mudarse a un repo de
> Pages de usuario/organización o poner un dominio propio cambian ese valor (en los dos últimos
> casos pasa a ser `/`). El workflow lo compara con el nombre real del repositorio y falla en
> alto — es la única comprobación que solo CI puede hacer, porque en local el prefijo es cierto
> por definición: el compilador y el servidor de tests leen la misma constante.

### Antes de escribir una sola etiqueta

> ⚠ **Fija el host de producción definitivo antes de escribir ninguna etiqueta NFC.** La
> etiqueta codifica la URL completa, y volver a grabarlas es trabajo manual, mesa por mesa, fuera
> de este proyecto. Añadir un dominio propio después de haberlas escrito las invalida todas.
> Desplegar es reversible; grabar etiquetas no lo es — se puede desplegar a una URL temporal para
> pruebas de dispositivo, siempre que no se escriba ninguna etiqueta de local contra ella.

`wrangler.toml` sigue en el árbol sin tocar. Cloudflare Pages continúa siendo la candidata para
la fase que necesite un redirector `/r/<entry-id>` en servidor, que GitHub Pages no puede
ejecutar. Es una decisión de Fase 2, no de ahora.

## Verificación que no se puede automatizar

Algunas comprobaciones requieren hardware real y no las cubre la suite (T039): importación de
vCard en iOS Safari, importación en Android Chrome, leer el hub nocturno en una habitación a
oscuras, y un tap NFC real con el móvil bloqueado y desbloqueado. Las comprobaciones automáticas
de contraste solo evalúan colores *declarados*, y un WebKit emulado no dice nada sobre si iOS
abre el importador de contactos. El procedimiento está en
[`docs/t039-device-checks.md`](docs/t039-device-checks.md).
