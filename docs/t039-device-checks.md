# T039 — Comprobaciones en dispositivo real

Cuatro comprobaciones que no se pueden automatizar. Cada una cubre una afirmación que la suite de
tests es estructuralmente incapaz de hacer: un WebKit emulado no es un iPhone, y axe no ve una
habitación a oscuras.

**Tiempo necesario:** ~30 minutos, más la grabación de la etiqueta.
**Hace falta:** un iPhone, un Android, una etiqueta NFC virgen, una app para grabar etiquetas
(NFC Tools o similar) y una habitación de verdad a oscuras.

Anota los resultados en la tabla del final y haz commit.

---

## Orden de prioridad

Las comprobaciones **mantienen su numeración original** (se referencian desde
`validation-report.md` y desde `tasks.md`), pero aparecen aquí en orden de importancia, no de
número:

| Prioridad | # | Comprobación | Estado hoy |
|---|---|---|---|
| 1.ª — **la crítica** | 1 | vCard en iOS Safari | Abierta. Único riesgo técnico de arquitectura |
| 2.ª | 4 | Tap NFC, bloqueado y desbloqueado | **Casi cerrada** en Android. Faltan detalles y el iPhone |
| 3.ª | 2 | vCard en Android Chrome | Abierta, pero es el caso históricamente fiable |
| 4.ª | 3 | Contraste nocturno a oscuras | Abierta, y de valor limitado hasta que haya un cliente real |

La comprobación 1 es la única que puede cambiar el plan del proyecto: es un riesgo de
**arquitectura**, independiente de qué cliente o qué tema acabe usando el sistema. Las demás o
pasan o producen una restricción documentada.

> **El orden de prioridad no es el orden de ejecución.** Las comprobaciones 1 y 2 comparten la
> misma preparación temporal, así que si vas a hacerlas las dos en una sentada sale más barato
> hacerlas seguidas, revertir, y luego ir a la 4 y la 3. La prioridad dice qué hacer si solo vas a
> hacer algunas, no en qué orden encadenarlas.

---

## Preparación

### 1. Dónde abrir el hub desde el móvil

Hay dos caminos, y **no son intercambiables**:

| Camino | URL | Sirve para |
|---|---|---|
| **Sitio en producción** *(preferido)* | <https://diegojs97.github.io/nfc-hubs/demo/> | Comprobaciones **4 y 3** |
| **Servidor local por LAN** *(alternativa)* | `http://<ip-de-esta-máquina>:8080/demo/` | Comprobaciones **1 y 2**, y todo si estás sin conexión |

**Las comprobaciones 1 y 2 tienen que ir por LAN.** Necesitan datos de contacto de prueba
inventados (paso 2 de abajo), y esos datos **no pueden llegar nunca al sitio en producción**:
publicarlos exigiría hacer commit y push de datos inventados, que es exactamente lo que prohíbe el
Principio VII de la constitución.

Para el camino LAN:

```bash
npm run build
npm run serve            # escucha en todas las interfaces, puerto 8080
```

La dirección de esta máquina:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
```

Los dos dispositivos tienen que estar en la misma red, y el Firewall de Windows puede pedir
permiso para Node — dáselo para redes privadas.

> ⚠ **La LAN es HTTP, no HTTPS.** Si la comprobación 1 falla por LAN, **no concluyas todavía que
> el flujo de vCard está roto**: los navegadores restringen ciertos comportamientos fuera de un
> contexto seguro, y eso sería un falso negativo. Anótalo como «falla en HTTP, sin confirmar en
> HTTPS» y para. Reintentarlo en HTTPS es una decisión aparte, porque el sitio en producción no es
> una opción con datos inventados — habría que servirlos por TLS de otra forma (certificado local
> o túnel temporal) y eso conviene decidirlo a la vista del fallo, no de antemano.

El sitio en producción, en cambio, es HTTPS real y ya está desplegado, así que las comprobaciones
4 y 3 se hacen contra él sin ninguna preparación.

### 2. Datos de contacto temporales (solo para las comprobaciones 1 y 2)

**El hub `demo` no declara ninguna entrada `vcard`.** No es que esté pendiente: es que no existe,
porque el módulo de guardar contacto es opcional y esta instancia no lo activa (FR-017). Además su
teléfono sigue siendo el centinela. Para ejercitar el camino de la vCard hay que activar la
entrada y confirmar el teléfono temporalmente.

Edita `src/businesses/demo/business.json` y haz **dos** cambios.

**a) Confirma el teléfono y mete una coma y un punto y coma en la dirección**, para que la
comprobación ejercite también el escapado:

```diff
   "contact": {
-    "phone": "[PLACEHOLDER - replace]",
-    "address": "Calle del Ejemplo 12, 28013 Madrid",
+    "phone": "+34 600 000 000",
+    "address": "Calle del Ejemplo, 12; 2º izq, 28013 Madrid",
     "website": "https://example.com/"
   },
```

`name` y `website` ya están confirmados, así que con esto los cuatro valores que exige FR-020
quedan completos.

**b) Añade la entrada `vcard` al final del array `entries`:**

```diff
     { "id": "review", "label": "Reseña Google", "type": "review" },
-    { "id": "wifi", "label": "WiFi", "type": "wifi" }
+    { "id": "wifi", "label": "WiFi", "type": "wifi" },
+    { "id": "vcard", "label": "Guardar contacto", "type": "vcard" }
```

Una entrada `vcard` no lleva clave `url` — su destino no es un enlace, es una acción local del
navegador. El esquema la rechaza si se la pones.

Luego `npm run build` y reinicia `npm run serve`. El hub debe pasar de 6 entradas a 7, y la última
debe ser [ES] «Guardar contacto» **sin** distintivo de pendiente.

> ⚠ **Revierte en cuanto termines las comprobaciones que usan estos datos.** Los datos inventados
> no pueden llegar nunca a un commit (Principio VII), y menos aún a un push, que despliega
> automáticamente:
>
> ```bash
> git checkout src/businesses/demo/business.json && npm run build
> npm run audit:placeholders    # tiene que volver a decir 3
> git status                    # business.json no puede aparecer modificado
> ```

---

## Comprobación 1 — Importación de vCard en iOS Safari ⚠ PRIORIDAD MÁXIMA

Este es el único riesgo técnico sin resolver del proyecto (research.md D5), y es el único de esta
lista que es un riesgo **de arquitectura**: no depende del cliente, ni del tema, ni de qué
entradas elija un local. Si iOS no abre el importador de contactos, el módulo de guardar contacto
no funciona para nadie, hoy ni con un cliente real dentro de seis meses.

1. En el **iPhone**, abre **Safari** (no Chrome, no un navegador dentro de otra app) en
   `http://<dirección>:8080/demo/`
2. Comprueba que la última entrada pone [ES] **«Guardar contacto»** y que **no** muestra el
   distintivo de «Pendiente». Si sigue apareciendo, el paso de preparación no ha surtido efecto —
   recompila y recarga.
3. Tócala.

**PASA** si se cumple todo:

- iOS ofrece el fichero o abre Contactos directamente — ni una pestaña en blanco, ni un silencio
- aparece la pantalla de **«Añadir contacto»**, en Contactos
- los cuatro valores están presentes y correctos: nombre del negocio, teléfono, dirección y web
- la dirección se lee como **un solo campo** — `Calle del Ejemplo, 12; 2º izq, 28013 Madrid` — sin
  partirse entre campos ni cortarse en la coma
- no aparece ninguna barra invertida suelta en ningún campo

**Qué anotar si falla — de esto depende lo que pase después:**

| Síntoma | Qué significa |
|---|---|
| No pasa absolutamente nada | El flujo Blob/`download` no está soportado. **Este es el fallo D5.** |
| El fichero se descarga a Archivos pero Contactos no se abre | Soporte parcial; puede ser aceptable, es tu decisión |
| Contactos se abre pero faltan campos | Bug de generación en `vcard.js`, no una limitación de plataforma |
| La dirección se parte en la coma, o se ve `\,` | Bug de escapado RFC 2426 en `vcard.js` |

Anota también: **versión de iOS**, y si tocaste desde Safari directamente o desde un enlace abierto
dentro de otra app. Y recuerda la advertencia de HTTP de la preparación antes de dar por bueno un
fallo.

> ⚠ **Si falla del todo:** el plan B es un `.vcf` estático pre-generado servido como un enlace
> normal. Eso **contradice FR-020**, que exige generación en el navegador. Requiere una enmienda
> de la especificación, no una sustitución silenciosa (`contracts/vcard.md`). Reporta el fallo y
> para — que nadie cambie la implementación por lo bajo.

---

## Comprobación 4 — Tap NFC real, bloqueado y desbloqueado

**Estado: prácticamente resuelta en Android.** Probada por Diego sobre su propio dispositivo:

- **Desbloqueado: funciona.** El tap abre el hub.
- **Bloqueado: no dispara.** Esto es comportamiento de seguridad del sistema operativo y del
  fabricante, **no un defecto de este código**. Muchos Android no leen etiquetas con la pantalla
  apagada o bloqueada salvo que la lectura en pantalla de bloqueo esté activada, y algunos no lo
  permiten en absoluto. Este fichero ya lo tenía documentado como restricción conocida; queda
  registrado como tal.

Se anota, por tanto, como **pasa con restricción documentada** en Android. Lo que falta no es
repetir la prueba, sino tres datos:

1. Con el móvil bloqueado, **¿qué pasó exactamente?** ¿Absolutamente nada, o salió una
   notificación que no llegó a abrir el hub? Son dos cosas distintas: la primera es que el lector
   NFC está apagado con la pantalla bloqueada; la segunda es que el lector sí funciona y lo que
   falta es el permiso para abrir sin desbloquear.
2. **¿Está activada la lectura de NFC en la pantalla de bloqueo** en los ajustes del móvil? (Suele
   estar en Ajustes → Conexiones → NFC, con nombres tipo «Leer NFC con la pantalla bloqueada» o
   similar según el fabricante.) Si estaba desactivada, la restricción es de configuración y no de
   hardware, y eso cambia lo que se le puede decir a un cliente.
3. **Modelo y versión de Android**, para poder atribuir la restricción a algo concreto.

**Falta el iPhone.** Los iPhone desde el XS leen etiquetas en segundo plano con la pantalla
bloqueada, así que es plausible que se comporte distinto al Android — y eso es exactamente lo que
hay que confirmar antes de dar la comprobación por cerrada.

### Cómo repetirla (iPhone, o Android con el ajuste cambiado)

Ahora hay una URL pública real, así que esta comprobación ya no depende de la LAN.

> ⚠ **Usa una etiqueta desechable y márcala para reescribir.** La URL de producción actual está
> atada al nombre del repositorio de GitHub Pages. Todavía **no** es la dirección definitiva, así
> que no grabes etiquetas de ningún local contra ella (`contracts/hub-url.md`).

1. Con la app de grabación, escribe un registro **URL / URI**:
   `https://diegojs97.github.io/nfc-hubs/demo/?m=1`
   (sin conexión, la alternativa es `http://<dirección>:8080/demo/?m=1`)
2. **Prueba desbloqueado:** móvil desbloqueado, pantalla encendida, acércalo a la etiqueta
3. **Prueba bloqueado:** bloquea el móvil, pantalla apagada, acércalo a la etiqueta

**PASA**, para cada móvil y cada estado, si:

- el móvil reacciona a la etiqueta en aproximadamente un segundo
- el hub se abre — directamente o con un único toque en la notificación
- no hace falta ningún paso extra más allá del flujo normal del sistema operativo (FR-010)
- la página se ve idéntica a abrirla escribiendo la URL, y el `?m=1` **no aparece por ningún
  lado** (SC-009)
- el hub aparece **con sus estilos**. Sin estilos significaría que la ruta base no coincide con la
  ruta real de despliegue — aunque el paso de verificación del workflow debería haber impedido que
  eso llegue a publicarse

Un móvil que no lee con la pantalla bloqueada es una **restricción de plataforma que hay que
anotar y contarle al cliente**, no un defecto que arreglar en este repositorio. FR-010 exige que el
hub se abra «sin pasos extra más allá del flujo normal del sistema operativo» — y desbloquear el
móvil *es* el flujo normal de ese sistema operativo.

---

## Comprobación 2 — Importación de vCard en Android Chrome

Prioridad menor que la 1: Android es históricamente el caso fiable, así que esta comprobación
confirma más que descubre. Un fallo aquí sugeriría un bug de generación en `vcard.js` más que una
limitación de plataforma — si iOS también falló, compara los dos síntomas.

1. En el **Android**, abre **Chrome** en `http://<dirección>:8080/demo/`
2. Toca [ES] **«Guardar contacto»**

**PASA:** el fichero se descarga y al abrirlo ofrece importarlo a Contactos, con los cuatro valores
correctos y la dirección intacta como un solo campo.

Anota los mismos detalles que en la comprobación 1, más la **versión de Android**.

**Al terminar, revierte los datos temporales** (ver preparación, paso 2). La comprobación 3 se hace
contra el hub con sus datos reales.

---

## Comprobación 3 — Contraste nocturno en una habitación a oscuras

**Prioridad más baja de las cuatro, y conviene explicar por qué antes de hacerla.**

El tema oscuro de [ES] «Taberna Vela y Sal» es **una instancia de ejemplo** del sistema de temas
del motor, no una decisión de negocio fija. El reparto es explícito en el código:

- `src/_engine/base.css` define estructura, maquetación y el **suelo de accesibilidad** — el
  tamaño mínimo de objetivo de 44 px vive ahí, con la regla de que un tema puede subirlo pero
  nunca bajarlo.
- `src/businesses/<slug>/theme.css` solo rellena color y tipografía, a través de las custom
  properties que declara `base.css`.

Es decir: lo que esta comprobación evalúa son los **valores concretos de un tema de ejemplo**, no
el motor. Un cliente real elegirá casi con seguridad su propia paleta al configurarse, y en ese
momento **esta comprobación merece repetirse contra su tema de verdad** — que es cuando el
resultado importa. Hacerla ahora valida una paleta que probablemente nadie use en producción.

Sigue teniendo valor como comprobación del suelo: si el registro nocturno resulta ilegible incluso
con contrastes declarados de ~15:1, el problema estaría en `base.css` y afectaría a todos los
temas. Por eso no se descarta, solo se pospone.

Dicho eso, las comprobaciones automáticas de contraste evalúan colores *declarados*. No pueden
decirte si el diseño es cómodo para un ojo real, adaptado a la oscuridad, con el brillo bajo
(research.md D8).

1. Asegúrate de haber revertido los datos de prueba, para que el hub muestre su estado real
2. Métete en una habitación de verdad a oscuras. Deja que los ojos se adapten un par de minutos
3. Pon el móvil al brillo que usarías de verdad en la mesa de un bar — **bajo**, no al máximo
   automático
4. Abre <https://diegojs97.github.io/nfc-hubs/demo/>

**PASA** si se cumple todo:

- todas las etiquetas de las entradas se leen sin forzar la vista ni subir el brillo
- el distintivo [ES] «Pendiente» se lee, no es solo una mancha
- la pantalla no resulta incómodamente brillante — un diseño nocturno que deslumbra ha fallado
  aunque sus ratios de contraste sean perfectos
- el contorno de foco se ve al tabular (usa un teclado Bluetooth si tienes; si no, sáltalo)

Eso es todo lo que evalúa esta comprobación: legibilidad y comodidad del registro nocturno a
oscuras.

> **Nota sobre SC-005.** Este criterio (que un hub se lea como la página propia de un local y no
> como una plantilla genérica) **ya no se comprueba aquí**. Su mitad comparativa necesitaba dos
> hubs y solo hay una instancia; y juzgar «identidad propia» sobre un tema de ejemplo de un local
> ficticio no dice nada útil sobre el producto. SC-005 queda aplazado hasta que exista el tema de
> un cliente real, momento en el que se evalúa junto a la repetición de esta comprobación.

---

## Resultados

Filas en orden de prioridad, no de número.

| # | Comprobación | Resultado | Dispositivo / SO | Notas |
|---|--------------|-----------|------------------|-------|
| 1 | vCard en iOS Safari | ⬜ pasa / ⬜ falla | | |
| 4a | Tap NFC, desbloqueado | ✅ pasa (Android) / ⬜ iPhone | Android de Diego, modelo y versión: | Abre el hub correctamente |
| 4b | Tap NFC, bloqueado | ⚠️ restricción conocida (Android) / ⬜ iPhone | Android de Diego, modelo y versión: | No dispara con la pantalla bloqueada. Comportamiento de SO/fabricante, no defecto de código. Pendiente: ¿nada en absoluto o notificación que no abrió? ¿Lectura NFC en pantalla de bloqueo activada? |
| 2 | vCard en Android Chrome | ⬜ pasa / ⬜ falla | | |
| 3 | Nocturno legible a oscuras | ⬜ pasa / ⬜ falla | | Sobre un tema de ejemplo; repetir con el tema de un cliente real |

**Antes de terminar, confirma que el repositorio está limpio:**

```bash
npm run audit:placeholders    # tiene que decir 3 valores
git status                    # ningún business.json modificado
npm test                      # 75 pasan, 5 saltadas
```

Ese último comando importa más que antes: la suite es la condición de publicación del workflow de
despliegue, así que un árbol sucio con datos de prueba se publicaría solo en el siguiente push.

Después rellena la tabla, haz commit y marca T039 en `tasks.md` — teniendo en cuenta que T039 no
se cierra del todo mientras la comprobación 1 siga abierta.
