/* GreeNova SC - editor visual del catálogo.
   ===========================================================================
   Abre tienda.html dentro de un iframe y la vuelve editable. Lo que ves es la
   página real, con su CSS y su código de tarjetas: no hay una segunda
   plantilla que se pueda desincronizar de la que ve el cliente.

   Cómo funciona el ciclo:

     1. Se edita la copia de trabajo (`datos`).
     2. Se le pasa esa copia al catálogo que vive dentro del iframe.
     3. Se llama a GNTienda.repintar(), que es el mismo render de la tienda.

   Por eso el cambio se ve al instante y exactamente como lo verá el público.
   Guardar usa el mismo endpoint que el panel de lista: un commit en GitHub.
   =========================================================================== */
(function () {
  "use strict";

  var LLAVE_SESION = "greenova.panel.token";
  var $ = function (id) { return document.getElementById(id); };

  var datos = null;      /* copia de trabajo del catálogo */
  var original = null;
  var sucios = {};
  var seleccion = null;  /* id del producto abierto en el panel */
  var pulso = {};        /* conteos del mapa de calor */
  var marco = null;      /* window del iframe */

  /* ============================ acceso ============================ */

  function token() {
    try { return sessionStorage.getItem(LLAVE_SESION) || ""; } catch (e) { return ""; }
  }

  $("form-entrar").addEventListener("submit", function (e) {
    e.preventDefault();
    var clave = $("clave").value;
    if (!clave) return;

    fetch("/api/admin/entrar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave: clave })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      var av = $("aviso-entrar");
      if (!res.ok) {
        av.textContent = res.j.error === "panel_sin_configurar"
          ? "El panel no tiene contraseña configurada en el servidor."
          : "Contraseña incorrecta.";
        av.hidden = false;
        return;
      }
      try { sessionStorage.setItem(LLAVE_SESION, res.j.token); } catch (err) {}
      $("clave").value = "";
      abrir();
    }).catch(function () {
      var av = $("aviso-entrar");
      av.textContent = "No pude contactar al servidor.";
      av.hidden = false;
    });
  });

  /* ============================ el iframe ============================ */

  function clonar(v) { return JSON.parse(JSON.stringify(v)); }

  function alCargarTienda() {
    marco = $("tienda").contentWindow;
    if (!marco.GREENOVA || !marco.GNTienda) return;

    if (!datos) {
      datos = {
        categorias: clonar(marco.GREENOVA.CATEGORIAS),
        materiales: clonar(marco.GREENOVA.MATERIALES),
        productos: clonar(marco.GREENOVA.PRODUCTOS),
        promos: clonar(marco.GREENOVA.PROMOS || {})
      };
      original = clonar(datos);
    }

    prepararMarco();
    sincronizar();
    traerPulso();
    resumen();
  }

  /* Dentro del iframe: cursor de edición, contorno al pasar encima y clic que
     abre el producto en el panel. La tienda sigue funcionando igual; lo único
     que se bloquea es el botón de añadir, que aquí no tiene sentido. */
  function prepararMarco() {
    var doc = marco.document;
    if (doc.getElementById("estilos-editor")) return;

    var css = doc.createElement("style");
    css.id = "estilos-editor";
    css.textContent =
      ".pcard { cursor: pointer; }" +
      ".pcard:hover { outline: 2px solid var(--accent); outline-offset: 3px; }" +
      '.pcard[data-editando="true"] { outline: 3px solid var(--forest); outline-offset: 3px; }' +
      ".ed-calor { position: absolute; top: 8px; right: 8px; z-index: 4;" +
      "  font: 600 .7rem/1 system-ui, sans-serif; padding: 5px 8px; border-radius: 99px;" +
      "  color: #17301f; box-shadow: 0 2px 6px rgba(0,0,0,.18); }" +
      ".pcard { position: relative; }";
    doc.head.appendChild(css);

    doc.addEventListener("click", function (e) {
      var card = e.target.closest(".pcard[data-id]");
      if (!card) return;
      e.preventDefault();
      e.stopPropagation();
      seleccionar(card.dataset.id);
    }, true);
  }

  /* Le pasa la copia de trabajo al catálogo del iframe y lo hace repintar. */
  function sincronizar() {
    if (!marco || !marco.GREENOVA) return;
    marco.GREENOVA.PRODUCTOS.length = 0;
    datos.productos.forEach(function (p) { marco.GREENOVA.PRODUCTOS.push(p); });
    Object.keys(marco.GREENOVA.PROMOS).forEach(function (k) { delete marco.GREENOVA.PROMOS[k]; });
    Object.keys(datos.promos).forEach(function (k) { marco.GREENOVA.PROMOS[k] = datos.promos[k]; });
    marco.GNTienda.repintar();
    marcarSeleccion();
    pintarCalor();
  }

  function marcarSeleccion() {
    if (!marco) return;
    marco.document.querySelectorAll(".pcard[data-editando]").forEach(function (c) {
      c.removeAttribute("data-editando");
    });
    if (!seleccion) return;
    var card = marco.document.querySelector('.pcard[data-id="' + seleccion + '"]');
    if (card) card.dataset.editando = "true";
  }

  /* ============================ mapa de calor ============================ */

  function traerPulso() {
    fetch("/api/admin/pulso?token=" + encodeURIComponent(token()))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j) return;
        pulso = j.productos || {};
        pintarCalor();
      }).catch(function () { /* sin datos, el mapa queda apagado */ });
  }

  function color(fraccion) {
    if (fraccion <= 0) return "var(--line)";
    if (fraccion < 0.25) return "#cfe6c0";
    if (fraccion < 0.5) return "#9bce89";
    if (fraccion < 0.75) return "#f0b429";
    return "#e2603b";
  }

  function pintarCalor() {
    if (!marco) return;
    var doc = marco.document;
    doc.querySelectorAll(".ed-calor").forEach(function (b) { b.remove(); });

    if (!$("ver-calor").checked) { $("leyenda").hidden = true; return; }
    $("leyenda").hidden = false;

    var metrica = $("que-mide").value;
    var maximo = 0;
    Object.keys(pulso).forEach(function (id) {
      maximo = Math.max(maximo, (pulso[id] || {})[metrica] || 0);
    });

    if (!maximo) {
      $("leyenda-texto").textContent =
        "Todavía no hay visitas registradas. Se llena solo conforme la gente use la tienda.";
      return;
    }
    $("leyenda-texto").textContent = "El más alto lleva " + maximo + ".";

    doc.querySelectorAll(".pcard[data-id]").forEach(function (card) {
      var n = (pulso[card.dataset.id] || {})[metrica] || 0;
      var b = doc.createElement("span");
      b.className = "ed-calor";
      b.textContent = n;
      b.style.background = color(n / maximo);
      card.appendChild(b);
    });
  }

  $("ver-calor").addEventListener("change", function () {
    if (this.checked) traerPulso(); else pintarCalor();
  });
  $("que-mide").addEventListener("change", pintarCalor);

  /* ============================ el panel ============================ */

  function producto(id) {
    return datos.productos.filter(function (p) { return p.id === id; })[0];
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function seleccionar(id) {
    var p = producto(id);
    if (!p) return;
    seleccion = id;
    var pr = datos.promos[id] || {};

    $("nada").hidden = true;
    var form = $("form");
    form.hidden = false;
    form.innerHTML =
      '<p class="ed__sub" style="margin-bottom:.8rem">Editando <b>' + esc(p.nombre) + "</b></p>" +
      '<div class="ed__campo"><label><span>Nombre</span>' +
        '<input type="text" data-c="nombre" value="' + esc(p.nombre) + '"></label></div>' +
      '<div class="ed__campo"><label><span>Descripción</span>' +
        '<textarea data-c="desc">' + esc(p.desc || "") + "</textarea></label></div>" +
      '<div class="ed__campo"><label><span>Precio por caja (MXN)</span>' +
        '<input type="number" min="0" step="0.01" data-c="precio" placeholder="Cotizar" value="' +
        (p.precio == null ? "" : p.precio) + '"></label></div>' +
      '<div class="ed__campo"><label><span>Medidas (una por línea)</span>' +
        '<textarea data-c="v">' + esc((p.v || []).join("\n")) + "</textarea></label></div>" +
      '<div class="ed__campo"><label><span>Piezas por caja</span>' +
        '<input type="number" min="0" step="1" data-c="p" value="' + (p.p || "") + '"></label></div>' +
      '<div class="ed__campo"><span>Materiales</span><div class="ed__mats">' +
        Object.keys(datos.materiales).map(function (m) {
          return '<label class="marca"><input type="checkbox" data-m="' + m + '"' +
                 ((p.mat || []).indexOf(m) > -1 ? " checked" : "") + "> " + datos.materiales[m] + "</label>";
        }).join("") + "</div></div>" +
      '<label class="marca"><input type="checkbox" data-c="destacado"' +
        (p.destacado ? " checked" : "") + "> Destacado</label>" +

      '<hr style="border:0;border-top:1px dashed var(--line);margin:1rem 0">' +
      '<label class="marca"><input type="checkbox" data-p="agotado"' +
        (pr.agotado ? " checked" : "") + "> Agotado</label>" +
      '<div class="ed__campo"><label><span>Descuento %</span>' +
        '<input type="number" min="0" max="99" step="1" data-p="desc" value="' + (pr.desc || "") + '"></label></div>' +
      '<div class="ed__campo"><label><span>Etiqueta de oferta</span>' +
        '<input type="text" data-p="nota" value="' + esc(pr.nota || "") + '"></label></div>' +
      '<div class="ed__campo"><label><span>Vigente hasta</span>' +
        '<input type="date" data-p="hasta" value="' + esc(pr.hasta || "") + '"></label></div>' +
      '<p class="ed__sub">id: <code>' + esc(p.id) + "</code></p>";

    marcarSeleccion();
  }

  $("panel").addEventListener("input", function (e) {
    if (!seleccion) return;
    var p = producto(seleccion);
    if (!p) return;

    var campo = e.target.dataset.c;
    if (campo) {
      if (campo === "precio") {
        var n = parseFloat(e.target.value);
        p.precio = isNaN(n) || n <= 0 ? null : n;
      } else if (campo === "p") {
        var caja = parseInt(e.target.value, 10);
        p.p = isNaN(caja) || caja <= 0 ? null : caja;
      } else if (campo === "v") {
        p.v = e.target.value.split("\n").map(function (l) { return l.trim(); })
                .filter(function (l) { return l; });
      } else if (campo === "destacado") {
        p.destacado = e.target.checked;
      } else {
        p[campo] = e.target.value;
      }
    }

    var cp = e.target.dataset.p;
    if (cp) {
      if (!datos.promos[seleccion]) datos.promos[seleccion] = {};
      var pr = datos.promos[seleccion];
      if (cp === "agotado") pr.agotado = e.target.checked;
      else if (cp === "desc") {
        var d = parseInt(e.target.value, 10);
        pr.desc = isNaN(d) || d <= 0 ? 0 : Math.min(99, d);
      } else pr[cp] = e.target.value;
      if (!pr.desc && !pr.nota && !pr.hasta && !pr.agotado) delete datos.promos[seleccion];
    }

    var mat = e.target.dataset.m;
    if (mat) {
      p.mat = p.mat || [];
      var i = p.mat.indexOf(mat);
      if (e.target.checked && i === -1) p.mat.push(mat);
      if (!e.target.checked && i > -1) p.mat.splice(i, 1);
    }

    sucios[seleccion] = true;
    sincronizar();
    resumen();
  });

  function resumen() {
    var pend = Object.keys(sucios).length;
    $("resumen").textContent = datos
      ? datos.productos.length + " productos" + (pend ? " · " + pend + " con cambios sin guardar" : " · todo guardado")
      : "Cargando…";
    $("btn-guardar").disabled = !pend;
  }

  /* ============================ guardar ============================ */

  function aviso(texto, tipo) {
    var el = $("aviso");
    el.textContent = texto;
    el.dataset.tipo = tipo || "ok";
    el.hidden = !texto;
  }

  $("btn-guardar").addEventListener("click", function () {
    var btn = $("btn-guardar");
    var etiqueta = btn.querySelector(".btn__label");
    btn.disabled = true;
    etiqueta.textContent = "Guardando…";
    aviso("");

    fetch("/api/admin/guardar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token(), catalogo: datos,
        mensaje: "Actualiza el catálogo desde el editor visual"
      })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      etiqueta.textContent = "Guardar cambios";
      if (!res.ok) {
        btn.disabled = false;
        if (res.j.error === "sesion_vencida") {
          aviso("Tu sesión venció. Recarga y vuelve a entrar.", "error");
          return;
        }
        aviso(res.j.error === "falta_github_token"
          ? "Falta GITHUB_TOKEN en el servidor."
          : "No se pudo guardar (" + res.j.error + ").", "error");
        return;
      }
      sucios = {};
      original = clonar(datos);
      aviso("Guardado (commit " + res.j.commit + "). El sitio público se actualiza al terminar el redeploy.", "ok");
      resumen();
    }).catch(function () {
      etiqueta.textContent = "Guardar cambios";
      btn.disabled = false;
      aviso("No pude contactar al servidor.", "error");
    });
  });

  window.addEventListener("beforeunload", function (e) {
    if (Object.keys(sucios).length) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ============================ arranque ============================ */

  function abrir() {
    $("entrar").hidden = true;
    $("barra").hidden = false;
    $("cuerpo").hidden = false;
    var marcoEl = $("tienda");
    if (marcoEl.contentWindow && marcoEl.contentWindow.GNTienda) alCargarTienda();
    marcoEl.addEventListener("load", alCargarTienda);
  }

  if (token()) abrir();
})();
