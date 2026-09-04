/* GreeNova SC - landing behaviour.
   No scroll listeners anywhere: sticky state and reveals both run on IntersectionObserver. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- sticky nav border ---------- */
  var nav = document.getElementById("nav");
  if (nav) {
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none";
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      nav.dataset.stuck = String(!entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  function setMenu(open) {
    nav.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    toggle.querySelector("use").setAttribute("href", open ? "#i-x" : "#i-list");
  }
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var abriendo = nav.dataset.open !== "true";
      setMenu(abriendo);
      /* el panel del mega vive fuera de .nav__links: si se cierra el menú
         móvil hay que cerrarlo también, o se queda colgando solo */
      if (!abriendo && window.GNMega) window.GNMega(false);
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.dataset.open === "true") { setMenu(false); toggle.focus(); }
    });
  }

  /* ---------- reveal on scroll ----------
     `GN.observe(nodes)` lets dynamically rendered markup (the shop grid) join in. */
  var io = null;
  if (!reduce) {
    io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  }

  function observe(nodes) {
    Array.prototype.forEach.call(nodes, function (el) {
      if (io) io.observe(el); else el.classList.add("in");
    });
  }
  observe(document.querySelectorAll(".rv"));

  /* Red de seguridad: si el observador nunca disparó (pestaña que nunca se pintó,
     viewport de alto cero, impresión), el contenido se quedaría en opacity 0.
     Solo actúa cuando NADA se reveló, para no matar la animación del caso normal. */
  if (io) {
    setTimeout(function () {
      if (document.querySelector(".rv.in")) return;
      document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
    }, 4000);
    window.addEventListener("beforeprint", function () {
      document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
    });
  }

  if (!reduce) {
    /* Above the fold: reveal on the next frame so it animates in instead of snapping.
       rAF is paused in a hidden or background tab, so a timeout backs it up -- otherwise
       the hero would sit at opacity 0 for anyone who opens the site in a background tab. */
    var heroShown = false;
    function showHero() {
      if (heroShown) return;
      heroShown = true;
      document.querySelectorAll(".hero .rv, .shop-head .rv").forEach(function (el) {
        el.classList.add("in");
      });
    }
    requestAnimationFrame(showHero);
    setTimeout(showHero, 80);
  }




  /* ---------- mega menú de Productos ----------
     Escritorio: abre al pasar el cursor, con retardo corto para que no
     parpadee al cruzarlo de paso. Táctil y teclado: abre con clic o Enter.
     Cierra con Escape, al hacer clic fuera o al salir el foco del bloque. */
  var mega = document.getElementById("mega");
  var megaBtn = document.getElementById("mega-btn");
  var megaHost = document.getElementById("mega-host");
  if (mega && megaBtn) {
    var abreT = null, cierraT = null;
    var puntero = window.matchMedia("(hover: hover) and (pointer: fine)");
    var angosto = window.matchMedia("(max-width: 900px)");

    function setMega(open) {
      clearTimeout(abreT); clearTimeout(cierraT);
      if (open) {
        mega.hidden = false;
        /* Reflujo síncrono: el navegador tiene que ver el estado cerrado antes de
           que cambie data-open, o no hay transición. Se hace aquí y no en un
           requestAnimationFrame porque rAF se pausa en pestañas ocultas y dejaba
           el menú sin abrir. */
        void mega.offsetWidth;
      }
      mega.dataset.open = String(open);
      megaBtn.setAttribute("aria-expanded", String(open));
      if (!open) {
        cierraT = setTimeout(function () {
          if (mega.dataset.open !== "true") mega.hidden = true;
        }, 340);
      }
    }
    setMega(false);
    window.GNMega = setMega;

    megaBtn.addEventListener("click", function () {
      setMega(mega.dataset.open !== "true");
    });

    /* hover solo donde hay cursor de verdad y hay espacio para el panel */
    function hoverActivo() { return puntero.matches && !angosto.matches; }
    [megaHost, mega].forEach(function (zona) {
      if (!zona) return;
      zona.addEventListener("pointerenter", function () {
        if (!hoverActivo()) return;
        clearTimeout(cierraT);
        abreT = setTimeout(function () { setMega(true); }, 90);
      });
      zona.addEventListener("pointerleave", function () {
        if (!hoverActivo()) return;
        clearTimeout(abreT);
        cierraT = setTimeout(function () { setMega(false); }, 220);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mega.dataset.open === "true") { setMega(false); megaBtn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (mega.dataset.open !== "true") return;
      if (!mega.contains(e.target) && !megaHost.contains(e.target)) setMega(false);
    });
    document.addEventListener("focusin", function (e) {
      if (mega.dataset.open !== "true") return;
      if (!mega.contains(e.target) && !megaHost.contains(e.target)) setMega(false);
    });
  }

  /* ---------- interruptor de tema ----------
     El HTML ya aplicó el tema guardado antes de pintar; aquí solo se alterna. */
  var themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    function paintTheme() {
      var dark = document.documentElement.dataset.theme === "dark";
      themeBtn.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
      themeBtn.dataset.dark = String(dark);
    }
    paintTheme();
    themeBtn.addEventListener("click", function () {
      var dark = document.documentElement.dataset.theme === "dark";
      if (dark) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = "dark";
      try { localStorage.setItem("greenova.tema", dark ? "light" : "dark"); } catch (e) { /* modo privado */ }
      paintTheme();
    });
  }

  /* ---------- size finder tabs ---------- */
  var tablist = document.querySelector('[role="tablist"]');
  if (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    }

    tablist.addEventListener("click", function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab) select(tab, false);
    });

    tablist.addEventListener("keydown", function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  }

  /* ---------- quote form ----------
     Submitting composes a message in the visitor's mail client. Swap `send()` for a
     POST to a real endpoint when the site gets a backend or a form service. */
  var form = document.getElementById("quote-form");
  if (form) {
    var status = document.getElementById("quote-status");
    var submit = document.getElementById("quote-submit");
    var label = submit.querySelector(".btn__label");

    function setError(id, message) {
      var input = document.getElementById(id);
      var slot = form.querySelector('[data-err="' + id + '"]');
      input.closest(".field").dataset.invalid = message ? "true" : "false";
      input.setAttribute("aria-invalid", message ? "true" : "false");
      slot.textContent = message || "";
    }

    function validate() {
      var ok = true;
      var nombre = document.getElementById("f-nombre");
      var correo = document.getElementById("f-correo");
      var mensaje = document.getElementById("f-mensaje");

      setError("f-nombre", nombre.value.trim() ? "" : (ok = false, "Escribe tu nombre."));
      setError("f-correo",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim()) ? "" : (ok = false, "Escribe un correo válido."));
      setError("f-mensaje",
        mensaje.value.trim().length > 4 ? "" : (ok = false, "Dinos qué medida y qué volumen necesitas."));
      return ok;
    }

    function send(data) {
      var subject = "Cotización: " + data.producto;
      var body = [
        "Nombre: " + data.nombre,
        "Negocio: " + (data.negocio || "No indicado"),
        "Correo: " + data.correo,
        "Teléfono: " + (data.telefono || "No indicado"),
        "Producto: " + data.producto,
        "",
        "Medidas y volumen:",
        data.mensaje
      ].join("\n");
      window.location.href = "mailto:ventas@greenovasc.com.mx?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.dataset.state = "";
      if (!validate()) {
        status.textContent = "Revisa los campos marcados.";
        form.querySelector('[data-invalid="true"] input, [data-invalid="true"] textarea').focus();
        return;
      }

      submit.dataset.loading = "true";
      label.textContent = "Preparando";
      status.textContent = "";

      var data = Object.fromEntries(new FormData(form).entries());

      window.setTimeout(function () {
        send(data);
        submit.dataset.loading = "false";
        label.textContent = "Solicitar cotización";
        status.dataset.state = "ok";
        status.textContent = "Listo. Abrimos tu correo con la solicitud. Si no se abrió, escribe a ventas@greenovasc.com.mx";
      }, 420);
    });

    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.dataset.invalid === "true") setError(e.target.id, "");
    });
  }
  /* ---------- count-up numbers ----------
     Fires once, when the stat scrolls into view. */
  var nums = document.querySelectorAll(".num[data-to]");
  if (nums.length) {
    if (reduce) {
      nums.forEach(function (n) { n.textContent = n.dataset.to; });
    } else {
      /* Si el observador nunca dispara (pestaña oculta, viewport de alto cero),
         el número se queda en 0. A los 3 s lo escribimos tal cual. */
      var numFallback = setTimeout(function () {
        nums.forEach(function (n) { if (n.textContent === "0") n.textContent = n.dataset.to; });
      }, 3000);
      var numIO = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          clearTimeout(numFallback);
          obs.unobserve(en.target);
          var el = en.target, to = Number(el.dataset.to) || 0, t0 = 0;
          (function tick(now) {
            if (!t0) t0 = now;
            var k = Math.min(1, (now - t0) / 1100);
            var eased = 1 - Math.pow(1 - k, 3);
            el.textContent = Math.round(to * eased).toLocaleString("es-MX");
            if (k < 1) requestAnimationFrame(tick);
          })(0);
        });
      }, { threshold: 0.6 });
      nums.forEach(function (n) { numIO.observe(n); });
    }
  }

  /* ---------- magnetic buttons + ripple ----------
     Pointer-only: coarse pointers get nothing, which is what we want on touch. */
  var fine = window.matchMedia("(pointer: fine)").matches;
  if (fine && !reduce) {
    document.addEventListener("pointermove", function (e) {
      var b = e.target.closest(".btn--primary, .chip, .cart-btn");
      if (!b) return;
      var r = b.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      b.style.setProperty("--mx", (dx * 8).toFixed(2) + "px");
      b.style.setProperty("--my", (dy * 6).toFixed(2) + "px");
    });
    document.addEventListener("pointerleave", function (e) {
      var b = e.target.closest && e.target.closest(".btn--primary, .chip, .cart-btn");
      if (b) { b.style.removeProperty("--mx"); b.style.removeProperty("--my"); }
    }, true);
  }

  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".btn, .chip, .tab, .cart-btn");
    if (!b || reduce) return;
    var r = b.getBoundingClientRect();
    var d = document.createElement("span");
    d.className = "ripple";
    d.style.left = (e.clientX - r.left) + "px";
    d.style.top = (e.clientY - r.top) + "px";
    b.appendChild(d);
    setTimeout(function () { d.remove(); }, 620);
  });

  /* ---------- card tilt + cursor spotlight ---------- */
  if (fine && !reduce) {
    document.addEventListener("pointermove", function (e) {
      var c = e.target.closest(".pcard, .prod, .tile");
      if (!c) return;
      var r = c.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      c.style.setProperty("--px", (px * 100).toFixed(1) + "%");
      c.style.setProperty("--py", (py * 100).toFixed(1) + "%");
      c.style.setProperty("--rx", ((0.5 - py) * 5).toFixed(2) + "deg");
      c.style.setProperty("--ry", ((px - 0.5) * 6).toFixed(2) + "deg");
    });
    document.addEventListener("pointerleave", function (e) {
      var c = e.target.closest && e.target.closest(".pcard, .prod, .tile");
      if (c) { c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); }
    }, true);
  }

  /* ---------- accordion ---------- */
  document.querySelectorAll(".acc__q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.closest(".acc__item");
      var open = item.dataset.open === "true";
      item.parentElement.querySelectorAll(".acc__item").forEach(function (o) {
        o.dataset.open = "false";
        o.querySelector(".acc__q").setAttribute("aria-expanded", "false");
      });
      item.dataset.open = String(!open);
      q.setAttribute("aria-expanded", String(!open));
    });
  });

  /* ---------- back to top ---------- */
  var top = document.getElementById("to-top");
  if (top) {
    var topSentinel = document.querySelector(".hero, .shop-head");
    if (topSentinel) {
      new IntersectionObserver(function (en) {
        top.dataset.on = String(!en[0].isIntersecting);
      }, { rootMargin: "-40% 0px 0px 0px" }).observe(topSentinel);
    }
    top.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- success burst ----------
     Twelve leaf-coloured chips thrown from the button. Purely decorative. */
  function burst(el) {
    if (reduce || !el) return;
    var r = el.getBoundingClientRect();
    var host = document.createElement("div");
    host.className = "burst";
    host.style.left = (r.left + r.width / 2) + "px";
    host.style.top = (r.top + r.height / 2) + "px";
    for (var i = 0; i < 12; i++) {
      var s = document.createElement("i");
      var a = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      var dist = 60 + Math.random() * 70;
      s.style.setProperty("--dx", (Math.cos(a) * dist).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(a) * dist - 20).toFixed(1) + "px");
      s.style.setProperty("--d", (Math.random() * 90).toFixed(0) + "ms");
      s.style.setProperty("--rot", (Math.random() * 360).toFixed(0) + "deg");
      host.appendChild(s);
    }
    document.body.appendChild(host);
    setTimeout(function () { host.remove(); }, 1200);
  }

  /* ---------- cart badge outside the shop ----------
     index.html shows the same counter the shop writes, so the nav stays honest. */
  var badge = document.getElementById("cart-count");
  if (badge && !window.GREENOVA) {
    try {
      var saved = JSON.parse(localStorage.getItem("greenova.cotizacion.v1") || "[]");
      var n = saved.reduce(function (s, l) { return s + (l.qty || 0); }, 0);
      badge.textContent = n;
      badge.dataset.empty = String(n === 0);
    } catch (e) { /* modo privado */ }
  }

  window.GN = { observe: observe, burst: burst };
})();
