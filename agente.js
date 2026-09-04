/* GreeNova SC - agente de atención.
   ===========================================================================
   Dos niveles, en este orden:

   1. RAG local. El catálogo completo (56 productos) y los HECHOS de
      agente-criterios.js se indexan en el navegador. Se puntúa la pregunta
      contra ese índice; si un resultado gana con holgura, se contesta al
      instante con el dato real. Cero latencia, cero costo, cero riesgo de
      que se invente algo.

   2. Claude. Si el RAG no gana con holgura, se manda la pregunta al endpoint
      con los mejores pasajes recuperados y con los criterios. La API key vive
      SOLO en el servidor (ver api/chat.js y el README): aquí nunca aparece.

   Si el endpoint no está desplegado, el widget sigue funcionando en modo RAG
   y, cuando no sabe, entrega el contacto de ventas.
   =========================================================================== */
(function () {
  "use strict";
  if (!window.GREENOVA || !window.GREENOVA_AGENTE) return;

  var CFG = window.GREENOVA_AGENTE;
  var PRODS = window.GREENOVA.PRODUCTOS;
  var CATS = window.GREENOVA.CATEGORIAS;
  var MATS = window.GREENOVA.MATERIALES;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ======================= índice de recuperación ======================= */

  function norm(s) {
    return String(s).toLowerCase().normalize("NFD")
      .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s.]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  /* Palabras que no aportan nada al emparejamiento. */
  var VACIAS = norm("de la el los las un una y o que en para por con del al se su sus" +
    " me te lo les cual cuales como cuanto cuanta cuantos cuantas tienen tiene hay" +
    " puedo puede pueden quiero necesito busco es son esta este estos estas mi mis" +
    " a ustedes usted si no").split(" ");

  function tokens(s) {
    return norm(s).split(" ").filter(function (t) {
      return t.length > 2 && VACIAS.indexOf(t) === -1;
    });
  }

  /* Lematización cruda para español: se corta a seis letras. Con eso
     imprimir / imprime / impresión caen en la misma raíz, igual que
     envío / envíos / enviar o contenedor / contenedores. Es tosco, pero para
     un corpus de este tamaño funciona mejor que exigir prefijo exacto. */
  function raiz(t) { return t.length > 6 ? t.slice(0, 6) : t; }

  function raices(s) { return tokens(s).map(raiz); }

  /* Expansión por equivalencias: nadie pregunta por "vaso de papel", preguntan
     por café. Antes de puntuar, la pregunta se enriquece en silencio con los
     términos del catálogo que le corresponden. La tabla se edita en
     agente-criterios.js (SINONIMOS); aquí solo se aplica. */
  var SINON = (CFG.SINONIMOS || []).map(function (s) {
    return {
      /* Palabra completa, con el plural tolerado: "cafe" tiene que pegar en
         "cafes" pero no dentro de "cafeteria", y "te" no puede pegar dentro
         de "contenedor". Por eso se compara con frontera, no por substring. */
      dice: s.dice.map(function (t) {
        return new RegExp("(^| )" + norm(t).replace(/\./g, "\\.") + "(e?s)?( |$)");
      }),
      es: s.es
    };
  });

  /* Las mismas equivalencias, en prosa, viajan a la IA dentro del prefijo de
     criterios: la búsqueda ya trae los productos correctos, y esto evita que
     Claude conteste con la palabra del visitante en vez de la del catálogo. */
  var CRITERIOS_IA = CFG.CRITERIOS.concat((CFG.SINONIMOS || []).map(function (s) {
    return "Equivalencia de vocabulario: si dicen " +
      s.dice.slice(0, 6).join(", ") + " se refieren a " + s.es + ".";
  }));

  function expandir(pregunta) {
    var n = norm(pregunta);
    var extra = "";
    SINON.forEach(function (s) {
      for (var i = 0; i < s.dice.length; i++) {
        if (s.dice[i].test(n)) { extra += " " + s.es; return; }
      }
    });
    return pregunta + extra;
  }

  /* Cada documento: título, cuerpo, y un enlace opcional. */
  var DOCS = [];

  PRODS.forEach(function (p) {
    var cat = (CATS.filter(function (c) { return c.id === p.cat; })[0] || {}).nombre || "";
    var mats = p.mat.map(function (m) { return MATS[m]; }).join(", ");
    DOCS.push({
      tipo: "producto",
      id: p.id,
      titulo: p.nombre,
      cuerpo: p.desc + " Categoría: " + cat + ". Material: " + mats + "." +
              (p.p ? " Caja de " + p.p.toLocaleString("es-MX") + " piezas." : "") +
              " Medidas disponibles: " + p.v.join("; ") + ".",
      enlace: "tienda.html?cat=" + p.cat,
      prod: p
    });
  });

  CFG.HECHOS.forEach(function (h) {
    DOCS.push({ tipo: "hecho", titulo: h.t, cuerpo: h.c });
  });

  /* Pre-tokenización: el título pesa más que el cuerpo. */
  DOCS.forEach(function (d) {
    d._set = {};
    raices(d.titulo).forEach(function (w) { d._set[w] = (d._set[w] || 0) + 3; });
    raices(d.cuerpo).forEach(function (w) { d._set[w] = (d._set[w] || 0) + 1; });
  });

  /* Frecuencia inversa: una palabra que sale en todos los documentos no
     distingue nada, así que pesa menos. */
  var IDF = {};
  DOCS.forEach(function (d) {
    Object.keys(d._set).forEach(function (w) { IDF[w] = (IDF[w] || 0) + 1; });
  });
  Object.keys(IDF).forEach(function (w) {
    IDF[w] = Math.log(1 + DOCS.length / IDF[w]);
  });

  function buscar(pregunta, k) {
    /* Sin repetidos: si la equivalencia agrega una palabra que la persona ya
       había escrito, no debe contar doble. */
    var qs = raices(expandir(pregunta)).filter(function (w, i, a) {
      return a.indexOf(w) === i;
    });
    if (!qs.length) return [];
    var nq = norm(pregunta);

    var puntuados = DOCS.map(function (d) {
      var s = 0;
      qs.forEach(function (w) {
        if (d._set[w]) s += d._set[w] * (IDF[w] || 1);
      });
      /* el nombre completo dentro de la pregunta es señal fuerte */
      if (nq.indexOf(norm(d.titulo)) > -1) s += 14;
      return { d: d, s: s / Math.sqrt(qs.length) };
    }).filter(function (x) { return x.s > 0; });

    puntuados.sort(function (a, b) { return b.s - a.s; });
    return puntuados.slice(0, k || 5);
  }

  /* ======================= carrito del visitante =======================
     Lo que ya marcó en la tienda vive en localStorage. El asistente lo lee para
     no preguntar de cero lo que la persona ya eligió. */

  var CARRITO_KEY = "greenova.cotizacion.v1";
  var TEL = "55 2260 1113";
  var CORREO = "ventas@greenovasc.com.mx";

  function carrito() {
    var lineas = [];
    try {
      var guardado = JSON.parse(localStorage.getItem(CARRITO_KEY) || "[]");
      if (!Array.isArray(guardado)) return lineas;
      guardado.forEach(function (l) {
        if (!l || !l.id || !l.qty) return;
        var p = PRODS.filter(function (x) { return x.id === l.id; })[0];
        if (p) lineas.push({ nombre: p.nombre, v: l.v || "", qty: l.qty });
      });
    } catch (e) { /* modo privado, o dato viejo que ya no parsea */ }
    return lineas;
  }

  function carritoTexto(lineas) {
    return lineas.map(function (l) {
      return l.qty + (l.qty === 1 ? " caja de " : " cajas de ") +
             l.nombre.toLowerCase() + (l.v ? " (" + l.v + ")" : "");
    }).join("; ");
  }

  /* Querer comprar no es una pregunta de catálogo: se contesta aquí, con lo que
     la persona ya trae, y sin mandarla a leer instrucciones. */
  var QUIERE_PEDIR = /\b(cotizar|cotizacion|cotizacon|cotizame|comprar|compro|pedido|pedir|ordenar|orden|carrito)\b/;

  function respuestaPedido(pregunta) {
    if (!QUIERE_PEDIR.test(norm(pregunta))) return null;
    var lineas = carrito();

    if (lineas.length) {
      return {
        texto: "En tu carrito llevas " + carritoTexto(lineas) + ". Envíalo y ventas " +
               "te regresa el precio y el tiempo de entrega. Si quieres adelantarlo o " +
               "sumar algo más, marca al " + TEL + " o escribe a " + CORREO + ".",
        fuente: "Tu carrito",
        enlace: "tienda.html",
        enlaceTexto: "Abrir mi carrito"
      };
    }

    return {
      texto: "Con gusto. ¿Qué productos necesitas y en qué medida? Por ejemplo: vaso de " +
             "papel de 12 oz, o contenedor kraft de 500 ml. Dime también cuántas cajas de " +
             "cada uno y armamos la lista. Si prefieres hablarlo, marca al " + TEL +
             " o escribe a " + CORREO + ".",
      fuente: "Cotización",
      enlaceTexto: "Ver el catálogo",
      enlace: "tienda.html"
    };
  }

  /* Un vendedor no dice "4 oz" cuando el vaso existe en seis medidas: dice el
     rango. Si todas las variantes comparten medida (mismo tamaño, distinto
     color), con una basta. */
  function medida(p) {
    if (!p.v || !p.v.length) return "";
    var a = p.v[0].split("\u00b7")[0].trim();
    var b = p.v[p.v.length - 1].split("\u00b7")[0].trim();
    if (p.v.length === 1 || a === b) return a;

    /* El rango solo se arma cuando las dos puntas son medidas de verdad y van
       de menor a mayor. Con etiquetas como "Chica" o "Modelo 8A" un rango sale
       absurdo ("de Chica a A medida"), así que ahí se dice cuántas hay. */
    var na = parseFloat(a), nb = parseFloat(b);
    var sonMedidas = /^\d/.test(a) && /^\d/.test(b) && !isNaN(na) && !isNaN(nb);
    if (sonMedidas && na < nb) return "de " + a + " a " + b;
    return p.v.length + " medidas";
  }

  /* ======================= recomendación por giro =======================
     Antes de buscar en el catálogo palabra por palabra, se revisa si la persona
     está describiendo su negocio o su necesidad. Ahí no hay que buscar: hay que
     recomendar, que es lo que haría un vendedor. La tabla se edita en
     agente-criterios.js (GIROS). */

  var GIROS = (CFG.GIROS || []).map(function (g) {
    return {
      dice: g.dice.map(function (t) {
        return new RegExp("(^| )" + norm(t) + "(e?s)?( |$)");
      }),
      intro: g.intro,
      ids: g.ids
    };
  });

  function respuestaGiro(pregunta) {
    var n = norm(pregunta);
    var giro = null;
    for (var i = 0; i < GIROS.length && !giro; i++) {
      for (var j = 0; j < GIROS[i].dice.length; j++) {
        if (GIROS[i].dice[j].test(n)) { giro = GIROS[i]; break; }
      }
    }
    if (!giro) return null;

    var prods = giro.ids.map(function (id) {
      return PRODS.filter(function (p) { return p.id === id; })[0];
    }).filter(Boolean);
    if (!prods.length) return null;

    var lista = prods.map(function (p) {
      return p.nombre.toLowerCase() + (medida(p) ? " (" + medida(p) + ")" : "");
    });

    return {
      texto: giro.intro + " " + lista.slice(0, -1).join(", ") + " y " +
             lista[lista.length - 1] + ". ¿Te armo la lista para cotizar? " +
             "Dime cuántas cajas de cada uno, o marca al " + TEL + ".",
      fuente: "Recomendación",
      enlace: "tienda.html?cat=" + prods[0].cat,
      enlaceTexto: "Ver estos productos"
    };
  }

  /* ======================= respuesta directa del RAG =======================
     Solo contesta sola cuando gana con holgura: el primer resultado tiene que
     superar un piso y sacarle ventaja clara al segundo. Si no, va a la IA. */

  var PISO = 9;
  var VENTAJA = 1.45;

  function respuestaLocal(pregunta, hits) {
    if (!hits.length) return null;
    var top = hits[0];
    if (top.s < PISO) return null;
    if (hits[1] && top.s < hits[1].s * VENTAJA) return null;

    /* pedir precio nunca se contesta con el RAG */
    if (/\b(precio|precios|cuesta|cuestan|costo|cotiza|barato|caro|\$)\b/.test(norm(pregunta))) return null;

    var d = top.d;
    if (d.tipo === "hecho") {
      return { texto: d.cuerpo, fuente: d.titulo };
    }

    var p = d.prod;
    var partes = [p.nombre + ". " + p.desc];
    partes.push("Medidas: " + p.v.join(" · ") + ".");
    if (p.p) partes.push("Caja de " + p.p.toLocaleString("es-MX") + " piezas.");
    return {
      texto: partes.join(" "),
      fuente: "Catálogo",
      enlace: d.enlace,
      enlaceTexto: "Verlo en la tienda"
    };
  }

  /* Si la búsqueda encontró varios productos pero ninguno gana con holgura, un
     buscador se rinde y un vendedor enseña las opciones. Esto último es lo que
     hace falta: evita mandar a la IA (y al mensaje de "no lo tengo confirmado")
     preguntas que el catálogo sí puede responder. */

  var PISO_LISTA = 4.5;

  function respuestaCatalogo(pregunta, hits) {
    if (/\b(precio|precios|cuesta|cuestan|costo|barato|caro)\b/.test(norm(pregunta))) return null;

    var prods = hits.filter(function (h) {
      return h.d.tipo === "producto" && h.s >= PISO_LISTA;
    });
    if (prods.length < 2) return null;

    /* Solo la familia del primer resultado: si alguien pregunta por vasos de
       café, mezclarle tapas y vasos fríos confunde en vez de ayudar. */
    var familia = prods[0].d.prod.cat;
    prods = prods.filter(function (h) { return h.d.prod.cat === familia; }).slice(0, 4);
    if (prods.length < 2) return null;

    var lista = prods.map(function (h) {
      var p = h.d.prod;
      return p.nombre.toLowerCase() + (medida(p) ? " (" + medida(p) + ")" : "");
    });

    return {
      texto: "Para eso te sirven " + lista.slice(0, -1).join(", ") + " y " +
             lista[lista.length - 1] + ". Dime cuál te late y de qué medida, y " +
             "te armo la lista para cotizar.",
      fuente: "Catálogo",
      enlace: "tienda.html?cat=" + prods[0].d.prod.cat,
      enlaceTexto: "Ver en la tienda"
    };
  }

  /* ======================= interfaz ======================= */

  var abierto = false, pensando = false, historial = [];

  var host = document.createElement("div");
  host.className = "agente";
  host.innerHTML =
    '<button class="agente__lanzador" id="ag-abrir" aria-expanded="false" aria-controls="ag-panel">' +
      '<svg class="ico" aria-hidden="true"><use href="#i-sparkle"></use></svg>' +
      '<span>Pregúntale al asistente</span>' +
    '</button>' +
    '<section class="agente__panel" id="ag-panel" aria-label="Asistente de GreeNova" hidden>' +
      '<header class="agente__head">' +
        '<div><strong>Asistente GreeNova</strong><span>Catálogo, medidas y materiales</span></div>' +
        '<button class="agente__cerrar" id="ag-cerrar" aria-label="Cerrar el asistente">' +
          '<svg class="ico" aria-hidden="true"><use href="#i-x"></use></svg></button>' +
      '</header>' +
      '<div class="agente__hilo" id="ag-hilo" role="log" aria-live="polite"></div>' +
      '<div class="agente__sug" id="ag-sug"></div>' +
      '<form class="agente__form" id="ag-form">' +
        '<input id="ag-input" type="text" autocomplete="off" placeholder="Escribe tu pregunta…" aria-label="Tu pregunta">' +
        '<button type="submit" aria-label="Enviar">' +
          '<svg class="ico" aria-hidden="true"><use href="#i-arrow-right"></use></svg></button>' +
      '</form>' +
      '<p class="agente__pie">Respuestas basadas en el catálogo 2026. Para precios y pedidos, ventas te cotiza.</p>' +
    '</section>';
  document.body.appendChild(host);

  var $ = function (id) { return document.getElementById(id); };
  var hilo = $("ag-hilo");

  function burbuja(quien, texto, extra) {
    var el = document.createElement("div");
    el.className = "ag-msg ag-msg--" + quien;
    var p = document.createElement("p");
    p.textContent = texto;
    el.appendChild(p);
    if (extra && extra.enlace) {
      var a = document.createElement("a");
      a.href = extra.enlace;
      a.className = "ag-msg__link";
      a.textContent = extra.enlaceTexto || "Ver más";
      el.appendChild(a);
    }
    if (extra && extra.fuente) {
      var f = document.createElement("span");
      f.className = "ag-msg__fuente";
      f.textContent = extra.fuente;
      el.appendChild(f);
    }
    hilo.appendChild(el);
    hilo.scrollTop = hilo.scrollHeight;
    return p;
  }

  function pintarSugerencias() {
    var box = $("ag-sug");
    box.innerHTML = CFG.SUGERENCIAS.map(function (s) {
      return '<button type="button">' + s + "</button>";
    }).join("");
    box.hidden = false;
  }

  function saludo() {
    if (hilo.childElementCount) return;
    burbuja("bot", "Hola. Te ayudo con medidas, materiales y qué producto te sirve. ¿Qué buscas?");
    pintarSugerencias();
  }

  /* ======================= envío ======================= */

  function preguntar(texto) {
    if (pensando || !texto.trim()) return;
    $("ag-sug").hidden = true;
    burbuja("yo", texto);
    historial.push({ role: "user", content: texto });

    var pedido = respuestaPedido(texto);
    if (pedido) {
      burbuja("bot", pedido.texto, pedido);
      historial.push({ role: "assistant", content: pedido.texto });
      return;
    }

    var giro = respuestaGiro(texto);
    if (giro) {
      burbuja("bot", giro.texto, giro);
      historial.push({ role: "assistant", content: giro.texto });
      return;
    }

    var hits = buscar(texto, 5);
    var local = respuestaLocal(texto, hits);

    if (local) {
      burbuja("bot", local.texto, local);
      historial.push({ role: "assistant", content: local.texto });
      return;
    }
    var catalogo = respuestaCatalogo(texto, hits);
    if (catalogo) {
      burbuja("bot", catalogo.texto, catalogo);
      historial.push({ role: "assistant", content: catalogo.texto });
      return;
    }

    consultarIA(texto, hits);
  }

  function consultarIA(texto, hits) {
    pensando = true;
    var el = burbuja("bot", "");
    el.parentElement.dataset.cargando = "true";
    el.innerHTML = '<i class="ag-dot"></i><i class="ag-dot"></i><i class="ag-dot"></i>';

    var contexto = hits.map(function (h) {
      return "## " + h.d.titulo + "\n" + h.d.cuerpo;
    }).join("\n\n");

    /* Lo que la persona ya eligió en la tienda, para que la IA lo retome en
       vez de preguntar otra vez qué quiere. */
    var lineas = carrito();
    if (lineas.length) {
      contexto += "\n\n## CARRITO DEL VISITANTE\n" + carritoTexto(lineas) +
                  ".\nNo hay precios publicados: ventas los define en la cotización.";
    }

    fetch(CFG.ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pregunta: texto,
        contexto: contexto,
        criterios: CRITERIOS_IA,
        historial: historial.slice(-8)
      })
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      if (!r.body) throw new Error("sin stream");

      el.textContent = "";
      el.parentElement.removeAttribute("data-cargando");

      var lector = r.body.getReader();
      var dec = new TextDecoder();
      var buf = "", salida = "";

      return (function leer() {
        return lector.read().then(function (res) {
          if (res.done) {
            historial.push({ role: "assistant", content: salida });
            return;
          }
          buf += dec.decode(res.value, { stream: true });
          var lineas = buf.split("\n");
          buf = lineas.pop();
          lineas.forEach(function (l) {
            if (l.indexOf("data: ") !== 0) return;
            var payload = l.slice(6);
            if (payload === "[DONE]") return;
            try {
              var j = JSON.parse(payload);
              if (j.texto) { salida += j.texto; el.textContent = salida; hilo.scrollTop = hilo.scrollHeight; }
              if (j.error) { salida = CFG.SALIDA; el.textContent = salida; }
            } catch (e) { /* fragmento incompleto */ }
          });
          return leer();
        });
      })();
    }).catch(function () {
      /* Sin endpoint desplegado o sin red: se entrega lo mejor del RAG y el
         contacto de ventas, en vez de dejar al visitante sin respuesta. */
      el.parentElement.removeAttribute("data-cargando");
      var mejor = hits[0];
      if (mejor && mejor.s >= 4) {
        el.textContent = "Esto es lo más cercano que encontré: " + mejor.d.titulo + ". " +
          mejor.d.cuerpo + "\n\n" + CFG.SALIDA;
      } else {
        el.textContent = CFG.SALIDA;
      }
      hilo.scrollTop = hilo.scrollHeight;
    }).then(function () {
      pensando = false;
      $("ag-input").focus();
    });
  }

  /* ======================= eventos ======================= */

  function setAbierto(v) {
    abierto = v;
    $("ag-panel").hidden = !v;
    $("ag-abrir").setAttribute("aria-expanded", String(v));
    host.dataset.abierto = String(v);
    if (v) { saludo(); setTimeout(function () { $("ag-input").focus(); }, reduce ? 0 : 260); }
  }

  $("ag-abrir").addEventListener("click", function () { setAbierto(!abierto); });
  $("ag-cerrar").addEventListener("click", function () { setAbierto(false); $("ag-abrir").focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abierto) { setAbierto(false); $("ag-abrir").focus(); }
  });

  $("ag-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = $("ag-input").value;
    $("ag-input").value = "";
    preguntar(v);
  });

  $("ag-sug").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) preguntar(b.textContent);
  });

  /* Cualquier botón con data-agente abre el chat con esa pregunta ya hecha. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-agente]");
    if (!b) return;
    e.preventDefault();
    setAbierto(true);
    preguntar(b.dataset.agente);
  });

  window.GNAgente = { abrir: function (q) { setAbierto(true); if (q) preguntar(q); } };
})();
