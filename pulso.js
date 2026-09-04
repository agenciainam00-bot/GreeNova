/* GreeNova SC - pulso del catálogo.
   ===========================================================================
   Cuenta qué productos mira la gente, para el mapa de calor del panel. Manda
   solo el id del producto y el tipo de evento: ni cookies, ni identificadores,
   ni nada que diga quién es la persona.

   Usa sendBeacon, que entrega el dato sin retrasar la navegación y sobrevive a
   que el visitante cambie de página en ese momento. Si el servidor no existe
   (Hostinger estático), falla en silencio y no se rompe nada.
   =========================================================================== */
(function () {
  "use strict";
  if (!navigator.sendBeacon) return;

  function manda(id, tipo) {
    if (!id) return;
    try {
      navigator.sendBeacon("/api/pulso",
        new Blob([JSON.stringify({ id: id, tipo: tipo })], { type: "application/json" }));
    } catch (e) { /* sin servidor: da igual */ }
  }

  /* Una tarjeta se cuenta como vista cuando de verdad se ve, no cuando se
     carga la página: si el visitante nunca baja, ese producto no se miró. */
  if (window.IntersectionObserver) {
    var contadas = {};
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.dataset.id;
        if (!id || contadas[id]) return;
        contadas[id] = true;
        manda(id, "ver");
        ojo.unobserve(e.target);
      });
    }, { threshold: 0.6 });

    var mirar = function () {
      document.querySelectorAll(".pcard[data-id]").forEach(function (c) { ojo.observe(c); });
    };
    mirar();
    /* La rejilla se repinta con cada filtro, así que hay que volver a mirar. */
    var grid = document.getElementById("grid");
    if (grid) new MutationObserver(mirar).observe(grid, { childList: true });
  }

  document.addEventListener("click", function (e) {
    var card = e.target.closest(".pcard[data-id]");
    if (!card) return;
    manda(card.dataset.id, e.target.closest(".pcard__add") ? "carrito" : "click");
  });
})();
