# NFC Hubs — Visión general del proyecto

**Estado:** Fase 1 construida, verificada y desplegada. En vivo en
<https://diegojs97.github.io/nfc-hubs/demo/>.
**Última actualización:** 2026-08-08

---

## Qué es esto

Cada mesa de un local lleva una pequeña etiqueta NFC. El cliente acerca el móvil y se abre una
página al instante — sin app, sin cámara, sin teclear — con una lista corta de lo que ese cliente
va a querer con más probabilidad: la carta, un enlace de reservas, cómo llegar, la cuenta de
Instagram, dejar una reseña, el nombre de la red WiFi.

La comparación obvia es el código QR, así que conviene ser preciso sobre la diferencia.

**Un QR podría servir exactamente la misma página.** Aquí no hay nada técnicamente imposible con
QR, y afirmar lo contrario sería deshonesto. Las diferencias están en el coste de la interacción
y en a qué apunta la etiqueta:

- **El tap es más corto que el escaneo.** Un QR necesita la cámara abierta, el código encuadrado,
  luz suficiente, una distancia razonable, y luego un toque en la notificación. Una etiqueta NFC
  necesita acercar el móvil a la mesa. En un bar de copas a oscuras, esa diferencia es mayor de
  lo que parece.
- **Una etiqueta, muchos destinos.** El instinto con un QR es apuntarlo directamente a la carta,
  porque una pegatina solo puede hacer una cosa. Luego el local quiere un enlace de reservas, y
  aparece un segundo código, y la mesa acumula pegatinas. Una etiqueta NFC tiene la misma
  limitación de un único destino — pero aquí ese destino es una *página hub*, así que una sola
  etiqueta lo cubre todo y la lista puede cambiar sin tocar la etiqueta.
- **La mesa es identificable.** Cada etiqueta codifica su propio número de mesa en la URL. Hoy
  ese número se ignora deliberadamente. Existe para que una analítica posterior pueda atribuir
  actividad a una mesa concreta sin que nadie reprograme ni una sola etiqueta.

Ese último punto es la apuesta arquitectónica: **la etiqueta es un objeto físico y permanente, y
la página a la que apunta no lo es.** Todo lo caro de cambiar se decide una vez, al principio;
todo lo demás se queda blando.

---

## Un arquetipo, configurado por negocio

El proyecto empezó con dos arquetipos con nombre propio — un bar de copas y un restaurante de
tapas — cada uno con su lista de entradas fijada en la especificación. Resultaron ser
estructuralmente casi idénticos, y mandarlos por nombre en la especificación es justo lo que
convertía «dar de alta un local» en un cambio de especificación en vez de en una carpeta.

Hoy hay **un solo arquetipo genérico**. El motor soporta un catálogo de tipos de entrada, y cada
local elige cuáles usa y en qué orden:

| Tipo | Qué hace |
|---|---|
| **enlace** | Va a un destino externo: la carta, reservas, Instagram, lo que sea |
| **reseña** | Abre Google directamente en el formulario de escribir reseña de ese local |
| **cómo llegar** | Abre la ficha del local en Google Maps |
| **llamar** | Abre el marcador del móvil con el teléfono del local |
| **WiFi** | Muestra el nombre de la red como texto. Nunca conecta |
| **guardar contacto** | Genera una tarjeta de contacto en el propio móvil |

Añadir un **tipo** nuevo al catálogo es una decisión de producto y pasa por la especificación.
Elegir **qué tipos usa un local y en qué orden** es editar un fichero de datos, y no requiere
permiso de nadie.

Eso cambia una cosa importante: un local que no se parece a ningún patrón previo ya no está
bloqueado esperando a que alguien especifique su arquetipo. Se le configura. El único freno que
queda es el correcto — no se pueden **inventar valores**.

### El módulo de guardar contacto

«Guardar contacto» es el mejor ejemplo de la diferencia. Antes era una propiedad de una categoría
de negocio: el restaurante lo tenía y el bar no, por especificación. Ahora es un módulo opcional:
un hub lo tiene exactamente cuando sus datos declaran esa entrada, y un hub que no la declara no
descarga ni un byte de ese código.

Sigue teniendo sentido que un restaurante que hace catering viva en la agenda de un cliente y que
un bar de copas no. La diferencia es que ahora eso lo decide quien configura el local, no la
especificación.

### El local de demostración

Hay una única instancia configurada: [ES] «Taberna Vela y Sal», un local **ficticio** creado para
poder enseñar el producto. No es un cliente, y sus datos son inventados a propósito.

Dos de sus valores siguen deliberadamente sin confirmar: el identificador de Google del local y
el teléfono. Podrían haberse rellenado con datos reales de algún sitio para que todos los botones
funcionaran en la demo, y se hizo brevemente — fue un mal intercambio. «Reseña Google» habría
dejado una reseña en un negocio real y ajeno, y «Cómo llegar» habría llevado al cliente potencial
a otra ciudad. España tampoco reserva ningún rango de números ficticios, así que cualquier `+34`
verosímil puede ser de una persona real.

El resultado es una demo con cuatro entradas funcionando y dos pendientes. Eso es honesto, y
además convierte el estado «pendiente» en algo que el cliente potencial ve funcionando en vez de
tener que creérselo.

---

## Cómo está construido

**Un motor, muchos negocios.** Un único generador de sitios (Eleventy) produce todos los hubs.
Toda la lógica compartida — maquetación, estilos, comportamiento, accesibilidad — vive en un solo
sitio. Añadir un local es añadir una carpeta, no copiar un proyecto.

**Cada negocio es un fichero de datos.** Todo lo específico de un local — su nombre, sus enlaces,
su teléfono, el nombre de su WiFi — vive en un JSON pequeño y versionado. Poner valores reales es
editar ese fichero. Ningún desarrollador toca marcado, estilos ni código para colocar el enlace
real de una carta. Esa restricción la impone la propia compilación, no la buena voluntad.

**Sin backend en la Fase 1.** La salida es HTML, CSS y unos pocos kilobytes de JavaScript. No hay
servidor, ni base de datos, ni login, ni nada que mantener o que puedan reventar. El hub pesa
**10,1 KB** frente a un techo autoimpuesto de 100 KB — algo que se nota en la conexión saturada de
un local lleno.

**Desplegado en GitHub Pages.** El sitio se publica solo en cada cambio: se compila, se ejecuta la
suite de pruebas completa como condición de publicación, y solo si todo pasa se despliega.
Cloudflare Pages sigue siendo la candidata para la Fase 2, porque el redirector de analítica
necesita ejecutar código en servidor y GitHub Pages no puede. Esa es una decisión de la Fase 2,
no de ahora — pero es la razón de que la dirección web deba quedar fijada **antes** de grabar
ninguna etiqueta: cambiarla después obliga a reprogramar todas a mano.

---

## Principios de diseño

Estas son las decisiones que separan esto de una plantilla, dichas en llano.

**Los datos sin confirmar están marcados, y el sistema lo sabe.**
Todo valor que el dueño aún no ha facilitado contiene una cadena marcadora concreta. El sistema
lee ese marcador: una entrada cuyo destino sigue sin confirmar se muestra normalmente en su
posición, pero al tocarla aparece un aviso breve de «pendiente de confirmar» en vez de navegar a
ninguna parte. A un cliente nunca se le manda a un enlace muerto, a una página de relleno ni al
negocio de otro. Nunca se inventa nada para que una página parezca terminada.

**Los errores de datos paran la compilación en vez de publicarse.**
Un campo que falta, un valor vacío o un marcador sutilmente mal escrito no se convierten en
silencio en un enlace roto en una página en vivo: hacen fallar la compilación, nombrando el campo
exacto. El fallo que esto previene es concreto y real: una errata que hiciera creer al sistema que
un valor está confirmado mandaría a los clientes a una dirección inexistente.

**La tarjeta de contacto es todo o nada.**
«Guardar contacto» genera una tarjeta solo cuando el nombre, el teléfono, la dirección y la web
están *todos* confirmados. Si falta uno, no genera nada y explica por qué. Un contacto a medias
guardado en el móvil de alguien es peor que ningún contacto: se lo queda, se fía de él, y está
mal. Además le cuesta mucho más deshacerlo que a un toque que educadamente no hizo nada.

**El WiFi se muestra, nunca se conecta.**
El hub enseña el *nombre* de la red como texto plano y nada más — no es un botón, no es un
enlace, y no puede iniciar una conexión. No hay ninguna contraseña guardada en ningún sitio del
sistema. Donde un local quiera conexión al tocar, eso lo resuelve el registro WiFi de la propia
etiqueta, escrito al programarla. Las credenciales no tocan la web.

**Sin seguimiento, sin cookies, sin datos guardados.**
La Fase 1 no recoge nada. Ni analítica, ni cookies, ni almacenamiento en el navegador, ni scripts
de terceros, ni fuentes externas. El tap de un cliente no se le reporta a nadie, incluidos
nosotros. Lo verifica una prueba automática que falla si la página contacta con cualquier
dirección externa. Es también parte de por qué las páginas son tan pequeñas.

Y hay un límite escrito para más adelante, no solo para hoy: la constitución del proyecto acota
qué podrá llegar a ser la medición — recuento de audiencia agregado y anónimo de un solo sitio,
sin identificadores en el navegador y sin seguimiento entre sitios. Datos personales y cruce de
datos entre clientes quedan fuera de alcance **en todas las fases**, no solo en esta.

**La accesibilidad es un suelo, no un acabado.**
El hub cumple WCAG 2.2 AA — verificado automáticamente en cada compilación. Los objetivos táctiles
cumplen el tamaño mínimo, el contraste se comprueba, y el estado «pendiente» se comunica con texto
y no solo con color, así que sobrevive al daltonismo y a la escala de grises. El diseño nocturno
no tiene exención: cumple la misma vara que cumpliría uno diurno.

**Los identificadores son permanentes aunque el resto sea blando.**
Un local puede añadir, quitar y reordenar sus entradas libremente. Lo que no puede es **renombrar**
una: el identificador de cada entrada está destinado a ser su ruta de analítica en la Fase 2, y
renombrarlo hoy es gratis y rompe la medición en silencio más adelante, cuando las etiquetas ya
están en las mesas. Es la misma lógica que la dirección web — lo caro de cambiar se decide una
vez.

---

## En qué punto está el proyecto

**Construido, verificado y en vivo.**
El proyecto define 80 comprobaciones automáticas: **75 pasan, 5 están saltadas
deliberadamente**, ninguna falla. La mayoría corre en un navegador real contra un iPhone emulado
(motor de Safari) y un Android emulado (motor de Chrome) — los dos únicos entornos que importan,
porque todo el tráfico real llega desde un móvil — y el resto son comprobaciones del contrato de
datos que verifican que la compilación rechaza datos de local mal formados. La cobertura incluye
el orden de las entradas, el comportamiento de pendiente, la tarjeta de contacto en sus dos
estados, el WiFi inerte, la accesibilidad, el peso de la página, los tiempos de carga y la ruta
base del sitio desplegado. Las 5 saltadas miden comportamiento de compilación o con red
estrangulada que solo un motor de navegador puede reportar; están registradas como hueco de
cobertura conocido en vez de omitidas calladamente.

Medido, no estimado: 10,1 KB de peso frente a un presupuesto de 100 KB; contenido esencial visible
en 286 ms en una conexión 4G típica y en 577 ms en una deliberadamente degradada, frente a
objetivos de 1,5 y 3 segundos.

La suite es además la condición de publicación: no se despliega nada que no la pase entera, en un
Ubuntu limpio y no solo en la máquina de desarrollo.

**Aplazado por diseño a la Fase 2.**
La analítica de taps. Hoy no hay forma de saber cuánta gente ha usado un hub, ni desde qué mesa.
Es una decisión consciente de secuencia, no un olvido: la capa de medición necesita un componente
de servidor, y la Fase 1 se mantuvo estática para poder publicarse y validarse sin él. El terreno
está preparado — los números de mesa ya viajan en las URLs de las etiquetas, y todos los destinos
están centralizados para poder redirigirse a través de un punto de medición sin reescribir las
páginas.

**Abierto antes de un cliente real.**

1. **Un local de verdad.** Lo que hay configurado es una demo ficticia. Contactar con un local,
   recoger sus datos y configurarlo es la siguiente tarea real, y es de negocio, no técnica.

2. **La dirección web definitiva.** La actual es una URL de GitHub Pages atada al nombre del
   repositorio. Sirve perfectamente para enseñar el producto, pero como cada etiqueta codifica
   físicamente la dirección completa, esto tiene que quedar cerrado *antes* de grabar ninguna
   etiqueta de un local — cambiarlo después significa reprogramarlas todas a mano.

3. **Verificación en dispositivo real de la tarjeta de contacto — el único riesgo técnico sin
   resolver.**
   «Guardar contacto» genera su tarjeta enteramente en el móvil. Funciona en las pruebas
   automáticas, pero las pruebas automáticas ejecutan un *motor* de navegador, no un iPhone. Si
   iOS Safari abre el importador de contactos al recibir un fichero generado es un comportamiento
   conocido por frágil que ninguna cantidad de automatización puede confirmar. Hay que comprobarlo
   en hardware real.

   Si falla, existe un plan B — servir un fichero de contacto pre-generado como un enlace normal —
   pero funciona de forma distinta a lo que la especificación exige hoy, así que se trataría como
   un cambio documentado y no como una sustitución silenciosa. Es el punto con más probabilidad de
   requerir rehacer trabajo, y está deliberadamente puesto encima de la mesa ahora en vez de
   descubrirse el día del lanzamiento.

   Con un matiz honesto añadido por el cambio de arquetipo: como ningún local declara hoy la
   entrada de guardar contacto, la prueba en dispositivo requiere activarla temporalmente con
   datos de prueba. El procedimiento lo describe [`t039-device-checks.md`](./t039-device-checks.md).

Junto a eso queda una lista corta de comprobaciones en dispositivo: la tarjeta de contacto en
Android, leer el diseño nocturno en una habitación de verdad a oscuras (el chequeo automático de
contraste solo evalúa colores declarados, no percepción), y confirmar que una etiqueta abre bien
con el móvil bloqueado y desbloqueado.

---

## Hoja de ruta

**Fase 1 — hubs estáticos.** *(construida y desplegada; pendiente de un cliente real y de la
verificación en dispositivo)*
Un arquetipo configurable sobre un motor compartido, servible como ficheros planos por HTTPS sin
backend. Termina cuando un local real tenga sus datos puestos, sus etiquetas escritas y sus
páginas en vivo.

**Fase 2 — medición.** *(requiere aprobación explícita antes de empezar)*
Un redirector en servidor que registra un tap y reenvía al destino real, convirtiendo los números
de mesa que ya viajan en cada etiqueta en información utilizable: qué local, qué mesa, qué
entrada, a qué hora. La Fase 1 se construyó específicamente para que esto sea una adición y no una
reconstrucción — misma dirección, mismas etiquetas, sin reprogramar nada. No se ha empezado y no
se empezará hasta que se apruebe explícitamente. Sus límites ya están escritos en la constitución:
agregado, anónimo, de un solo sitio.

**Fase 3 — más locales.** *(potencial)*
El motor ya separa la maquinaria compartida del contenido de cada local, así que un local nuevo es
una carpeta de datos, no un proyecto nuevo. El freno que existía antes — «un local materialmente
distinto necesita que le especifiquen su arquetipo primero» — ha desaparecido con el cambio a un
arquetipo genérico. Lo que queda es un freno mejor: un local nuevo se configura eligiendo del
catálogo, y cualquier valor que su dueño no haya confirmado se queda marcado como pendiente hasta
que lo confirme.

---

## Resumen

La Fase 1 está funcionalmente completa, verificada de forma independiente contra su propia
especificación, y desplegada. El riesgo de ingeniería es bajo y está concentrado en un único sitio
identificado: el comportamiento de la tarjeta de contacto en iPhones reales. El trabajo que queda
antes de un lanzamiento real es sobre todo no-técnico: conseguir un local, recoger su información,
y cerrar una dirección web que a partir de entonces es permanente.

La decisión de diseño central es que todo lo físico y caro de cambiar se decide una vez, y todo lo
demás se queda editable. Eso es lo que hace que una segunda fase sea una adición y no una
reconstrucción, y que un segundo local sea una carpeta y no un proyecto.
