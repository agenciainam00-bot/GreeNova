/* GreeNova SC - tienda.
   Catálogo filtrable + carrito persistente en localStorage. El envío pide
   cotización: el catálogo no publica precios.
   Sin dependencias, sin listeners de scroll: los reveals los maneja app.js. */
(function () {
  "use strict";
  if (!window.GREENOVA) return;

  var CATS = window.GREENOVA.CATEGORIAS;
  var MATS = window.GREENOVA.MATERIALES;
  var PRODS = window.GREENOVA.PRODUCTOS;
  var PROMOS = window.GREENOVA.PROMOS || {};

  /* "todo" = catálogo completo (tienda.html) | "ofertas" = outlet (ofertas.html) */
  var MODO = document.body.dataset.modo || "todo";
  var BASE = MODO === "ofertas"
    ? PRODS.filter(function (p) { return PROMOS[p.id]; })
    : PRODS;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var KEY = "greenova.cotizacion.v1";

  var $ = function (id) { return document.getElementById(id); };

  /* Las rutas de imagen se resuelven por aquí para que build-single.py pueda
     sustituirlas por data URIs en el archivo autocontenido. */
  function src(name) {
    var path = "assets/prod/" + name + ".webp";
    return (window.GN_ASSETS && window.GN_ASSETS[path]) || path;
  }

  /* ============================ estado ============================ */
  var state = { cat: "todo", mats: [], q: "", sort: "destacado", stock: "todo" };
  var cart = [];

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(saved)) cart = saved.filter(function (l) { return l && l.id && l.qty > 0; });
  } catch (e) { cart = []; }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* modo privado */ }
  }

  function fecha(iso) {
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
  }

  function money(n) {
    return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN";
  }

  /* ============================ filtros ============================ */
  function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function haystack(p) {
    if (!p._h) {
      p._h = norm([p.nombre, p.desc, p.v.join(" "),
                   p.mat.map(function (m) { return MATS[m]; }).join(" "),
                   (CATS.filter(function (c) { return c.id === p.cat; })[0] || {}).nombre || ""
                  ].join(" "));
    }
    return p._h;
  }

  /* Equivalencias del asistente, reutilizadas aquí: quien busca "vasos para
     café" no encuentra nada, porque en el catálogo se llaman "vaso de papel".
     La tabla se edita en un solo lugar, agente-criterios.js (SINONIMOS). */
  /* Se arma en la primera búsqueda, no al cargar: agente-criterios.js está
     después de este script en el HTML, así que al iniciar todavía no existe. */
  var SINON = null;

  function sinonimos() {
    if (SINON) return SINON;
    var tabla = (window.GREENOVA_AGENTE || {}).SINONIMOS;
    /* Si todavía no carga, se devuelve vacío SIN memorizar: la primera
       búsqueda puede ocurrir en el arranque, cuando el archivo de criterios
       aún no existe, y memorizar ahí dejaría la tabla vacía para siempre. */
    if (!tabla) return [];
    SINON = tabla.map(function (g) {
      return {
        dice: g.dice.map(function (t) {
          return new RegExp("(^| )" + norm(t).replace(/[^a-z0-9 ]/g, " ").trim() + "(e?s)?( |$)");
        }),
        /* Frases del catálogo que satisfacen esa intención. Se prueban como
           substring, así que "vaso de papel" no arrastra a los PET. */
        frases: (g.busca || [g.es]).map(norm)
      };
    });
    return SINON;
  }

  function frasesSinonimo(q) {
    var n = norm(q).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    var out = [];
    sinonimos().forEach(function (g) {
      for (var i = 0; i < g.dice.length; i++) {
        if (g.dice[i].test(n)) { out = out.concat(g.frases); return; }
      }
    });
    return out;
  }

  function pasaFiltros(p) {
    if (state.cat !== "todo" && p.cat !== state.cat) return false;
    if (state.stock === "disponible" && (PROMOS[p.id] || {}).agotado) return false;
    if (state.stock === "agotado" && !(PROMOS[p.id] || {}).agotado) return false;
    if (state.mats.length && !state.mats.some(function (m) { return p.mat.indexOf(m) > -1; })) return false;
    return true;
  }

  function filtered() {
    var q = norm(state.q.trim());
    var terms = q ? q.split(/\s+/) : [];
    var out = BASE.filter(function (p) {
      if (!pasaFiltros(p)) return false;
      if (terms.length) {
        var h = haystack(p);
        return terms.every(function (t) { return h.indexOf(t) > -1; });
      }
      return true;
    });

    /* Segunda pasada por equivalencias, que se suma a la literal en vez de
       reemplazarla: "frappé" aparece escrito en la ficha del PET pero no en la
       del PLA, y quien pregunta por frappé quiere ver los dos. */
    if (terms.length) {
      var frases = frasesSinonimo(state.q);
      if (frases.length) {
        BASE.forEach(function (p) {
          if (out.indexOf(p) > -1 || !pasaFiltros(p)) return;
          var h = haystack(p);
          if (frases.some(function (f) { return h.indexOf(f) > -1; })) out.push(p);
        });
      }
    }

    var order = CATS.map(function (c) { return c.id; });
    out.sort(function (a, b) {
      if (state.sort === "az") return a.nombre.localeCompare(b.nombre, "es");
      if (state.sort === "za") return b.nombre.localeCompare(a.nombre, "es");
      if (state.sort === "cat") {
        var d = order.indexOf(a.cat) - order.indexOf(b.cat);
        return d || a.nombre.localeCompare(b.nombre, "es");
      }
      var da = a.destacado ? 0 : 1, db = b.destacado ? 0 : 1;
      return (da - db) || (order.indexOf(a.cat) - order.indexOf(b.cat)) ||
             a.nombre.localeCompare(b.nombre, "es");
    });
    return out;
  }

  /* ============================ chips ============================ */
  function countFor(catId) {
    return BASE.filter(function (p) { return catId === "todo" || p.cat === catId; }).length;
  }

  function buildChips() {
    var cats = $("cats");
    var html = ['<button class="chip" data-cat="todo" aria-pressed="true">Todo' +
                '<span class="chip__n">' + BASE.length + "</span></button>"];
    CATS.forEach(function (c) {
      html.push('<button class="chip" data-cat="' + c.id + '" aria-pressed="false">' +
                '<svg class="ico" aria-hidden="true"><use href="#' + c.icono + '"></use></svg>' +
                c.nombre + '<span class="chip__n">' + countFor(c.id) + "</span></button>");
    });
    cats.innerHTML = html.join("");

    var mats = $("mats");
    var used = {};
    BASE.forEach(function (p) { p.mat.forEach(function (m) { used[m] = (used[m] || 0) + 1; }); });
    mats.innerHTML = Object.keys(used).sort(function (a, b) { return used[b] - used[a]; })
      .map(function (m) {
        return '<button class="chip chip--sm" data-mat="' + m + '" aria-pressed="false">' +
               MATS[m] + '<span class="chip__n">' + used[m] + "</span></button>";
      }).join("");
  }

  function syncChips() {
    if (!$("cats")) return;
    Array.prototype.forEach.call($("cats").children, function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat));
    });
    Array.prototype.forEach.call($("mats").children, function (b) {
      b.setAttribute("aria-pressed", String(state.mats.indexOf(b.dataset.mat) > -1));
    });
    var dot = $("filter-dot");
    if (dot) dot.hidden = state.mats.length === 0;
  }

  /* ============================ tarjetas ============================ */
  /* Precio: si no hay lista, "bajo cotización". Con `precio` y promo activa,
     se tacha el de lista y se muestra el de oferta. */
  function precioHTML(p) {
    var promo = PROMOS[p.id];
    if (!p.precio) {
      return promo && promo.desc
        ? '<b>-' + promo.desc + '%</b> sobre el precio de lista'
        : "Precio bajo cotización";
    }
    if (promo && promo.desc) {
      var off = p.precio * (1 - promo.desc / 100);
      return '<s>' + money(p.precio) + "</s> <b>" + money(off) + "</b> por caja";
    }
    return money(p.precio) + " por caja";
  }

  function card(p, i) {
    var line = cart.filter(function (l) { return l.id === p.id; })[0];
    var promo = PROMOS[p.id];
    var badges = p.mat.map(function (m) {
      return '<span class="tag tag--' + m + '">' + MATS[m] + "</span>";
    }).join("");
    if (p.sello) badges = '<span class="tag tag--sello"><svg class="ico" aria-hidden="true">' +
      '<use href="#i-seal-check"></use></svg>' + p.sello + "</span>" + badges;

    var opts = p.v.map(function (v, k) {
      return '<option value="' + v + '"' + (line && line.v === v ? " selected" : "") + ">" + v + "</option>";
    }).join("");

    return '' +
      '<article class="pcard rv" data-d="' + (i % 4) + '" data-id="' + p.id + '"' +
        (line ? ' data-in="true"' : "") + '>' +
        '<a class="pcard__media' + (p.placa ? " pcard__media--placa" : "") +
          '" href="producto.html?id=' + p.id + '" aria-label="Ver la ficha de ' + p.nombre + '">' +
          '<img src="' + src(p.img) + '" alt="' + p.nombre + '" loading="lazy" decoding="async">' +
          (promo && promo.desc ? '<span class="pcard__flag pcard__flag--off">-' + promo.desc + '%</span>' :
            p.destacado ? '<span class="pcard__flag">Más pedido</span>' :
            p.servicio ? '<span class="pcard__flag pcard__flag--srv">Pocas unidades</span>' : "") +
          (promo && promo.agotado ? '<span class="pcard__out">Agotado</span>' : "") +
        "</a>" +
        '<div class="pcard__body">' +
          '<div class="pcard__tags">' + badges + "</div>" +
          '<h3><a href="producto.html?id=' + p.id + '">' + p.nombre + "</a></h3>" +
          '<p class="pcard__desc">' + p.desc + "</p>" +
          (promo && (promo.nota || promo.hasta)
            ? '<p class="pcard__promo">' +
              (promo.nota ? promo.nota : "Oferta vigente") +
              (promo.hasta ? " · hasta el " + fecha(promo.hasta) : "") + "</p>"
            : "") +
          '<div class="pcard__meta">' +
            (p.p ? '<span><svg class="ico" aria-hidden="true"><use href="#i-package"></use></svg>' +
                   p.p.toLocaleString("es-MX") + " pzs por caja</span>" : "") +
            '<span><svg class="ico" aria-hidden="true"><use href="#i-ruler"></use></svg>' +
              p.v.length + (p.v.length === 1 ? " presentación" : " medidas") + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="pcard__buy">' +
          '<label class="pcard__pick">' +
            '<span class="sr-only">Medida de ' + p.nombre + "</span>" +
            "<select data-role=\"variant\">" + opts + "</select>" +
            '<svg class="ico" aria-hidden="true"><use href="#i-caret-down"></use></svg>' +
          "</label>" +
          '<div class="pcard__row">' +
            '<div class="stepper" data-role="stepper">' +
              '<button type="button" data-step="-1" aria-label="Quitar una caja">' +
                '<svg class="ico" aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
              '<input type="number" min="1" max="999" value="' + (line ? line.qty : 1) +
                '" data-role="qty" aria-label="Cajas de ' + p.nombre + '">' +
              '<button type="button" data-step="1" aria-label="Agregar una caja">' +
                '<svg class="ico" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
            "</div>" +
            '<button class="btn btn--primary btn--sm pcard__add" type="button" data-role="add">' +
              '<span class="btn__label">' + (line ? "Actualizar" : "Añadir") + "</span>" +
              '<svg class="ico" aria-hidden="true"><use href="#' + (line ? "i-check" : "i-plus") + '"></use></svg>' +
            "</button>" +
          "</div>" +
          '<p class="pcard__price">' + precioHTML(p) + "</p>" +
        "</div>" +
      "</article>";
  }

  function render() {
    var grid = $("grid");
    if (!grid) return;
    var list = filtered();
    grid.innerHTML = list.map(card).join("");
    $("empty").hidden = list.length > 0;

    var n = list.length;
    $("result-line").textContent = n === 0 ? "" :
      n + (n === 1 ? " producto" : " productos") +
      (state.cat === "todo" ? "" : " en " + (CATS.filter(function (c) { return c.id === state.cat; })[0] || {}).nombre) +
      (state.q.trim() ? ' para "' + state.q.trim() + '"' : "");

    if (reduce) {
      grid.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
    } else if (window.GN && window.GN.observe) {
      window.GN.observe(grid.querySelectorAll(".rv"));
    }
    syncChips();
  }

  /* ============================ carrito ============================ */
  function total() {
    return cart.reduce(function (s, l) { return s + l.qty; }, 0);
  }

  function paintCount() {
    var n = total();
    var el = $("cart-count");
    el.textContent = n;
    el.dataset.empty = String(n === 0);
    if (n > 0 && !reduce) {
      el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    }
  }

  function paintCart() {
    var list = $("cart-list");
    $("cart-empty").hidden = cart.length > 0;
    $("drawer-foot").hidden = cart.length === 0;

    list.innerHTML = cart.map(function (l) {
      var p = PRODS.filter(function (x) { return x.id === l.id; })[0];
      if (!p) return "";
      return '<li class="cart__item" data-id="' + l.id + '">' +
        '<img src="' + src(p.img) + '" alt="" loading="lazy">' +
        '<div class="cart__info">' +
          "<h4>" + p.nombre + "</h4>" +
          '<p class="cart__var">' + l.v + "</p>" +
          '<div class="stepper stepper--sm" data-role="stepper">' +
            '<button type="button" data-step="-1" aria-label="Quitar una caja">' +
              '<svg class="ico" aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
            '<input type="number" min="1" max="999" value="' + l.qty + '" data-role="qty" aria-label="Cajas">' +
            '<button type="button" data-step="1" aria-label="Agregar una caja">' +
              '<svg class="ico" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
          "</div>" +
        "</div>" +
        '<button class="cart__del" type="button" data-role="del" aria-label="Quitar ' + p.nombre + '">' +
          '<svg class="ico" aria-hidden="true"><use href="#i-trash"></use></svg></button>' +
        "</li>";
    }).join("");

    paintCount();
    paintSummary();
    persist();
  }

  function paintSummary() {
    var box = $("quote-summary");
    if (!box) return;
    box.hidden = cart.length === 0;
    if (!cart.length) return;
    box.innerHTML = "<h3>" + cart.length + (cart.length === 1 ? " producto en tu lista" : " productos en tu lista") + "</h3><ul>" +
      cart.map(function (l) {
        var p = PRODS.filter(function (x) { return x.id === l.id; })[0];
        return p ? "<li><b>" + l.qty + "×</b> " + p.nombre + " <span>" + l.v + "</span></li>" : "";
      }).join("") + "</ul>";
  }

  function add(id, v, qty) {
    var line = cart.filter(function (l) { return l.id === id && l.v === v; })[0];
    if (line) line.qty = qty;
    else {
      /* misma referencia, otra medida -> reemplaza la línea anterior de ese producto */
      cart = cart.filter(function (l) { return l.id !== id; });
      cart.push({ id: id, v: v, qty: qty });
    }
    paintCart();
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.dataset.on = "true";
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.dataset.on = "false"; }, 2600);
  }

  /* ============================ drawer ============================ */
  var lastFocus = null;
  function setDrawer(open) {
    var d = $("drawer");
    d.dataset.open = String(open);
    d.setAttribute("aria-hidden", String(!open));
    $("drawer-scrim").hidden = !open;
    document.body.dataset.locked = String(open);
    if (open) { lastFocus = document.activeElement; $("cart-close").focus(); }
    else if (lastFocus) lastFocus.focus();
  }

  /* ============================ eventos ============================ */

  /* El carrito y su cajón viven en las tres páginas de catálogo Y en la ficha
     de producto. El catálogo (chips, buscador, rejilla) solo existe donde hay
     #grid, así que todo eso se monta nada más si la rejilla está presente.
     Así producto.html reutiliza este mismo carrito sin duplicar su lógica. */
  paintCart();

  var HAY_CATALOGO = !!$("grid");

  if (HAY_CATALOGO) {

  /* El mega menú enlaza con ?cat= y ?q=; la tienda arranca ya filtrada. */
  (function () {
    var qs = new URLSearchParams(location.search);
    var cat = qs.get("cat");
    var q = qs.get("q");
    if (cat && CATS.some(function (c) { return c.id === cat; })) state.cat = cat;
    if (q) {
      state.q = q; $("q").value = q; $("q-clear").hidden = false;
      /* La primera pintura ocurre antes de que cargue la tabla de
         equivalencias; se repinta una vez que ya está todo en memoria. */
      window.addEventListener("DOMContentLoaded", function () { render(); });
    }
  })();

  buildChips();
  render();

  $("cats").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]"); if (!b) return;
    state.cat = b.dataset.cat; render();
    document.getElementById("catalogo").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  });

  $("mats").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mat]"); if (!b) return;
    var m = b.dataset.mat, i = state.mats.indexOf(m);
    if (i > -1) state.mats.splice(i, 1); else state.mats.push(m);
    render();
  });

  var clearBtn = $("facets-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      state.mats = []; state.cat = "todo"; state.q = ""; state.stock = "todo";
      $("q").value = ""; $("q-clear").hidden = true;
      var sb = $("stock");
      if (sb) Array.prototype.forEach.call(sb.children, function (x) {
        x.setAttribute("aria-pressed", String(x.dataset.stock === "todo"));
      });
      render();
    });
  }

  var filterBtn = $("filter-open");
  if (filterBtn) {
    var panel = $("facets") || $("side");
    var angosto = window.matchMedia("(max-width: 900px)");

    /* En móvil el panel arranca plegado y el botón lo abre; en escritorio la
       barra lateral está siempre a la vista y el botón no se muestra.
       El CSS ya trae `.side[hidden] { display: none }`, pero el marcado nunca
       ponía el atributo: la barra salía desplegada en el teléfono y empujaba la
       rejilla ~860 px hacia abajo antes de que se viera un solo producto. */
    function sincronizaPanel() {
      panel.hidden = angosto.matches;
      filterBtn.setAttribute("aria-expanded", String(!panel.hidden));
    }
    sincronizaPanel();
    angosto.addEventListener("change", sincronizaPanel);

    filterBtn.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      this.setAttribute("aria-expanded", String(!panel.hidden));
    });
  }

  var qt;
  $("q").addEventListener("input", function () {
    var v = this.value;
    $("q-clear").hidden = !v;
    clearTimeout(qt);
    qt = setTimeout(function () { state.q = v; render(); }, 140);
  });
  $("q-clear").addEventListener("click", function () {
    $("q").value = ""; this.hidden = true; state.q = ""; render(); $("q").focus();
  });

  $("sort").addEventListener("change", function () { state.sort = this.value; render(); });

  /* Solo existen en ofertas.html; en la tienda simplemente no están. */
  var stockBox = $("stock");
  if (stockBox) {
    stockBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-stock]"); if (!b) return;
      state.stock = b.dataset.stock;
      Array.prototype.forEach.call(stockBox.children, function (x) {
        x.setAttribute("aria-pressed", String(x.dataset.stock === state.stock));
      });
      render();
    });
  }

  var colsBox = $("cols");
  if (colsBox) {
    var savedCols = null;
    try { savedCols = localStorage.getItem("greenova.columnas"); } catch (e) { /* modo privado */ }
    function setCols(n) {
      $("grid").style.setProperty("--cols", n);
      Array.prototype.forEach.call(colsBox.children, function (x) {
        x.setAttribute("aria-pressed", String(x.dataset.cols === String(n)));
      });
      try { localStorage.setItem("greenova.columnas", n); } catch (e) { /* modo privado */ }
    }
    colsBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cols]"); if (b) setCols(b.dataset.cols);
    });
    setCols(savedCols || colsBox.dataset.def || 4);
  }

  }   /* fin del bloque de catálogo */

  /* steppers y botones: sirven igual en la rejilla, en el cajón y en la ficha */
  function stepperOf(el) { return el.closest("[data-role='stepper']"); }

  document.addEventListener("click", function (e) {
    var stepBtn = e.target.closest("[data-step]");
    if (stepBtn) {
      var wrap = stepperOf(stepBtn);
      var input = wrap.querySelector("[data-role='qty']");
      var next = Math.min(999, Math.max(1, (parseInt(input.value, 10) || 1) + Number(stepBtn.dataset.step)));
      input.value = next;
      var item = stepBtn.closest(".cart__item");
      if (item) {
        var l = cart.filter(function (x) { return x.id === item.dataset.id; })[0];
        if (l) { l.qty = next; paintCount(); paintSummary(); persist(); }
      }
      return;
    }

    var del = e.target.closest("[data-role='del']");
    if (del) {
      var li = del.closest(".cart__item");
      cart = cart.filter(function (x) { return x.id !== li.dataset.id; });
      var c = document.querySelector('.pcard[data-id="' + li.dataset.id + '"]');
      if (c) {
        c.removeAttribute("data-in");
        c.querySelector(".pcard__add .btn__label").textContent = "Añadir";
        c.querySelector(".pcard__add use").setAttribute("href", "#i-plus");
      }
      paintCart();
      return;
    }

    var addBtn = e.target.closest("[data-role='add']");
    if (addBtn) {
      var pc = addBtn.closest(".pcard, .ficha__compra");
      var qty = Math.max(1, parseInt(pc.querySelector("[data-role='qty']").value, 10) || 1);
      var v = pc.querySelector("[data-role='variant']").value;
      var prod = PRODS.filter(function (x) { return x.id === pc.dataset.id; })[0];
      add(pc.dataset.id, v, qty);
      pc.dataset.in = "true";
      addBtn.querySelector(".btn__label").textContent = "Actualizar";
      addBtn.querySelector("use").setAttribute("href", "#i-check");
      if (!reduce) { addBtn.classList.remove("did"); void addBtn.offsetWidth; addBtn.classList.add("did"); }
      toast(qty + (qty === 1 ? " caja de " : " cajas de ") + prod.nombre.toLowerCase() + " en tu carrito");
      return;
    }
  });

  document.addEventListener("change", function (e) {
    var input = e.target.closest("[data-role='qty']");
    if (input) {
      input.value = Math.min(999, Math.max(1, parseInt(input.value, 10) || 1));
      var item = input.closest(".cart__item");
      if (item) {
        var l = cart.filter(function (x) { return x.id === item.dataset.id; })[0];
        if (l) { l.qty = Number(input.value); paintCount(); paintSummary(); persist(); }
      }
    }
    /* cambiar de medida en una tarjeta ya agregada obliga a confirmar de nuevo */
    var sel = e.target.closest("[data-role='variant']");
    if (sel) {
      var pc = sel.closest(".pcard");
      /* En la ficha de producto el selector NO vive dentro de una .pcard.
         Sin esta guarda, cambiar de medida con el carrito lleno reventaba con
         "Cannot read properties of null (reading 'dataset')". No saltaba con el
         carrito vacío porque `filter` no llega a ejecutar el callback. */
      var l2 = pc && cart.filter(function (x) { return x.id === pc.dataset.id; })[0];
      if (l2 && l2.v !== sel.value) {
        pc.querySelector(".pcard__add .btn__label").textContent = "Actualizar";
        pc.querySelector(".pcard__add use").setAttribute("href", "#i-check");
      }
    }
  });

  $("cart-open").addEventListener("click", function () { setDrawer(true); });
  $("cart-close").addEventListener("click", function () { setDrawer(false); });
  $("drawer-scrim").addEventListener("click", function () { setDrawer(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && $("drawer").dataset.open === "true") setDrawer(false);
  });

  $("cart-clear").addEventListener("click", function () {
    cart = [];
    document.querySelectorAll('[data-in="true"]').forEach(function (c) {
      if (!c.querySelector(".pcard__add")) return;
      c.removeAttribute("data-in");
      c.querySelector(".pcard__add .btn__label").textContent = "Añadir";
      c.querySelector(".pcard__add use").setAttribute("href", "#i-plus");
    });
    paintCart();
    toast("Lista vacía");
  });

  $("cart-send").addEventListener("click", function () {
    setDrawer(false);
    /* En la ficha de producto no hay formulario: el enlace lleva a la tienda. */
    setTimeout(function () {
      var n = $("s-nombre");
      if (n) n.focus({ preventScroll: true });
    }, 400);
  });

  /* enlaces del footer que saltan a una categoría */
  document.querySelectorAll("[data-cat][href]").forEach(function (a) {
    a.addEventListener("click", function () {
      state.cat = this.dataset.cat; state.q = ""; $("q").value = ""; render();
    });
  });

  /* ============================ envío ============================ */
  var form = $("shop-form");
  if (form) {
    var status = $("shop-status"), submit = $("shop-submit");
    var label = submit.querySelector(".btn__label");

    function setError(id, message) {
      var input = $(id);
      var slot = form.querySelector('[data-err="' + id + '"]');
      input.closest(".field").dataset.invalid = message ? "true" : "false";
      input.setAttribute("aria-invalid", message ? "true" : "false");
      if (slot) slot.textContent = message || "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.dataset.state = "";

      var ok = true;
      setError("s-nombre", $("s-nombre").value.trim() ? "" : (ok = false, "Escribe tu nombre."));
      setError("s-correo",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("s-correo").value.trim()) ? "" : (ok = false, "Escribe un correo válido."));
      if (!ok) {
        status.textContent = "Revisa los campos marcados.";
        form.querySelector('[data-invalid="true"] input').focus();
        return;
      }
      if (!cart.length) {
        status.dataset.state = "warn";
        status.textContent = "Tu lista está vacía. Agrega al menos un producto del catálogo.";
        document.getElementById("catalogo").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        return;
      }

      submit.dataset.loading = "true";
      label.textContent = "Preparando";

      var d = Object.fromEntries(new FormData(form).entries());
      var lines = cart.map(function (l) {
        var p = PRODS.filter(function (x) { return x.id === l.id; })[0];
        return "- " + l.qty + " x " + (p ? p.nombre : l.id) + " (" + l.v + ")";
      }).join("\n");

      var body = [
        "Nombre: " + d.nombre,
        "Negocio: " + (d.negocio || "No indicado"),
        "Correo: " + d.correo,
        "Telefono: " + (d.telefono || "No indicado"),
        "",
        "PRODUCTOS SOLICITADOS (" + total() + " cajas en total):",
        lines,
        "",
        "Notas:",
        d.mensaje || "Sin notas."
      ].join("\n");

      /* PENDIENTE: sustituir por un POST a un endpoint real (ver README). */
      window.location.href = "mailto:ventas@greenovasc.com.mx?subject=" +
        encodeURIComponent("Cotización desde la tienda (" + cart.length + " productos)") +
        "&body=" + encodeURIComponent(body);

      setTimeout(function () {
        submit.dataset.loading = "false";
        label.textContent = "Enviar pedido";
        status.dataset.state = "ok";
        status.textContent = "Listo. Abrimos tu correo con la lista completa. Si no se abrió, escribe a ventas@greenovasc.com.mx";
        if (!reduce && window.GN && window.GN.burst) window.GN.burst(submit);
      }, 420);
    });

    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.dataset.invalid === "true") setError(e.target.id, "");
    });
  }
})();
