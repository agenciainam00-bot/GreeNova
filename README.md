# GreeNova SC — sitio

Cuatro páginas estáticas construidas a partir del **Catálogo de Productos 2026**.
Sin build step: se publica copiando la carpeta a cualquier hosting estático
(Vercel, Netlify, Cloudflare Pages, S3, cPanel).

```
index.html      landing de campaña: las 11 secciones del copy (ver abajo)
tienda.html     catálogo completo con filtros, buscador y carrito de cotización
ofertas.html    outlet: mismo catálogo filtrado a los productos en oferta, con barra lateral
producto.html   ficha de producto; una sola plantilla para las 56 referencias (?id=)
producto.js     arma la ficha a partir del catálogo
styles.css      tokens de color, tema claro y oscuro, layout, motion
greenova.js     comportamiento compartido: nav, tema, reveals, animaciones, acordeón, formulario
productos.js    los 56 productos del catálogo, sus medidas, piezas por caja y las ofertas
tienda.js       filtros, buscador y carrito; mueve tienda.html y ofertas.html
agente-criterios.js  LO QUE TÚ EDITAS del agente: criterios y base de conocimiento
agente.js       el widget del agente y la búsqueda RAG en el navegador
api/chat.js     función de servidor del agente; aquí vive la API key
assets/         logotipos, sellos y fotos de la portada
assets/prod/    62 fotos de producto extraídas del catálogo, una por referencia
serve.py        servidor local sin caché, para desarrollo
build-single.py empaqueta cada página en un HTML autocontenido
build-sitemap.mjs  regenera sitemap.xml a partir del catálogo
favicon.svg     icono del sitio, dibujado del logotipo del catálogo
favicon.ico     el mismo icono a 32x32; el navegador lo pide siempre
apple-touch-icon.png  el mismo icono a 180x180, para iOS
robots.txt, sitemap.xml, site.webmanifest
```

## La landing (index.html)

La portada sigue el documento **"Copy — Landing «Link en bio» | GREENOVA SC"**.
Las once secciones van en el orden del documento y el texto es el suyo, no una
reescritura:

| # | Sección | id |
|---|---------|-----|
| 1 | Hero | (sin id) |
| 2 | El problema | `#problema` |
| 3 | La solución | `#nosotros` |
| 4 | Catálogo | `#productos` |
| 5 | Confianza / certificaciones | `#certificaciones` |
| 6 | Servicios | `#personalizacion` |
| 7 | Oferta | `#oferta` |
| 8 | Prueba social | `#prueba` |
| 9 | Preguntas frecuentes | `#preguntas` |
| 10 | CTA final | `#cotizar` |
| 11 | Pie / datos de consulta | `<footer>` |

Todos los CTA llevan a `tienda.html`, como pide el documento. Los datos de
contacto aparecen **solo en el pie**, también como lo pide.

`#medidas` (el buscador de medidas) no está en el documento pero se conservó:
el nav enlaza ahí y es una herramienta real, no copy de campaña. Va después del
catálogo. Se quitaron la sección `#proceso` (los cuatro pasos) y la marquesina
de "también en catálogo", porque su contenido lo cubren ahora las secciones 3,
6 y 9. Están en el respaldo si los quieres de vuelta.

### El hero: foto a sangre, texto centrado

La portada abre con una composición editorial a pantalla completa: **foto de
fondo a sangre**, velo oscuro para legibilidad y todo el texto centrado —
antetítulo en versalitas, titular en **Playfair Display** con la segunda línea
en cursiva, entradilla en la misma serif, píldora de búsqueda, CTA y aviso de
scroll. Playfair se carga **solo en `index.html`**; el resto del sitio sigue con
Outfit + Geist.

La foto va como `<img>` con `fetchpriority="high"`, no como `background-image`,
para que el navegador la priorice como LCP. El velo (`.hero-foto__velo`) no es
decorativo: la foto es clara y sin él el texto blanco no se lee.

El hero descuenta la altura de la barra (`min-height: min(calc(100svh -
var(--nav-h)), 880px)`), así que cabe entero en pantalla y el aviso de scroll
queda justo en el borde. Verificado: 832 px en un viewport de 900, y 720 px en
uno de 812 en móvil.

La píldora de búsqueda es un `<form method="get" action="tienda.html">` con el
campo `q`: entra a la tienda con el filtro ya aplicado, sin JavaScript.

**Nota:** este hero sustituyó a una versión anterior que abría el catálogo en
abanico sobre fondo verde. Esa versión ya no está en el CSS. El respaldo previo
al cambio quedó fuera del repo; si la quieres de vuelta hay que rehacerla.

**Aviso sobre la foto:** `life-greenova.webp` es un mockup del catálogo donde el
empaque dice **`GREENOVA SBC`**, no `SC`. A tamaño de hero ese texto se lee
perfectamente detrás del titular. Es el pendiente de marca de más abajo, que este
diseño vuelve mucho más visible: conviene resolverlo antes de publicar.

### El sitemap

```bash
node build-sitemap.mjs
```

Escribe `sitemap.xml` con las 59 URLs (portada, tienda, outlet y las 56
fichas). Lee el catálogo ejecutando `productos.js` en un contexto de Node, así
que **no hay una lista de productos duplicada que se desincronice**. Vuelve a
correrlo cada vez que agregues o quites un producto.

## Publicar en Hostinger (GitHub → hosting estático)

El sitio es **estático puro**: HTML, CSS, JS y assets. Se sube copiando la
carpeta, sin build step, sin npm install y sin variables de entorno. Eso es lo
que permite el flujo `git push` → Hostinger sin que se rompa nada.

**Se sube:** los cuatro `.html`, `styles.css`, `greenova.js`, `productos.js`,
`tienda.js`, `producto.js`, `serigrafia.js`, `agente.js`, `agente-criterios.js`, `assets/`,
`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`,
`robots.txt`, `sitemap.xml`, `.htaccess`, `php/chat.php` y `php/gasto.php`.

**No hace falta subir** (son herramientas de desarrollo): `serve.py`,
`build-single.py`, `build-sitemap.mjs`, `dist/`, `README.md`, `node_modules/`.

### El agente y la API key

El agente contesta en dos niveles. El **RAG** (catálogo + HECHOS) corre entero en
el navegador y no necesita servidor ni claves: si borras el endpoint, el agente
sigue funcionando y, cuando no sabe, entrega el contacto de ventas.

El segundo nivel sí necesita servidor, porque ahí vive la API key. Hostinger no
ejecuta Node, pero **sí ejecuta PHP**, así que ese nivel es `php/chat.php`.

**Dónde poner la key en Hostinger.** Nunca dentro del repositorio ni dentro de
`public_html`. El archivo va un nivel arriba, hermano de `public_html`:

```
/home/uXXXXXXX/greenova-secretos.php     <- aquí va la key
/home/uXXXXXXX/public_html/              <- el sitio
```

```php
<?php return ['OPENAI_API_KEY' => 'sk-proj-...'];
```

Se sube por el Administrador de archivos de hPanel o por SFTP. Al estar fuera de
`public_html` nadie puede pedirlo por URL. Si tu plan permite variables de
entorno, `OPENAI_API_KEY` también funciona y tiene preferencia. El modelo se
cambia con `OPENAI_MODEL` (por omisión `gpt-4o-mini`).

`.htaccess` bloquea `.env`, `README.md`, `package.json` y los scripts de
desarrollo por si acaban subidos.

**Nota de Vercel:** el sitio no tiene paso de build. El script de un solo
archivo se llama `npm run single` (no `build`) justamente para que Vercel no lo
autodetecte y lo ejecute, y `vercel.json` además declara un `buildCommand`
vacío. Si algún día lo renombras a `build`, el deploy va a intentar correrlo.

### Probador de logo (`serigrafia.js`)

En la sección de servicios, el visitante sube su logo y lo ve estampado sobre un
producto real del catálogo. Corre entero en el navegador con canvas: **el
archivo no se sube a ningún servidor, no pasa por ninguna API y no cuesta nada
por uso**. En Hostinger funciona igual que el resto del sitio estático.

Cómo se ve impreso y no pegado encima:

- Blend `multiply` para tinta oscura y silueta blanca con `screen` para tinta
  clara, así la estampa hereda las sombras y los pliegues de la foto.
- Sobre el vaso la tinta se curva: el logo se corta en tiras verticales, cada
  una baja siguiendo un arco y se angosta hacia los bordes.
- El logo se recorta solo: casi todos los archivos traen margen transparente
  (o fondo blanco, si es JPG) y sin recortar se ven chicos y descentrados.
- La estampa se recorta al área imprimible de cada producto, medida en
  proporción sobre cada foto (`PRODUCTOS` al inicio del archivo). Para agregar
  otro producto basta con una entrada más ahí.

### Desplegar en Render (Python + uvicorn)

Render corre un proceso de larga vida, así que ahí el sitio y el agente viven
juntos: `main.py` sirve los archivos estáticos y expone `/api/chat` con FastAPI,
en streaming, con el mismo formato SSE que esperan las otras dos versiones.

Configuración del **Web Service**:

| Campo | Valor |
|---|---|
| Language | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Root Directory | *(vacío)* |

Variables de entorno: `OPENAI_API_KEY` y, opcional, `OPENAI_MODEL`. El `PORT` lo
pone Render solo.

El tope diario de 300 preguntas vive en memoria en esta versión, protegido con
un candado porque uvicorn atiende varias peticiones a la vez; si el servicio se
reinicia, el contador vuelve a cero. En el plan gratuito el servicio además se
duerme por inactividad y la primera visita tarda en responder.

`main.py` bloquea por HTTP todo lo que no es el sitio: `.env`, `php/`, `api/`,
`.venv/`, los scripts y el propio servidor.

### Las tres versiones del endpoint

El agente tiene una sola lógica de negocio (los criterios y el RAG viven en el
navegador) pero tres envoltorios de servidor, uno por tipo de hosting:

| Archivo | Hosting | Cómo se llama |
|---|---|---|
| `main.py` | Render | `uvicorn main:app` |
| `php/chat.php` | Hostinger | Apache + PHP |
| `api/chat.js` | Vercel | función serverless |

`ENDPOINT` en `agente-criterios.js` elige por dominio: `/api/chat` en
`*.onrender.com` y `*.vercel.app`, `/php/chat.php` en cualquier otro. Cuando
decidas un hosting definitivo, borra los otros dos: mantener tres copias del
mismo endpoint solo tiene sentido mientras estés probando.

### Cómo contesta el agente, en orden

Antes de gastar un token, el navegador intenta resolver la pregunta con el
catálogo. Solo lo que no cabe en estos cuatro pasos llega a la IA:

1. **Intención de compra** — "quiero cotizar", "qué llevo en el carrito": lee el
   carrito de localStorage y contesta con lo que la persona ya eligió.
2. **Giro del negocio** (`GIROS` en `agente-criterios.js`) — "tengo una
   cafetería", "necesito para llevar", "vendo postres": recomienda de una vez
   los productos que se usan en ese giro, con su medida. Es la parte que hace
   que el asistente venda en vez de buscar.
3. **Respuesta directa** — cuando un solo producto o hecho gana con holgura.
4. **Lista del catálogo** — cuando varios productos de la misma familia
   coinciden y ninguno gana solo, los enseña todos en vez de rendirse.

Recién en el quinto paso entra la IA, con los pasajes que encontró el RAG. Por
eso el asistente sigue siendo útil aunque no haya API key: los cuatro primeros
pasos no cuestan nada y cubren la mayoría de las preguntas reales.

### Panel de catálogo (`admin.html`)

Para editar productos, precios, existencias y ofertas sin tocar código. Vive en
`/admin.html` del servicio de Render y **solo funciona ahí**, porque necesita los
endpoints de `main.py`.

Cómo guarda: el panel manda el catálogo editado al servidor, el servidor **genera
`productos.js`** (no lo genera el navegador: así lo que se commitea siempre tiene
la forma correcta aunque alguien manipule la petición) y lo escribe como commit
en GitHub. Cada guardado queda versionado y dispara el redeploy solo.

Variables de entorno que necesita, todas en Render:

| Variable | Para qué |
|---|---|
| `ADMIN_PASSWORD` | la contraseña del panel |
| `GITHUB_TOKEN` | token con permiso de escritura sobre el repo |
| `GITHUB_REPO` | opcional, por omisión `agenciainam00-bot/GreeNova` |
| `GITHUB_BRANCH` | opcional, por omisión `main` |

El acceso no usa cookies ni base de datos: el servidor devuelve un token firmado
con la propia contraseña que caduca a las 8 horas y vive en `sessionStorage`. Si
cambias `ADMIN_PASSWORD`, todas las sesiones abiertas mueren.

Al guardar se manda el `sha` del archivo actual, así que si alguien más cambió
`productos.js` mientras tenías el panel abierto, GitHub rechaza el guardado en
vez de pisar ese cambio.

**Ojo con `productos.js`**: desde que lo escribe el panel, editarlo a mano se
pierde en el siguiente guardado.

### Control de gasto

Tres números, todos en el encabezado de `php/chat.php`:

| Constante | Valor | Qué hace |
|---|---|---|
| `MAX_TOKENS` | 400 | Tokens de respuesta por pregunta. Alcanzan cinco o seis frases; los criterios piden dos o tres. |
| `TOPE_DIARIO` | 300 | Preguntas a la IA por día en todo el sitio. |
| — | sin límite | No hay tope por visitante; se decidió así. |

Al llegar al tope diario el endpoint responde 429 sin tocar la API, y el agente
sigue trabajando en modo RAG: contesta con el catálogo y los HECHOS, y cuando no
sabe entrega el contacto de ventas. El contador se reinicia solo a medianoche
UTC y se guarda en `/home/uXXXXXXX/greenova-gasto.json`, fuera de `public_html`.

Cada respuesta anota los tokens que de verdad consumió (`stream_options` pide el
uso real a OpenAI), así que el archivo sirve como bitácora del día. Para verlo
sin entrar por SFTP, define `GASTO_TOKEN` en el archivo de secretos y consulta:

```
https://tudominio.com/php/gasto.php?token=TU-CLAVE
```

Sin esa clave, `php/gasto.php` responde 404. Los precios que usa para estimar el
costo están escritos en ese archivo: verifícalos contra la página de precios de
OpenAI, porque cambian.

**En local** el endpoint PHP no corre: `serve.py` solo sirve archivos estáticos.
El agente se prueba en modo RAG, que es la mitad que importa afinar. Para probar
el nivel de IA hace falta subirlo a Hostinger, o levantar `php -S` si tienes PHP.

`api/chat.js` es la misma función para Vercel (Node). No hay que elegir: el
`ENDPOINT` en `agente-criterios.js` se decide por dominio, así que en un dominio
`*.vercel.app` usa `/api/chat` y en cualquier otro (Hostinger) usa
`/php/chat.php`.

Los `.php` viven en `php/`, no en `api/`, **a propósito**: Vercel trata todo lo
que está en `api/` como funciones serverless, y ahí `chat.php` y `chat.js`
resuelven a la misma ruta `/api/chat`, con lo que el build falla entero
("conflicting paths"). Fuera de `api/` no hay conflicto posible. Además
`.vercelignore` los saca del deploy. Hostinger, al revés, ignora el `.js`.

`vercel.json` y `package.json` son inofensivos si se suben; Hostinger los ignora.

**Sin dependencias externas en el navegador**: no hay CDN de JavaScript ni
librerías de animación. Todo el movimiento es CSS y JS propio. La única petición
a un tercero son las fuentes de Google Fonts; si quieres cero dependencias
externas, se pueden autohospedar con `@font-face` (pendiente, ver abajo).

## La tienda

`tienda.html` es la página de ventas. Muestra las 56 referencias del catálogo
(166 medidas y modelos en total) con foto, material, piezas por caja y selector
de medida.

Usa el mismo armazón que el outlet: `shop-layout` + `<aside id="side">` +
`shop-main`, con barra lateral de categoría, material, disponibilidad y selector
de columnas, y con el conteo de productos en cada chip. `tienda.js` lee `#cats`,
`#mats`, `#stock`, `#cols` y `#filter-open` de forma genérica, así que las dos
páginas comparten la lógica y montar la barra fue solo marcado.

**En móvil la barra arranca plegada** tras el botón «Filtros». Ese estado lo fija
`tienda.js` según el viewport: el CSS ya traía `.side[hidden] { display: none }`
pero el marcado nunca ponía el atributo, así que la barra salía desplegada en el
teléfono y empujaba la rejilla ~860 px hacia abajo antes de que se viera un solo
producto.

Los productos marcados `servicio: true` llevan el badge **«Pocas unidades»**
(antes decía «Bajo pedido»). Se cambia en `tienda.js`, en la plantilla de la tarjeta.

**No es un carrito de compra, es un carrito de cotización.** El visitante marca
medida y cuántas cajas necesita, la lista se guarda en `localStorage` (sobrevive
a recargas y se refleja en el contador del nav) y al final se envía como una sola
solicitud.

### Precios

El catálogo no publica lista de precios, así que cada producto trae
`precio: null` y la tarjeta dice "Precio bajo cotización".

**Para encender los precios:** pon el número (MXN por caja) en el campo `precio`
del producto en `productos.js`. La tarjeta y el carrito muestran el importe
solos, sin tocar más código.

### Si las tarjetas se ven larguísimas

Pasó una vez: la tarjeta abría `<a class="pcard__media">` y lo cerraba con
`</div>`. El navegador no tira error — aplica su algoritmo de recuperación, deja
el `<a>` abierto y **duplica el `.pcard__media`** dentro del cuerpo y del `<h3>`.
Como ese bloque tiene `aspect-ratio: 4/3`, cada copia fantasma sumaba ~190 px de
hueco: las tarjetas medían 923 px en vez de 540.

El síntoma no apunta a la causa y no hay nada en consola. **Si una tarjeta crece
sin explicación, cuenta los `.pcard__media` que hay dentro:**

```js
document.querySelectorAll('.pcard')[0].querySelectorAll('.pcard__media').length  // tiene que ser 1
```

Más de uno significa etiqueta sin cerrar en la plantilla de `tienda.js`.
Ojo: `node --check tienda.js` **no** atrapa esto — es HTML dentro de strings.

### Por qué las imágenes van posicionadas y no con porcentajes

`.pcard__media img` y `.ficha__foto img` se dimensionan con
`calc(100% - 2 * var(--aire))` sobre una caja posicionada, no con
`max-height: 100%`. Hubo dos trampas, y la segunda no es obvia:

1. **`max-height` / `height` en porcentaje no resuelven** cuando la altura del
   contenedor viene de `aspect-ratio`. La imagen caía a su tamaño intrínseco y se
   salía: en la ficha, 211 px por debajo del borde, que `overflow: hidden` se comía.
2. **En un elemento reemplazado (`<img>`), `inset` en los cuatro lados con
   `width: auto` tampoco estira.** A diferencia de un `<div>`, sigue usando su
   tamaño intrínseco. Ese intento dejó el recorte peor (346 px).

`--aire` es el mismo valor que el `padding` del contenedor, así que el
crecimiento del hover (`scale: 1.07`) se come ese aire y **nunca recorta**.
Verificado en las cuatro páginas y en seis fichas, en reposo y en hover.

## El outlet

`ofertas.html` corre el mismo motor: `tienda.js` lee `data-modo` del `<body>` y,
en modo `ofertas`, muestra solo los productos con promoción.

**Se publica vacío a propósito.** GreeNova no tiene promociones y no se inventó
ninguna: un descuento falso o un "precio antes" que nunca existió es publicidad
engañosa. La página muestra un estado vacío que manda al catálogo.

**Para encender una oferta**, agrega una entrada a `PROMOS` en `productos.js`:

```js
var PROMOS = {
  "vaso-papel-blanco": {
    desc:  15,                    // % de descuento (obligatorio)
    hasta: "2026-10-31",          // último día (opcional)
    nota:  "Última existencia",   // etiqueta libre (opcional)
    agotado: false                // lo marca como AGOTADO (opcional)
  }
};
```

## El mega menú

Pasar el cursor sobre **Productos** abre un panel a todo lo ancho con cuatro
columnas, cada enlace con su miniatura. En escritorio abre al hover con retardo
corto; con teclado o en táctil, con clic. Cierra con Escape, clic fuera o al
salir el foco. En móvil se convierte en acordeón dentro del menú.

**Los estilos de escritorio faltaban por completo.** Solo existía el bloque
`@media (max-width: 900px)`. Sin `position`, `.mega` quedaba como una columna
más del flex de la barra: 378 px de ancho y las miniaturas a tamaño completo
desbordándose sobre la página. El panel va absoluto contra `.nav`, que ya es
contenedor posicionado por su `position: sticky`.

**Los ítems entran escalonados**, fila por fila, las de arriba primero, con
60 ms entre una y otra (`animation-delay` por `nth-child`). Las cuatro columnas
avanzan a la vez, así que se lee como una onda de arriba hacia abajo. El JS ya
fuerza un reflujo al abrir, así que se repite en cada apertura sin reiniciarla.

## La ficha de producto

`producto.html?id=<id>` es **una sola plantilla** para las 56 referencias.

- **Migas de pan**, foto grande en columna sticky con su badge.
- **Presentación en chips** (no un `<select>`): las medidas del catálogo como
  botones. Un `<input type="hidden" data-role="variant">` guarda el valor, porque
  el carrito de `tienda.js` lee `.value` de ese selector — así el contrato no
  cambió y no hubo que tocar su lógica. El chip dispara un `change` que burbujea.
- **Cajas** con stepper, **Añadir a mi cotización** y **Preguntar por este
  producto**, que abre el agente con la pregunta escrita.
- **Lo que respalda este producto** en lugar de reseñas: solo los sellos que de
  verdad le tocan a ese material.

**Sin precio y sin existencias.** Los datos estructurados se emiten **sin
`offers`**: declarar un precio inventado es lo que hace que Google marque la ficha.

### Una guarda que no puede quitarse

En la ficha el selector de medida **no** vive dentro de una `.pcard`. El
manejador de `tienda.js` hacía `sel.closest(".pcard").dataset.id` y reventaba con
`Cannot read properties of null` al cambiar de medida **con el carrito lleno**.
Con el carrito vacío no saltaba, porque `filter()` no llega a ejecutar el
callback: por eso pasó desapercibido. La guarda es `pc && cart.filter(...)`.

### Nota de arquitectura

El carrito, el cajón y el toast los maneja `tienda.js` en **modo solo-carrito**
(detecta que no hay `#grid`). Una sola implementación para las cuatro páginas.

La ficha se renderiza en el navegador. El `<title>`, la meta, el canónico, el
Open Graph y el JSON-LD **sí se escriben por producto**, pero desde JavaScript.
Google lo ejecuta; los scrapers de WhatsApp, Facebook y LinkedIn **no**, así que
al compartir el enlace de una ficha sale el título genérico de la plantilla.
Arreglarlo pide pre-generar los 56 archivos, y eso cambia el esquema de URLs
(`producto.html?id=x` → `producto/x.html`), lo que toca `tienda.js`, el mega menú
y `build-sitemap.mjs`. Es una decisión de arquitectura, no un pendiente mecánico.

## El agente

Reemplaza al botón flotante de WhatsApp. Contesta en dos niveles:

1. **RAG en el navegador.** Se indexan los 56 productos y los HECHOS de
   `agente-criterios.js`, con lematización para español. Si un resultado gana con
   holgura, contesta **al instante, sin llamar a la IA y sin costo**.
2. **Claude.** Si no, la pregunta va a `api/chat.js` con los pasajes recuperados.
   Usa el SDK de OpenAI en streaming: `gpt-4o-mini` por omisión (se cambia con
   `OPENAI_MODEL`), `max_tokens: 1200`, `temperature: 0.3`.

### La API key

**Va en una variable de entorno del hosting, nunca en el repositorio ni en el
JavaScript del navegador.** Todo lo que llega al navegador es público. Por eso
existe `api/chat.js`: `OPENAI_API_KEY` (y opcionalmente `OPENAI_MODEL`).
En local va en `.env`, que está en `.gitignore`.

### Qué editas tú

Todo está en **`agente-criterios.js`**, en español y sin código: `CRITERIOS`
(las reglas: no dar precios, no prometer tiempos ni mínimos, no inventar),
`HECHOS` (la base de conocimiento) y `SUGERENCIAS` (las preguntas de arranque).
El agente tiene prohibido afirmar algo que no esté ahí o en el catálogo.

### Si el endpoint no está desplegado

El widget sigue funcionando en modo RAG y entrega el contacto de ventas cuando
no sabe — probado. Es exactamente lo que pasa en Hostinger estático.

## Decisiones de diseño

- **Paleta** muestreada del PDF: forest `#224539`, verde `#1f8b55`, acento lima
  `#9bce89`. El verde sólido es el color de acción; el lima se reserva para
  badges y realces.
- **Tema**: arranca en claro siempre. El oscuro está en el interruptor del nav y
  se recuerda en `localStorage`; un script en el `<head>` lo aplica antes de
  pintar para que no parpadee.
- **Tipografía**: Outfit (títulos) + Geist (texto). **Playfair Display solo en la
  portada**, para el hero editorial.
- **Movimiento**: reveals con IntersectionObserver, cifras que cuentan, acordeón,
  marquesina. **No hay un solo listener de `scroll`.** Todo se apaga con
  `prefers-reduced-motion: reduce`.
- **Regla que no se rompe:** nunca animes `transform` en `.tile__img` ni en
  `.pcard__media img` — ahí `transform` posiciona la pieza y animarlo la
  descoloca. Usa `scale`, `rotate` y `translate` independientes, que se componen.
- **Iconos**: Phosphor, como sprite SVG al inicio del `<body>`. El sprite está
  duplicado en las cuatro páginas; si agregas un icono, ponlo en las cuatro.

## Por qué el script se llama `greenova.js` y no `app.js`

Con el nombre `app.js` el navegador descargaba el archivo (200 OK) pero **nunca
lo ejecutaba**: los filtros de contenido bloquean por nombre. El archivo era
idéntico byte por byte. No lo vuelvas a llamar `app.js`, `ads.js`, `analytics.js`
ni `track.js`.

## Cómo se ve el sitio cuando alguien lo comparte

Las cuatro páginas declaran Open Graph completo, con `og:image` **en URL
absoluta**. No es un detalle: WhatsApp, Facebook y LinkedIn no resuelven un
`og:image` relativo y la vista previa sale sin imagen.

Las etiquetas de la ficha usan la constante `SITIO` de `producto.js`, no
`location.origin`, porque la ficha también corre desde `dist/` (origin `null`).
**Si cambia el dominio, se cambia ahí y en `build-sitemap.mjs`.**

### El icono

`favicon.svg` está dibujado a mano a partir del logotipo: las tres hojas con sus
colores exactos (`#749c8b`, `#346554`, `#9ed28e`) sobre placa blanca, porque la
marca es de tres verdes y necesita fondo claro para leerse igual en pestaña clara
y oscura. Coincide 91% píxel a píxel con la marca original.

`favicon.ico` (32×32, PNG dentro de ICO) existe porque **el navegador lo pide
siempre**, aunque haya SVG: sin él, cada carga generaba un 404.

## La plataforma de venta: qué falta y por qué

El sitio actual es **estático**: no puede cobrar, ni cotizar envíos, ni facturar,
ni darte un panel para editar precios. Openpay, Skydropx/Envia.com y Facturama
necesitan servidor, porque **las llaves privadas no pueden vivir en el JavaScript
del navegador** — cualquier visitante las lee.

**El sitio de referencia (wecare) corre sobre Shopify.** Verificado en su código:
`window.Shopify`, `cdn.shopify.com`, botón de pago de Shopify, tema
`Copia actualizada de wecare 2026`, y las apps **Judge.me** (reseñas) y **Envia**
(envíos). No programaron nada de eso: compraron la plataforma y le conectaron
apps. Su panel de Shopify es lo que les da precios editables, SKU, inventario
("Stock bajo: 5 productos"), galería y checkout.

No se pudo confirmar Openpay ni Facturama: el checkout vive en otro dominio.

**Decisión pendiente** entre tres caminos: WooCommerce en Hostinger (los tres
servicios tienen plugin y sigues donde estás), Shopify o Tiendanube (lo que ya
validó la competencia, más caro al mes), o backend propio (más control, más
mantenimiento).

Lo que **no** se hizo, a propósito: un checkout de mentiras con llaves de
ejemplo. Se vería funcional, no cobraría nada, y con llaves reales las estarías
publicando.

## Ver en local

```bash
python3 serve.py
```

Usa `serve.py` en lugar de `python3 -m http.server`: este último no manda cabeceras
de caché, el navegador aplica caché heurística y te deja viendo versiones viejas de
`styles.css` mientras editas. `serve.py` sirve lo mismo con `Cache-Control: no-store`.

## Archivo único

```bash
python3 build-single.py
```

Genera `dist/greenova-landing.html`, `dist/greenova-tienda.html` y
`dist/greenova-ofertas.html`: cada uno con la CSS, el JS y todas las imágenes en
base64, sin carpeta de apoyo. Los enlaces entre páginas se reescriben para apuntar
al archivo hermano.

## Pendientes para producción

0. **Al publicar**: confirma que el dominio real es `www.greenovasc.com.mx`. Está
   escrito en el `canonical` y el `og:` de las cuatro páginas, en la constante
   `SITIO` de `producto.js`, en `build-sitemap.mjs` y en `robots.txt`. Si el sitio
   vive en otro dominio (o sin `www`), hay que cambiarlo en esos cinco lugares o
   el canónico apuntará a un sitio que no existe. Después, corre
   `node build-sitemap.mjs` y da de alta el sitemap en Google Search Console.
1. **Formulario y carrito**: hoy los dos componen un correo con `mailto:` y abren el
   cliente del visitante. Para recibir los envíos directo, sustituye la línea
   `window.location.href = "mailto:..."` en `greenova.js` y en `tienda.js` por un
   `fetch` POST a tu endpoint o a un servicio tipo Formspree.
2. **API key del agente**: ponla en `OPENAI_API_KEY` en el hosting (ver arriba).
   Sin ella el agente funciona en modo RAG y deriva a ventas, pero no resuelve las
   preguntas abiertas.
3. **Fotografía**: las imágenes salen del PDF y esa es toda la resolución que hay
   (las originales incrustadas miden entre 125 y 768 px). Se escalaron 2× con Lanczos
   y se usan a tamaño contenido. Con los originales del fotógrafo se pueden usar al doble.
   A 25 de ellas se les recortó el fondo blanco de estudio, porque venían sin canal alfa
   y se veían como una caja blanca sobre las superficies de color. La única que no se
   pudo recortar es la caja de pizza (blanca sobre blanco): va sobre placa, marcada con
   `placa: true` en `productos.js`.
4. **Sellos del catálogo**: a las fotos de vasos PET, fajilla y cono se les quitó por
   retoque el sello "Tu logo Aquí" del catálogo, porque en una tienda confunde. Si
   prefieres conservarlo en alguna, vuelve a extraerla del PDF.
5. **Logo**: `assets/logo-greenova.webp` es un rasterizado del PDF a 300 dpi. Si existe
   el SVG original, cámbialo: pesa menos y escala perfecto.
6. **Marca — ahora urgente**: en las fotos de mockup el empaque dice `GREENOVA SBC`
   y la empresa es `GREENOVA SC`. Dejó de ser un detalle: la portada usa
   `assets/prod/life-greenova.webp` **a sangre a pantalla completa**, y ahí «SBC» se
   lee perfectamente detrás del titular, en escritorio y en móvil. Es lo primero que
   ve un cliente. Se resuelve retocando el mockup o cambiando la foto de fondo.
7. **Ofertas**: el outlet está listo pero vacío. Dime qué productos van en oferta y con
   qué porcentaje y se llena en una línea por producto (ver arriba).
8. **Dos preguntas que faltan en el FAQ**: mínimo de compra y tiempo de producción.
   No están en el catálogo y no se inventaron. Son las dos que más pregunta un cliente
   nuevo; en cuanto las confirmes se agregan a la sección `#preguntas` de `index.html`.
