/* GreeNova SC - panel de catálogo.
   ===========================================================================
   Edita productos, precios, existencias y ofertas, y guarda el resultado como
   un commit en GitHub. El archivo productos.js lo escribe el servidor, no este
   script: aquí solo se manda la información ya editada.

   Lo que se ve en pantalla sale de window.GREENOVA, o sea del mismo productos.js
   que usa el sitio. No hay una segunda copia de los datos que se pueda
   desincronizar.

   La contraseña nunca se guarda: el servidor devuelve un token con caducidad y
   ese token vive en sessionStorage, que se borra al cerrar la pestaña.
   =========================================================================== */
(function () {
  "use strict";

  var LLAVE_SESION = "greenova.panel.token";
  var $ = function (id) { return document.getElementById(id); };

  /* Copia de trabajo: se edita esto, no el catálogo que el sitio ya cargó. */
  var datos = null;
  var original = null;
  var sucios = {};       /* ids con cambios sin guardar */
  var nuevos = {};       /* ids agregados en esta sesión */

  /* ============================ acceso ============================ */

  function avisoEntrar(texto) {
    var el = $("aviso-entrar");
    el.textContent = texto;
    el.dataset.tipo = "error";
    el.hidden = !texto;
  }

  $("form-entrar").addEventListener("submit", function (e) {
    e.preventDefault();
    var clave = $("clave").value;
    if (!clave) return;
    avisoEntrar("");

    fetch("/api/admin/entrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave: clave })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) {
        avisoEntrar(res.j.error === "panel_sin_configurar"
          ? "El panel no tiene contraseña configurada en el servidor (ADMIN_PASSWORD)."
          : "Contraseña incorrecta.");
        return;
      }
      try { sessionStorage.setItem(LLAVE_SESION, res.j.token); } catch (err) { /* modo privado */ }
      $("clave").value = "";
      abrirPanel();
    }).catch(function () {
      avisoEntrar("No pude contactar al servidor. ¿Está corriendo con uvicorn?");
    });
  });

  function token() {
    try { return sessionStorage.getItem(LLAVE_SESION) || ""; } catch (e) { return ""; }
  }

  /* ============================ datos ============================ */

  function clonar(v) { return JSON.parse(JSON.stringify(v)); }

  function cargar() {
    var G = window.GREENOVA;
    datos = {
      categorias: clonar(G.CATEGORIAS),
      materiales: clonar(G.MATERIALES),
      productos: clonar(G.PRODUCTOS),
      promos: clonar(G.PROMOS || {})
    };
    original = clonar(datos);
    sucios = {};
    nuevos = {};
  }

  function producto(id) {
    return datos.productos.filter(function (p) { return p.id === id; })[0];
  }

  function promo(id) {
    if (!datos.promos[id]) datos.promos[id] = {};
    return datos.promos[id];
  }

  /* Una promo sin nada adentro no debe viajar: ensucia el archivo y hace que el
     producto aparezca en el outlet sin motivo. */
  function limpiarPromo(id) {
    var pr = datos.promos[id];
    if (!pr) return;
    if (!pr.desc && !pr.nota && !pr.hasta && !pr.agotado) delete datos.promos[id];
  }

  function marcarSucio(id) {
    sucios[id] = true;
    pintarResumen();
    var ficha = document.querySelector('[data-ficha="' + id + '"]');
    if (ficha) ficha.dataset.sucio = "true";
  }

  function hayCambios() {
    return Object.keys(sucios).length > 0 || JSON.stringify(datos) !== JSON.stringify(original);
  }

  /* ============================ pintado ============================ */

  function opcionesCat(sel) {
    return datos.categorias.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + c.nombre + "</option>";
    }).join("");
  }

  function ficha(p) {
    var pr = datos.promos[p.id] || {};
    var el = document.createElement("article");
    el.className = "ficha";
    el.dataset.ficha = p.id;
    if (sucios[p.id]) el.dataset.sucio = "true";
    if (nuevos[p.id]) el.dataset.nuevo = "true";

    el.innerHTML =
      '<div class="ficha__fila1">' +
        '<div><span class="campo">Producto</span>' +
          '<input type="text" data-c="nombre" value="' + esc(p.nombre) + '"></div>' +
        '<div><span class="campo">Categoría</span>' +
          '<select data-c="cat">' + opcionesCat(p.cat) + "</select></div>" +
        '<div><span class="campo">Precio por caja (MXN)</span>' +
          '<input type="number" min="0" step="0.01" data-c="precio" placeholder="Cotizar" value="' +
            (p.precio == null ? "" : p.precio) + '"></div>' +
        '<div><button class="btn btn--ghost btn--sm" type="button" data-accion="borrar">' +
          '<span class="btn__label">Quitar</span></button></div>' +
      "</div>" +

      '<div class="ficha__mas">' +
        '<label><span class="campo">Descripción</span>' +
          '<textarea data-c="desc">' + esc(p.desc || "") + "</textarea></label>" +
        '<label><span class="campo">Medidas (una por línea)</span>' +
          '<textarea data-c="v">' + esc((p.v || []).join("\n")) + "</textarea></label>" +
        '<div>' +
          '<label><span class="campo">Piezas por caja</span>' +
            '<input type="number" min="0" step="1" data-c="p" value="' + (p.p || "") + '"></label>' +
          '<label style="margin-top:.7rem"><span class="campo">Imagen (nombre del archivo)</span>' +
            '<input type="text" data-c="img" value="' + esc(p.img || "") + '"></label>' +
        "</div>" +
        '<div>' +
          '<span class="campo">Materiales</span>' +
          '<div class="ficha__mats">' + materialesHTML(p) + "</div>" +
          '<label style="margin-top:.7rem"><span class="campo">Sello (opcional)</span>' +
            '<input type="text" data-c="sello" value="' + esc(p.sello || "") + '" placeholder="SEDEMA"></label>' +
          '<label class="marca" style="margin-top:.7rem">' +
            '<input type="checkbox" data-c="destacado"' + (p.destacado ? " checked" : "") + "> Destacado</label>" +
        "</div>" +
      "</div>" +

      '<div class="ficha__promo">' +
        '<label class="marca"><input type="checkbox" data-p="agotado"' +
          (pr.agotado ? " checked" : "") + "> Agotado</label>" +
        '<label><span class="campo">Descuento %</span>' +
          '<input type="number" min="0" max="99" step="1" data-p="desc" value="' + (pr.desc || "") + '"></label>' +
        '<label><span class="campo">Etiqueta de oferta</span>' +
          '<input type="text" data-p="nota" value="' + esc(pr.nota || "") + '" placeholder="Última existencia"></label>' +
        '<label><span class="campo">Vigente hasta</span>' +
          '<input type="date" data-p="hasta" value="' + esc(pr.hasta || "") + '"></label>' +
        '<p class="adm__sub">id: <code>' + esc(p.id) + "</code></p>" +
      "</div>";

    return el;
  }

  function materialesHTML(p) {
    return Object.keys(datos.materiales).map(function (m) {
      var puesto = (p.mat || []).indexOf(m) > -1;
      return '<label class="marca"><input type="checkbox" data-m="' + m + '"' +
             (puesto ? " checked" : "") + "> " + datos.materiales[m] + "</label>";
    }).join("");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function visibles() {
    var q = $("buscar").value.trim().toLowerCase();
    var cat = $("filtro-cat").value;
    var estado = $("filtro-estado").value;

    return datos.productos.filter(function (p) {
      if (cat && p.cat !== cat) return false;
      if (q && (p.nombre + " " + p.id + " " + (p.desc || "")).toLowerCase().indexOf(q) === -1) return false;
      var pr = datos.promos[p.id] || {};
      if (estado === "cambiados" && !sucios[p.id]) return false;
      if (estado === "agotados" && !pr.agotado) return false;
      if (estado === "ofertas" && !pr.desc) return false;
      if (estado === "sin-precio" && p.precio != null) return false;
      return true;
    });
  }

  function pintar() {
    var lista = $("lista");
    lista.innerHTML = "";
    var items = visibles();
    items.forEach(function (p) { lista.appendChild(ficha(p)); });
    $("vacio").hidden = items.length > 0;
    pintarResumen();
  }

  function pintarResumen() {
    var agotados = 0, ofertas = 0, conPrecio = 0;
    datos.productos.forEach(function (p) {
      var pr = datos.promos[p.id] || {};
      if (pr.agotado) agotados++;
      if (pr.desc) ofertas++;
      if (p.precio != null) conPrecio++;
    });
    var pendientes = Object.keys(sucios).length;
    $("resumen").textContent =
      datos.productos.length + " productos · " + conPrecio + " con precio · " +
      ofertas + " en oferta · " + agotados + " agotados" +
      (pendientes ? " · " + pendientes + " con cambios sin guardar" : "");
    $("btn-guardar").disabled = !hayCambios();
  }

  /* ============================ edición ============================ */

  $("lista").addEventListener("input", function (e) {
    var ficha = e.target.closest("[data-ficha]");
    if (!ficha) return;
    var id = ficha.dataset.ficha;
    var p = producto(id);
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
      marcarSucio(id);
      return;
    }

    var campoPromo = e.target.dataset.p;
    if (campoPromo) {
      var pr = promo(id);
      if (campoPromo === "agotado") pr.agotado = e.target.checked;
      else if (campoPromo === "desc") {
        var d = parseInt(e.target.value, 10);
        pr.desc = isNaN(d) || d <= 0 ? 0 : Math.min(99, d);
      } else pr[campoPromo] = e.target.value;
      limpiarPromo(id);
      marcarSucio(id);
      return;
    }

    var mat = e.target.dataset.m;
    if (mat) {
      p.mat = p.mat || [];
      var i = p.mat.indexOf(mat);
      if (e.target.checked && i === -1) p.mat.push(mat);
      if (!e.target.checked && i > -1) p.mat.splice(i, 1);
      marcarSucio(id);
    }
  });

  $("lista").addEventListener("change", function (e) {
    if (e.target.dataset.c === "cat") {
      var ficha = e.target.closest("[data-ficha]");
      var p = producto(ficha.dataset.ficha);
      if (p) { p.cat = e.target.value; marcarSucio(p.id); }
    }
  });

  $("lista").addEventListener("click", function (e) {
    var btn = e.target.closest('[data-accion="borrar"]');
    if (!btn) return;
    var ficha = btn.closest("[data-ficha]");
    var id = ficha.dataset.ficha;
    var p = producto(id);
    if (!p) return;
    if (!confirm("¿Quitar \"" + p.nombre + "\" del catálogo?\n\nSe va del sitio en cuanto guardes.")) return;
    datos.productos = datos.productos.filter(function (x) { return x.id !== id; });
    delete datos.promos[id];
    delete nuevos[id];
    sucios[id] = true;
    pintar();
  });

  $("btn-nuevo").addEventListener("click", function () {
    var n = 1;
    while (producto("nuevo-" + n)) n++;
    var id = "nuevo-" + n;
    datos.productos.unshift({
      id: id, nombre: "Producto nuevo", cat: datos.categorias[0].id,
      mat: [], img: "", p: null, desc: "", v: ["Estándar"], precio: null
    });
    nuevos[id] = true;
    sucios[id] = true;
    $("buscar").value = ""; $("filtro-cat").value = ""; $("filtro-estado").value = "";
    pintar();
    var el = document.querySelector('[data-ficha="' + id + '"]');
    if (el) { el.scrollIntoView({ block: "center" }); el.querySelector("input").select(); }
  });

  ["buscar", "filtro-cat", "filtro-estado"].forEach(function (id) {
    $(id).addEventListener("input", pintar);
  });

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token(),
        catalogo: datos,
        mensaje: "Actualiza el catálogo desde el panel"
      })
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      etiqueta.textContent = "Guardar cambios";
      if (!res.ok) {
        if (res.j.error === "sesion_vencida") {
          aviso("Tu sesión venció. Vuelve a entrar; tus cambios siguen aquí.", "error");
          $("panel").hidden = true; $("entrar").hidden = false;
          return;
        }
        aviso(explicar(res.j.error), "error");
        btn.disabled = false;
        return;
      }
      sucios = {}; nuevos = {};
      original = clonar(datos);
      aviso("Guardado en GitHub (commit " + res.j.commit + "). El sitio se actualiza " +
            "en cuanto termine el redeploy, alrededor de un minuto.", "ok");
      pintar();
    }).catch(function () {
      etiqueta.textContent = "Guardar cambios";
      btn.disabled = false;
      aviso("No pude contactar al servidor.", "error");
    });
  });

  function explicar(codigo) {
    if (codigo === "falta_github_token") return "Falta la variable GITHUB_TOKEN en el servidor.";
    if (codigo === "github_token_invalido") return "El GITHUB_TOKEN no es válido o no tiene permiso sobre el repo.";
    if (codigo === "catalogo_invalido") return "El catálogo quedó inválido y no se guardó.";
    if (codigo === "github_409") return "Alguien más cambió el archivo. Recarga el panel y vuelve a aplicar tus cambios.";
    return "No se pudo guardar (" + (codigo || "error desconocido") + ").";
  }

  $("btn-respaldo").addEventListener("click", function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" }));
    a.download = "greenova-catalogo-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  window.addEventListener("beforeunload", function (e) {
    if (Object.keys(sucios).length) { e.preventDefault(); e.returnValue = ""; }
  });

  /* ============================ arranque ============================ */

  function abrirPanel() {
    $("entrar").hidden = true;
    $("panel").hidden = false;
    cargar();
    $("filtro-cat").innerHTML = '<option value="">Todas las categorías</option>' +
      datos.categorias.map(function (c) {
        return '<option value="' + c.id + '">' + c.nombre + "</option>";
      }).join("");
    pintar();
  }

  if (!window.GREENOVA) {
    document.body.innerHTML = "<p style='padding:2rem'>No se pudo cargar el catálogo.</p>";
    return;
  }
  if (token()) abrirPanel();
})();
