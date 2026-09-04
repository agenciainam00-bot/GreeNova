/* GreeNova SC - probador de logo.
   ===========================================================================
   El visitante sube su logo y lo ve estampado sobre un producto real del
   catálogo. Todo pasa en el navegador: el archivo nunca se sube a un servidor,
   no hay API de por medio y no cuesta nada por uso.

   Cómo se ve "impreso" y no "pegado encima":

   1. El logo se dibuja con blend `multiply` (tinta oscura) o `screen` (tinta
      clara). Así hereda las sombras y los pliegues de la foto, que es lo que
      delata a un montaje hecho con opacidad plana.
   2. Sobre el vaso se curva: se corta en tiras verticales y cada tira se
      desplaza siguiendo un arco y se encoge hacia los bordes, que es como se
      comporta una superficie cilíndrica.
   3. Se recorta al área imprimible del producto, para que la tinta no se salga
      del cartón.

   Las zonas imprimibles están medidas sobre cada foto, en proporción (0 a 1),
   así que siguen valiendo aunque el canvas cambie de tamaño.
   =========================================================================== */
(function () {
  "use strict";

  var raiz = document.getElementById("probador");
  if (!raiz || !window.HTMLCanvasElement) return;

  var lienzo = document.getElementById("pb-canvas");
  var ctx = lienzo.getContext("2d");
  if (!ctx) return;

  /* --------------------------- los productos --------------------------- */

  var PRODUCTOS = {
    vaso: {
      /* Se usa la foto del par de vasos, no la del vaso solo: tiene 692 px de
         ancho contra 400, y el estampado se ve mucho más nítido. Se imprime
         sobre el vaso de adelante. */
      img: "assets/prod/vaso-papel-par.webp",
      w: 692, h: 782,
      /* área imprimible, en proporción de la foto */
      area: { x: 0.42, y: 0.38, w: 0.46, h: 0.26 },
      curva: 0.16,          /* qué tanto se arquea la tinta sobre el cilindro */
      encoge: 0.14          /* achatamiento hacia los bordes del vaso */
    },
    kraft: {
      img: "assets/prod/contenedor-kraft-rect.webp",
      w: 680, h: 590,
      /* pared frontal del contenedor de en medio, ya libre del que está
         recargado a la izquierda */
      area: { x: 0.50, y: 0.31, w: 0.38, h: 0.17 },
      curva: 0.05,
      encoge: 0.05
    }
  };

  var estado = {
    prod: "vaso",
    tinta: "oscura",
    tam: 0.86,             /* ancho del logo respecto al área imprimible */
    cx: 0.5, cy: 0.5,      /* centro del logo dentro del área imprimible */
    logo: null,
    logoClaro: null,       /* la misma silueta en blanco, para tinta clara */
    fondo: null
  };

  var fondos = {};   /* fotos ya cargadas, para no pedirlas de nuevo */

  function cargarFondo(clave, listo) {
    if (fondos[clave]) { listo(fondos[clave]); return; }
    var img = new Image();
    img.onload = function () { fondos[clave] = img; listo(img); };
    img.onerror = function () { listo(null); };
    img.src = PRODUCTOS[clave].img;
  }

  /* ---------------------------- el dibujado ---------------------------- */

  /* El canvas se dibuja al doble de la foto. En pantallas retina un canvas a 1x
     se ve lavado, y la descarga salía pequeña. Todo el resto del código sigue
     trabajando en coordenadas de la foto gracias al setTransform. */
  var ESCALA = 2;

  function pintar() {
    var p = PRODUCTOS[estado.prod];
    lienzo.width = p.w * ESCALA;
    lienzo.height = p.h * ESCALA;
    ctx.setTransform(ESCALA, 0, 0, ESCALA, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, p.w, p.h);

    if (estado.fondo) ctx.drawImage(estado.fondo, 0, 0, p.w, p.h);
    if (!estado.logo) return;

    var area = {
      x: p.area.x * p.w, y: p.area.y * p.h,
      w: p.area.w * p.w, h: p.area.h * p.h
    };

    /* El logo entra completo en el ancho pedido, conservando su proporción. */
    var anchoLogo = Math.min(area.w * estado.tam, area.w);
    var altoLogo = anchoLogo * (estado.logo.height / estado.logo.width);
    if (altoLogo > area.h) {
      altoLogo = area.h;
      anchoLogo = altoLogo * (estado.logo.width / estado.logo.height);
    }

    var x0 = area.x + estado.cx * area.w - anchoLogo / 2;
    var y0 = area.y + estado.cy * area.h - altoLogo / 2;

    ctx.save();
    /* Fuera del área imprimible no hay cartón donde imprimir. */
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();

    var claro = estado.tinta === "clara";
    var arte = estado.logo;
    if (claro) {
      if (!estado.logoClaro) estado.logoClaro = versionClara(estado.logo);
      arte = estado.logoClaro;
    }
    ctx.globalCompositeOperation = claro ? "screen" : "multiply";
    ctx.globalAlpha = claro ? 0.95 : 0.88;

    /* Tiras verticales: cada una baja un poco según el arco y se angosta
       hacia los lados, que es lo que hace que se lea como envuelto. */
    var TIRAS = 48;
    var paso = anchoLogo / TIRAS;
    var pasoOrigen = arte.width / TIRAS;

    for (var i = 0; i < TIRAS; i++) {
      var t = (i + 0.5) / TIRAS;          /* 0 a 1 a lo ancho del logo */
      var d = (t - 0.5) * 2;              /* -1 en el borde izquierdo, 1 en el derecho */

      var caida = p.curva * altoLogo * (d * d);          /* el arco */
      var factor = 1 - p.encoge * (d * d);               /* el achatamiento */
      var anchoTira = paso * factor;
      var xTira = x0 + anchoLogo / 2 + (t - 0.5) * anchoLogo * (1 - p.encoge / 2);

      ctx.drawImage(
        arte,
        i * pasoOrigen, 0, pasoOrigen, arte.height,
        xTira - anchoTira / 2, y0 + caida, anchoTira + 0.6, altoLogo
      );
    }
    ctx.restore();
  }

  /* ------------------------------ la carga ------------------------------ */

  /* Casi todos los logos vienen con margen de sobra alrededor. Si se estampa
     tal cual, el dibujo se ve chico y descentrado aunque el archivo esté bien.
     Aquí se mide dónde empieza y termina la tinta de verdad y se recorta.

     Cuenta como tinta lo que no es transparente Y no es casi blanco: así
     también funciona con JPG, que no tienen transparencia sino fondo blanco.
     (Ese fondo blanco luego desaparece solo con el blend `multiply`.) */
  /* Muchos "logos" llegan como captura de pantalla o JPG: un rectángulo con
     fondo sólido. Si se estampa así, lo que se ve es el rectángulo, no la
     marca. Aquí se detecta ese fondo y se vuelve transparente.

     Se rellena desde el borde hacia adentro (como el bote de pintura de
     Photoshop, al revés): solo desaparece lo que está conectado con la orilla,
     así un logo con fondo blanco pierde el fondo pero conserva sus blancos
     interiores. Si la orilla no es de un color parejo, es una foto y no se
     toca nada. */
  function quitarFondo(c) {
    var g = c.getContext("2d");
    var im, d;
    try {
      im = g.getImageData(0, 0, c.width, c.height);
      d = im.data;
    } catch (e) { return c; }

    var w = c.width, h = c.height;

    /* ¿La orilla es de un solo color? Se muestrea todo el perímetro. */
    var muestras = [], i, x, y;
    for (x = 0; x < w; x += Math.max(1, Math.floor(w / 60))) {
      muestras.push((0 * w + x) * 4, ((h - 1) * w + x) * 4);
    }
    for (y = 0; y < h; y += Math.max(1, Math.floor(h / 60))) {
      muestras.push((y * w) * 4, (y * w + w - 1) * 4);
    }

    var sr = 0, sg = 0, sb = 0, opacas = 0;
    for (i = 0; i < muestras.length; i++) {
      var m = muestras[i];
      if (d[m + 3] < 16) continue;          /* ya es transparente */
      sr += d[m]; sg += d[m + 1]; sb += d[m + 2]; opacas++;
    }
    if (opacas < muestras.length * 0.6) return c;   /* el PNG ya venía recortado */

    var fr = sr / opacas, fg = sg / opacas, fb = sb / opacas;

    var disperso = 0;
    for (i = 0; i < muestras.length; i++) {
      var k = muestras[i];
      if (d[k + 3] < 16) continue;
      var dist = Math.abs(d[k] - fr) + Math.abs(d[k + 1] - fg) + Math.abs(d[k + 2] - fb);
      if (dist > 90) disperso++;
    }
    if (disperso > opacas * 0.25) return c;         /* orilla con dibujo: es una foto */

    /* Relleno por difusión desde toda la orilla. Se trabaja sobre una copia:
       si el fondo y la tinta son casi del mismo color, el relleno se comería el
       logo entero, y en ese caso es mejor no tocar nada. */
    var original = new Uint8ClampedArray(d);
    var TOL = 70;
    var visto = new Uint8Array(w * h);
    var pila = [];
    for (x = 0; x < w; x++) { pila.push(x, (h - 1) * w + x); }
    for (y = 0; y < h; y++) { pila.push(y * w, y * w + w - 1); }

    while (pila.length) {
      var pos = pila.pop();
      if (pos < 0 || pos >= w * h || visto[pos]) continue;
      visto[pos] = 1;
      var j = pos * 4;
      if (d[j + 3] < 16) {                  /* transparente: sigue avanzando */
        empujar(pila, pos, w, h);
        continue;
      }
      var difer = Math.abs(d[j] - fr) + Math.abs(d[j + 1] - fg) + Math.abs(d[j + 2] - fb);
      if (difer > TOL) continue;            /* aquí empieza la tinta */
      d[j + 3] = 0;
      empujar(pila, pos, w, h);
    }

    /* El seguro mide lo que QUEDA, no lo que se borró: un logotipo de letras
       finas sobre un fondo grande borra el 95% de la imagen y eso está bien.
       Lo que no puede pasar es quedarse sin nada, que es lo que ocurre cuando
       la tinta es casi del mismo color que el fondo. */
    var restantes = 0;
    for (var q = 3; q < d.length; q += 4) {
      if (d[q] > 16) restantes++;
    }
    if (restantes < Math.max(120, w * h * 0.001)) {
      im.data.set(original);
      g.putImageData(im, 0, 0);
      return c;
    }

    g.putImageData(im, 0, 0);
    return c;
  }

  function empujar(pila, pos, w, h) {
    var x = pos % w, y = (pos - x) / w;
    if (x > 0) pila.push(pos - 1);
    if (x < w - 1) pila.push(pos + 1);
    if (y > 0) pila.push(pos - w);
    if (y < h - 1) pila.push(pos + w);
  }

  function recortar(img) {
    /* Se normaliza a un canvas de trabajo. Un archivo enorme se baja a 1400 px
       de ancho: más resolución que esa no aporta nada al estampado y hace
       lentísimo el análisis pixel por pixel. */
    var an = img.naturalWidth || img.width;
    var al = img.naturalHeight || img.height;
    if (!an || !al) return img;

    var k = Math.min(1, 1400 / an);
    var c = document.createElement("canvas");
    c.width = Math.round(an * k);
    c.height = Math.round(al * k);

    var g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, c.width, c.height);

    quitarFondo(c);

    var datos;
    try {
      datos = g.getImageData(0, 0, c.width, c.height).data;
    } catch (e) {
      return img;                     /* navegador que no deja leer el canvas */
    }

    var minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (var y = 0; y < c.height; y++) {
      for (var x = 0; x < c.width; x++) {
        var i = (y * c.width + x) * 4;
        if (datos[i + 3] < 16) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0 || maxY < 0) return c;            /* quedó vacío: se deja como estaba */

    var ancho = maxX - minX + 1, alto = maxY - minY + 1;
    if (ancho > c.width * 0.98 && alto > c.height * 0.98) return c;     /* ya venía justo */

    var margen = Math.round(Math.max(ancho, alto) * 0.02);
    var rx = Math.max(0, minX - margen), ry = Math.max(0, minY - margen);
    var rw = Math.min(c.width - rx, ancho + margen * 2);
    var rh = Math.min(c.height - ry, alto + margen * 2);

    var corte = document.createElement("canvas");
    corte.width = rw;
    corte.height = rh;
    var gc = corte.getContext("2d");
    gc.imageSmoothingQuality = "high";
    gc.drawImage(c, rx, ry, rw, rh, 0, 0, rw, rh);
    return corte;
  }

  /* Serigrafía a una tinta: el archivo del cliente casi siempre viene en negro,
     pero sobre kraft muchas veces se imprime en blanco. Aquí se rehace el logo
     con su misma silueta, relleno en blanco. Si el archivo es un JPG con fondo
     blanco, ese fondo se vuelve transparente primero; si no, el "logo" sería un
     rectángulo blanco entero. */
  function versionClara(fuente) {
    var c = document.createElement("canvas");
    c.width = fuente.width;
    c.height = fuente.height;
    var g = c.getContext("2d");
    g.drawImage(fuente, 0, 0);

    try {
      var im = g.getImageData(0, 0, c.width, c.height);
      var d = im.data;
      for (var i = 0; i < d.length; i += 4) {
        var luz = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        if (luz > 244) d[i + 3] = 0;         /* el fondo blanco no es tinta */
      }
      g.putImageData(im, 0, 0);
    } catch (e) { /* si no se puede leer, se usa la silueta tal cual */ }

    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  var nombre = document.getElementById("pb-nombre");
  var pista = document.getElementById("pb-pista");

  function tomarArchivo(archivo) {
    if (!archivo || !/^image\//.test(archivo.type)) return;
    if (archivo.size > 5 * 1024 * 1024) {
      nombre.textContent = "Ese archivo pesa más de 5 MB";
      return;
    }
    var url = URL.createObjectURL(archivo);
    var img = new Image();
    img.onload = function () {
      estado.logo = recortar(img);
      estado.logoClaro = null;
      estado.cx = 0.5; estado.cy = 0.5;
      nombre.textContent = archivo.name.length > 28
        ? archivo.name.slice(0, 25) + "…" : archivo.name;
      raiz.dataset.conLogo = "true";
      if (pista) pista.hidden = false;
      pintar();
    };
    img.onerror = function () {
      nombre.textContent = "No pude leer esa imagen";
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  document.getElementById("pb-archivo").addEventListener("change", function () {
    tomarArchivo(this.files && this.files[0]);
  });

  var zona = document.getElementById("pb-soltar");
  ["dragenter", "dragover"].forEach(function (ev) {
    zona.addEventListener(ev, function (e) { e.preventDefault(); zona.dataset.encima = "true"; });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    zona.addEventListener(ev, function (e) { e.preventDefault(); delete zona.dataset.encima; });
  });
  zona.addEventListener("drop", function (e) {
    tomarArchivo(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });

  /* ----------------------------- controles ----------------------------- */

  function grupo(id, atributo, alCambiar) {
    var caja = document.getElementById(id);
    caja.addEventListener("click", function (e) {
      var b = e.target.closest("button[" + atributo + "]");
      if (!b) return;
      caja.querySelectorAll("button").forEach(function (o) {
        o.setAttribute("aria-pressed", String(o === b));
      });
      alCambiar(b.getAttribute(atributo));
    });
  }

  grupo("pb-producto", "data-prod", function (v) {
    estado.prod = v;
    estado.cx = 0.5; estado.cy = 0.5;
    cargarFondo(v, function (img) { estado.fondo = img; pintar(); });
  });

  grupo("pb-tinta", "data-tinta", function (v) { estado.tinta = v; pintar(); });

  document.getElementById("pb-tam").addEventListener("input", function () {
    estado.tam = Number(this.value) / 100;
    pintar();
  });

  /* Arrastrar el logo dentro del área imprimible. Se trabaja en proporciones
     para que dé igual el tamaño con el que el navegador esté mostrando el
     canvas. */
  var arrastrando = false;

  function mover(e) {
    var caja = lienzo.getBoundingClientRect();
    var punto = e.touches ? e.touches[0] : e;
    var p = PRODUCTOS[estado.prod];
    var px = (punto.clientX - caja.left) / caja.width;
    var py = (punto.clientY - caja.top) / caja.height;
    estado.cx = Math.max(0, Math.min(1, (px - p.area.x) / p.area.w));
    estado.cy = Math.max(0, Math.min(1, (py - p.area.y) / p.area.h));
    pintar();
  }

  lienzo.addEventListener("pointerdown", function (e) {
    if (!estado.logo) return;
    arrastrando = true;
    try { lienzo.setPointerCapture(e.pointerId); } catch (err) { /* puntero sintético */ }
    mover(e);
  });
  lienzo.addEventListener("pointermove", function (e) {
    if (arrastrando) { e.preventDefault(); mover(e); }
  });
  ["pointerup", "pointercancel"].forEach(function (ev) {
    lienzo.addEventListener(ev, function () { arrastrando = false; });
  });

  document.getElementById("pb-bajar").addEventListener("click", function () {
    if (!estado.logo) { document.getElementById("pb-archivo").click(); return; }
    try {
      var a = document.createElement("a");
      a.href = lienzo.toDataURL("image/png");
      a.download = "greenova-mi-logo-" + estado.prod + ".png";
      a.click();
    } catch (err) { /* algún navegador viejo sin toDataURL */ }
  });

  /* ------------------------------ arranque ------------------------------ */

  cargarFondo(estado.prod, function (img) { estado.fondo = img; pintar(); });
})();
