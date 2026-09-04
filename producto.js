/* GreeNova SC - ficha de producto.
   ===========================================================================
   Una sola plantilla que se llena con ?id= del catálogo. El carrito, el cajón
   y el toast los sigue manejando tienda.js, que en esta página corre en modo
   solo-carrito (no hay #grid), así que no hay dos versiones de esa lógica.

   Sin precio y sin existencias: GreeNova no publica lista de precios ni tiene
   inventario en vivo. Cada dato de aquí sale del catálogo 2026.
   =========================================================================== */
(function () {
  "use strict";
  if (!window.GREENOVA) return;

  var G = window.GREENOVA;
  var PRODS = G.PRODUCTOS, CATS = G.CATEGORIAS, MATS = G.MATERIALES;
  var PROMOS = G.PROMOS || {};

  var id = new URLSearchParams(location.search).get("id");
  var p = PRODS.filter(function (x) { return x.id === id; })[0];

  var ficha = document.getElementById("ficha");
  var migas = document.getElementById("migas");
  var rel = document.getElementById("relacionados");

  /* ---------- producto inexistente: no dejamos la página en blanco ---------- */
  if (!p) {
    document.title = "Producto no encontrado | GreeNova SC";
    /* Un ?id= roto no debe quedar indexado como página vacía. */
    var nx = document.createElement("meta");
    nx.name = "robots";
    nx.content = "noindex, follow";
    document.head.appendChild(nx);
    migas.innerHTML = '<a href="tienda.html">Tienda</a>';
    ficha.innerHTML =
      '<div class="empty" style="grid-column:1/-1">' +
        '<svg class="ico empty__ico" aria-hidden="true"><use href="#i-search"></use></svg>' +
        "<h1>No encontramos ese producto</h1>" +
        "<p>Puede que el enlace esté mal o que la referencia haya cambiado de nombre. " +
        "El catálogo completo está a un clic.</p>" +
        '<a class="btn btn--primary" href="tienda.html">' +
          '<span class="btn__label">Ver el catálogo</span>' +
          '<svg class="ico" aria-hidden="true"><use href="#i-arrow-right"></use></svg></a>' +
      "</div>";
    return;
  }

  var cat = CATS.filter(function (c) { return c.id === p.cat; })[0] || { nombre: "Catálogo", id: "" };
  var promo = PROMOS[p.id];

  /* Igual que en tienda.js: las rutas pasan por aquí para que build-single.py
     pueda sustituirlas por data URIs en el archivo autocontenido. */
  function src(name) {
    var path = "assets/prod/" + name + ".webp";
    return (window.GN_ASSETS && window.GN_ASSETS[path]) || path;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ======================= cabecera del documento ======================= */

  /* Dominio fijo, no `location.origin`: la ficha también corre desde
     dist/ (origin "null") y desde despliegues de vista previa, y en los dos
     casos el canónico y el og:image tienen que apuntar al sitio de verdad. */
  var SITIO = "https://www.greenovasc.com.mx";
  var urlFicha = SITIO + "/producto.html?id=" + encodeURIComponent(p.id);
  var urlFoto  = SITIO + "/assets/prod/" + p.img + ".webp";

  var titulo = p.nombre + " | " + cat.nombre + " | GreeNova SC";
  var resumen = p.desc + " " + p.v.length +
    (p.v.length === 1 ? " presentación" : " medidas") + " disponibles. Cotización sin compromiso.";

  document.title = titulo;

  /* Las 56 fichas comparten una plantilla; sin estas etiquetas todas se
     anunciaban con el mismo título, la misma foto y sin canónico propio. */
  function meta(clave, valor, attr) {
    var sel = "meta[" + (attr || "property") + '="' + clave + '"]';
    var el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr || "property", clave);
      document.head.appendChild(el);
    }
    el.setAttribute("content", valor);
  }

  meta("description", resumen, "name");
  meta("og:title", titulo);
  meta("og:description", resumen);
  meta("og:url", urlFicha);
  meta("og:image", urlFoto);
  meta("og:image:alt", p.nombre + " — GreeNova SC");

  var can = document.querySelector('link[rel="canonical"]');
  if (!can) {
    can = document.createElement("link");
    can.rel = "canonical";
    document.head.appendChild(can);
  }
  can.href = urlFicha;

  /* Datos estructurados: sin `offers`, porque no hay precio publicado.
     Declarar un precio falso ahí es lo que hace que Google marque la ficha. */
  var ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: p.desc,
    category: cat.nombre,
    material: p.mat.map(function (m) { return MATS[m]; }).join(", "),
    brand: { "@type": "Brand", name: "GreeNova SC" },
    image: urlFoto,
    url: urlFicha
  });
  document.head.appendChild(ld);

  /* Los chips de presentación escriben en el campo oculto y disparan `change`
     para que el carrito de tienda.js se entere igual que con el <select>. */
  document.addEventListener("click", function (e) {
    var chip = e.target.closest(".vchip");
    if (!chip) return;
    var grupo = chip.parentElement;
    Array.prototype.forEach.call(grupo.children, function (c) {
      c.setAttribute("aria-checked", String(c === chip));
    });
    var campo = document.getElementById("f-variante");
    var etiqueta = document.getElementById("variante-actual");
    if (etiqueta) etiqueta.textContent = chip.dataset.v;
    if (campo && campo.value !== chip.dataset.v) {
      campo.value = chip.dataset.v;
      campo.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  /* ======================= migas ======================= */
  migas.innerHTML =
    '<a href="index.html">Inicio</a>' +
    '<span aria-hidden="true">/</span>' +
    '<a href="tienda.html">Tienda</a>' +
    '<span aria-hidden="true">/</span>' +
    '<a href="tienda.html?cat=' + cat.id + '">' + esc(cat.nombre) + "</a>" +
    '<span aria-hidden="true">/</span>' +
    "<b>" + esc(p.nombre) + "</b>";

  /* ======================= certificaciones ======================= */
  /* Solo se declara lo que el catálogo respalda para ESE material. */
  var COMPOSTABLES = ["pla", "bagazo", "paja-trigo", "fecula", "tapioca"];
  var sellos = [];

  if (p.sello === "SEDEMA") {
    sellos.push({
      img: "assets/cert-sedema-compostable.webp",
      t: "Registro SEDEMA",
      c: "Registrado ante la Secretaría del Medio Ambiente de la Ciudad de México."
    });
  }
  if (p.mat.indexOf("papel") > -1 || p.mat.indexOf("kraft") > -1 || p.mat.indexOf("carton") > -1) {
    sellos.push({
      img: "assets/cert-fsc.webp",
      t: "Papel FSC",
      c: "Fibra con certificación FSC, que acredita manejo forestal responsable."
    });
  }
  var comp = p.mat.filter(function (m) { return COMPOSTABLES.indexOf(m) > -1; });
  if (comp.length) {
    sellos.push({
      ico: "i-leaf",
      t: "Compostable",
      c: "Hecho de " + comp.map(function (m) { return MATS[m].toLowerCase(); }).join(" y ") +
         ". Se degrada con la fracción orgánica."
    });
  }
  if (p.mat.indexOf("pet") > -1) {
    sellos.push({
      ico: "i-recycle",
      t: "PET",
      c: "Plástico transparente para bebida fría. Si necesitas la versión compostable, existe en PLA."
    });
  }

  /* ======================= características ======================= */
  var cars = [];
  cars.push({ ico: "i-package", t: "Material", c: p.mat.map(function (m) { return MATS[m]; }).join(", ") });
  cars.push({ ico: "i-ruler", t: p.v.length === 1 ? "Presentación" : "Medidas disponibles",
              c: p.v.length + (p.v.length === 1 ? " presentación" : " medidas") + ": " + p.v.join(" · ") });
  if (p.p) cars.push({ ico: "i-shopping-bag", t: "Piezas por caja", c: p.p.toLocaleString("es-MX") + " piezas" });
  cars.push({ ico: "i-truck", t: "Envío", c: "A nivel nacional, con salida desde la Ciudad de México." });
  cars.push({ ico: "i-paint-brush-broad", t: "Personalización",
              c: "Se puede imprimir tu logo en serigrafía. También producimos formatos a medida." });
  if (p.servicio) cars.push({ ico: "i-sparkle", t: "Producción bajo pedido",
              c: "Esta referencia se fabrica para tu pedido; no sale de inventario estándar." });

  /* ======================= ficha ======================= */
  var opciones = p.v.map(function (v) {
    return '<option value="' + esc(v) + '">' + esc(v) + "</option>";
  }).join("");

  ficha.innerHTML =
    /* --- galería --- */
    '<div class="ficha__media">' +
      '<div class="ficha__foto' + (p.placa ? " ficha__foto--placa" : "") + '">' +
        (promo && promo.desc ? '<span class="pcard__flag pcard__flag--off">-' + promo.desc + "%</span>" : "") +
        (p.destacado ? '<span class="pcard__flag">Más pedido</span>' : "") +
        '<img src="' + src(p.img) + '" alt="' + esc(p.nombre) + '" width="800" height="600" fetchpriority="high">' +
      "</div>" +
      '<p class="ficha__nota">Foto de referencia del catálogo 2026. El acabado final puede variar según la medida.</p>' +
    "</div>" +

    /* --- columna de compra --- */
    '<div class="ficha__compra" data-id="' + p.id + '">' +
      '<p class="eyebrow"><a href="tienda.html?cat=' + cat.id + '">' + esc(cat.nombre) + "</a></p>" +
      "<h1>" + esc(p.nombre) + "</h1>" +
      '<p class="ficha__lede">' + esc(p.desc) + "</p>" +

      '<div class="ficha__tags">' +
        p.mat.map(function (m) {
          return '<span class="tag tag--' + m + '">' + MATS[m] + "</span>";
        }).join("") +
      "</div>" +

      '<div class="ficha__bloque">' +
        '<p class="ficha__label" id="lbl-variante">Presentación: ' +
          '<b class="ficha__variante" id="variante-actual">' + esc(p.v[0]) + "</b></p>" +
        /* Chips visibles + un campo oculto con el valor: el carrito lee
           `[data-role="variant"]`.value, así que el contrato con tienda.js no
           cambia y no hubo que tocar su lógica. */
        '<div class="vchips" role="radiogroup" aria-labelledby="lbl-variante">' +
          p.v.map(function (v, k) {
            return '<button type="button" class="vchip" role="radio" data-v="' + esc(v) + '"' +
                   ' aria-checked="' + (k === 0 ? "true" : "false") + '">' + esc(v) + "</button>";
          }).join("") +
        "</div>" +
        '<input type="hidden" id="f-variante" data-role="variant" value="' + esc(p.v[0]) + '">' +
        (p.p ? '<p class="ficha__hint">Cada caja trae ' + p.p.toLocaleString("es-MX") + " piezas.</p>" : "") +
      "</div>" +

      '<div class="ficha__bloque">' +
        '<label class="ficha__label" for="f-cant">Cajas</label>' +
        '<div class="ficha__acciones">' +
          '<div class="stepper" data-role="stepper">' +
            '<button type="button" data-step="-1" aria-label="Quitar una caja">' +
              '<svg class="ico" aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
            '<input id="f-cant" type="number" min="1" max="999" value="1" data-role="qty" aria-label="Cajas">' +
            '<button type="button" data-step="1" aria-label="Agregar una caja">' +
              '<svg class="ico" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
          "</div>" +
          '<button class="btn btn--primary pcard__add" type="button" data-role="add">' +
            '<span class="btn__label">Añadir al carrito</span>' +
            '<svg class="ico" aria-hidden="true"><use href="#i-plus"></use></svg>' +
          "</button>" +
        "</div>" +
        '<button class="btn btn--ghost btn--block" type="button" ' +
          'data-agente="Cuéntame más sobre ' + esc(p.nombre) + '. ¿Qué medidas hay y para qué se usa?">' +
          '<svg class="ico" aria-hidden="true"><use href="#i-sparkle"></use></svg>' +
          '<span class="btn__label">Preguntar por este producto</span>' +
        "</button>" +
      "</div>" +

      '<p class="ficha__precio">' +
        '<svg class="ico" aria-hidden="true"><use href="#i-seal-check"></use></svg>' +
        "Precio bajo cotización. Depende de la medida y del volumen; ventas te contesta sin compromiso." +
      "</p>" +

      '<ul class="ficha__cars">' +
        cars.map(function (c) {
          return '<li><svg class="ico" aria-hidden="true"><use href="#' + c.ico + '"></use></svg>' +
                 "<div><b>" + c.t + "</b><span>" + esc(c.c) + "</span></div></li>";
        }).join("") +
      "</ul>" +
    "</div>";

  /* ======================= certificaciones + relacionados ======================= */
  /* Los relacionados son del mismo grupo del catálogo, tal como el catálogo
     los divide: no se arman kits ni combinaciones inventadas. */
  var hermanos = PRODS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).slice(0, 4);

  rel.innerHTML =
    '<div class="wrap">' +
      (sellos.length ?
        '<div class="certs-ficha rv">' +
          '<h2>Lo que respalda este producto</h2>' +
          '<div class="certs-ficha__grid">' +
            sellos.map(function (s) {
              return '<div class="certs-ficha__item">' +
                (s.img ? '<img src="' + s.img + '" alt="" height="54" loading="lazy">' :
                         '<svg class="ico" aria-hidden="true"><use href="#' + s.ico + '"></use></svg>') +
                "<div><b>" + s.t + "</b><span>" + esc(s.c) + "</span></div></div>";
            }).join("") +
          "</div>" +
        "</div>" : "") +

      (hermanos.length ?
        '<div class="head rv" style="margin-top:56px">' +
          "<h2>Más de " + esc(cat.nombre.toLowerCase()) + "</h2>" +
          "<p>El resto del grupo, tal como viene dividido en el catálogo.</p>" +
        "</div>" +
        '<div class="grid-prod">' +
          hermanos.map(function (h, i) {
            return '<a class="pcard pcard--link rv" data-d="' + (i % 4) + '" href="producto.html?id=' + h.id + '">' +
              '<div class="pcard__media' + (h.placa ? " pcard__media--placa" : "") + '">' +
                '<img src="' + src(h.img) + '" alt="" loading="lazy" decoding="async"></div>' +
              '<div class="pcard__body">' +
                '<div class="pcard__tags">' +
                  h.mat.map(function (m) { return '<span class="tag tag--' + m + '">' + MATS[m] + "</span>"; }).join("") +
                "</div>" +
                "<h3>" + esc(h.nombre) + "</h3>" +
                '<p class="pcard__desc">' + esc(h.desc) + "</p>" +
              "</div></a>";
          }).join("") +
        "</div>" : "") +

      '<div class="band" style="padding-top:56px">' +
        '<div class="band__inner rv">' +
          "<div><h2>¿Necesitas otra medida?</h2>" +
          "<p>El catálogo es el punto de partida. Si buscas un formato, material o volumen " +
          "que no aparece aquí, lo cotizamos.</p></div>" +
          '<div class="band__actions">' +
            '<button class="btn btn--primary" type="button" ' +
              'data-agente="Necesito una medida que no está en el catálogo. ¿Qué opciones hay?">' +
              '<span class="btn__label">Preguntar por más modelos</span>' +
              '<svg class="ico" aria-hidden="true"><use href="#i-sparkle"></use></svg>' +
            "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>";

  if (window.GN && window.GN.observe) window.GN.observe(rel.querySelectorAll(".rv"));

  /* Si el producto ya está en el carrito, el botón arranca en "Actualizar"
     y con la medida y las cajas que se eligieron antes. Se lee la misma llave
     que escribe tienda.js. */
  try {
    var guardado = JSON.parse(localStorage.getItem("greenova.cotizacion.v1") || "[]");
    var linea = guardado.filter(function (l) { return l && l.id === p.id; })[0];
    if (linea) {
      var caja = ficha.querySelector(".ficha__compra");
      caja.dataset.in = "true";
      caja.querySelector(".pcard__add .btn__label").textContent = "Actualizar";
      caja.querySelector(".pcard__add use").setAttribute("href", "#i-check");
      var sel = document.getElementById("f-variante");
      if (p.v.indexOf(linea.v) > -1) sel.value = linea.v;
      document.getElementById("f-cant").value = linea.qty;
    }
  } catch (e) { /* modo privado */ }
})();
