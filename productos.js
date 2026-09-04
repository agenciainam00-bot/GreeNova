/* GreeNova SC - catálogo de productos.
   ---------------------------------------------------------------------------
   Fuente: "Catálogo de Productos 2026" (PDF). Todas las medidas, modelos y
   piezas por caja salen de las tablas del catálogo. Nada aquí está inventado.

   PRECIOS: el catálogo no publica lista de precios (solo aparece $120 en la
   ficha del vaso de papel con registro SEDEMA, sin unidad). Por eso cada
   producto trae `precio: null` y la tienda muestra "Cotizar" en vez de importe.
   En cuanto exista lista, basta poner el número en `precio` (MXN por caja) y
   la tienda enciende sola los importes y el subtotal del carrito.
   --------------------------------------------------------------------------- */
window.GREENOVA = (function () {
  "use strict";

  var CATEGORIAS = [
    { id: "vasos-papel",  nombre: "Vasos de papel",    icono: "i-coffee" },
    { id: "vasos-frios",  nombre: "Vasos PET y PLA",   icono: "i-cup-cold" },
    { id: "tapas",        nombre: "Tapas",             icono: "i-circle-half" },
    { id: "contenedores", nombre: "Contenedores",      icono: "i-package" },
    { id: "bagazo",       nombre: "Bagazo y paja",     icono: "i-bowl-food" },
    { id: "accesorios",   nombre: "Accesorios",        icono: "i-fork-knife" },
    { id: "papel",        nombre: "Papel y bolsas",    icono: "i-shopping-bag" }
  ];

  /* Materiales -> etiqueta visible + color del chip */
  var MATERIALES = {
    papel:        "Papel",
    "papel-fsc":  "Papel FSC",
    pla:          "PLA compostable",
    pet:          "PET",
    kraft:        "Kraft",
    bagazo:       "Bagazo de caña",
    "paja-trigo": "Paja de trigo",
    fecula:       "Fécula de maíz",
    madera:       "Madera",
    tapioca:      "Tapioca",
    plastico:     "Plástico",
    carton:       "Cartón"
  };

  /* p = piezas por caja | v = variantes (medidas del catálogo) */
  var PRODUCTOS = [
    /* ---------------- vasos de papel ---------------- */
    { id: "vaso-papel-blanco", nombre: "Vaso de papel blanco", cat: "vasos-papel",
      mat: ["papel"], img: "vaso-papel-par", p: 1000, destacado: true,
      desc: "Para bebidas calientes y frías. La línea base de barra, en seis medidas.",
      v: ["4 oz · boca 63 mm", "8 oz · boca 80 mm", "10 oz · boca 90 mm",
          "12 oz · boca 90 mm", "16 oz · boca 90 mm", "20 oz · boca 90 mm"] },

    { id: "vaso-papel-sedema", nombre: "Vaso de papel con registro SEDEMA", cat: "vasos-papel",
      mat: ["papel"], img: "vaso-papel-sedema", p: 1000, destacado: true, sello: "SEDEMA",
      desc: "Registrado ante la Ciudad de México. El vaso que pide la normativa local.",
      v: ["4 oz · boca 63 mm", "8 oz · boca 80 mm", "10 oz · boca 90 mm",
          "12 oz · boca 90 mm", "16 oz · boca 90 mm", "20 oz · boca 90 mm"] },

    { id: "vaso-papel-compostable", nombre: "Vaso de papel compostable", cat: "vasos-papel",
      mat: ["papel", "pla"], img: "vaso-papel-compostable", p: 1000,
      desc: "Recubrimiento en PLA. Se composta con la fracción orgánica.",
      v: ["8 oz · boca 80 mm", "10 oz · boca 90 mm", "12 oz · boca 90 mm",
          "16 oz · boca 90 mm", "20 oz · boca 90 mm"] },

    { id: "vaso-papel-impreso", nombre: "Vaso de papel con impresión", cat: "vasos-papel",
      mat: ["papel"], img: "vaso-papel-impreso", p: 1000, servicio: true,
      desc: "Tu logo impreso en serigrafía sobre el vaso. Producción bajo pedido.",
      v: ["8 oz · boca 80 mm", "12 oz · boca 90 mm", "16 oz · boca 90 mm", "20 oz · boca 90 mm"] },

    /* ---------------- vasos PET y PLA ---------------- */
    { id: "vaso-pet", nombre: "Vaso PET para bebida fría", cat: "vasos-frios",
      mat: ["pet"], img: "vaso-pet-vpa", destacado: true,
      desc: "Transparencia que vende. El formato clásico para frappé, agua fresca y smoothie.",
      v: ["7 oz · boca 78 mm", "10 oz · boca 78 mm", "12 oz · boca 92 mm", "12 oz · boca 95 mm",
          "14 oz · boca 98 mm", "16 oz · boca 95 mm", "16 oz · boca 98 mm", "20 oz · boca 95 mm",
          "20 oz · boca 98 mm", "24 oz · boca 98 mm", "32 oz · boca 107 mm"] },

    { id: "vaso-pla", nombre: "Vaso PLA compostable para bebida fría", cat: "vasos-frios",
      mat: ["pla"], img: "vaso-pet-vpc", destacado: true,
      desc: "Mismo aspecto que el PET, hecho de ácido poliláctico. La opción compostable de la línea fría.",
      v: ["12 oz · boca 95 mm", "16 oz · boca 95 mm", "20 oz · boca 95 mm"] },

    { id: "vaso-pet-u", nombre: "Vaso PET-U de una sola pieza", cat: "vasos-frios",
      mat: ["pet"], img: "vaso-pet-vpu",
      desc: "Cuerpo de una sola pieza, pared recta. Aguanta mejor el apilado.",
      v: ["12 oz · boca 90 mm", "16 oz · boca 90 mm", "24 oz · boca 90 mm"] },

    { id: "vaso-pet-alto", nombre: "Vaso PET alto", cat: "vasos-frios",
      mat: ["pet"], img: "vaso-pet-vpb",
      desc: "Perfil alto y esbelto para bebidas de especialidad.",
      v: ["16 oz · boca 95 mm", "20 oz · boca 95 mm", "24 oz · boca 98 mm", "32 oz · boca 107 mm"] },

    /* ---------------- tapas: bebida caliente ---------------- */
    { id: "tapa-4oz", nombre: "Tapa para vaso de 4 oz", cat: "tapas",
      mat: ["plastico"], img: "tapa-blanca-plana",
      desc: "Modelo 4A. Bebida caliente.", v: ["Modelo 4A"] },

    { id: "tapa-8oz-papel", nombre: "Tapa de papel para vaso de 8 oz", cat: "tapas",
      mat: ["papel"], img: "tapa-kraft-cafe",
      desc: "Bebida caliente. Cinco modelos según el estilo de bebedero.",
      v: ["Modelo 8A", "Modelo 8B", "Modelo 8C", "Modelo 8D", "Modelo 8G · papel"] },

    { id: "tapa-8oz-pla", nombre: "Tapa compostable PLA para vaso de 8 oz", cat: "tapas",
      mat: ["pla"], img: "tapa-blanca-solo",
      desc: "Bebida caliente. Modelos compostables en ácido poliláctico.",
      v: ["Modelo 8E · PLA", "Modelo 8F · PLA"] },

    { id: "tapa-1020-papel", nombre: "Tapa de papel para vaso de 10 a 20 oz", cat: "tapas",
      mat: ["papel"], img: "tapa-viajera-blanca", destacado: true,
      desc: "La tapa de mayor rotación: cubre 10, 12, 16 y 20 oz con la misma pieza.",
      v: ["Modelo TA", "Modelo TB", "Modelo TC", "Modelo TD",
          "Modelo TE", "Modelo TF", "Modelo TG", "Modelo TI · papel"] },

    { id: "tapa-1020-pla", nombre: "Tapa compostable PLA para vaso de 10 a 20 oz", cat: "tapas",
      mat: ["pla"], img: "tapa-domo-blanca",
      desc: "Versión compostable de la tapa de mayor rotación.",
      v: ["Modelo TH · PLA", "Modelo TI · PLA"] },

    { id: "tapa-viajera", nombre: "Tapa viajera con seguro", cat: "tapas",
      mat: ["plastico"], img: "tapa-viajera-negra",
      desc: "Bebedero con tapón abatible. Para pedido para llevar y reparto.",
      v: ["10 a 20 oz · negra", "10 a 20 oz · blanca"] },

    { id: "tapa-domo-alto", nombre: "Tapa domo alto para bebida caliente", cat: "tapas",
      mat: ["plastico"], img: "tapa-blanca-domo-alto",
      desc: "Domo alto para crema batida y coberturas.",
      v: ["10 a 20 oz · blanca", "10 a 20 oz · negra"] },

    /* ---------------- tapas: bebida fría ---------------- */
    { id: "tapa-fria-78", nombre: "Tapa para vaso frío de 78 mm", cat: "tapas",
      mat: ["pet"], img: "tapa-fria-plana",
      desc: "Diámetro 78 mm. Plana y domo.", v: ["Modelo PA", "Modelo PB"] },

    { id: "tapa-fria-90", nombre: "Tapa para vaso frío de 90 mm", cat: "tapas",
      mat: ["pet"], img: "tapa-fria-plana-par",
      desc: "Diámetro 90 mm, para la línea PET-U.",
      v: ["Modelo PA", "Modelo PB", "Modelo PC"] },

    { id: "tapa-fria-92", nombre: "Tapa para vaso frío de 92 mm", cat: "tapas",
      mat: ["pet"], img: "tapa-fria-plana-lisa",
      desc: "Diámetro 92 mm.", v: ["Modelo PA", "Modelo PB"] },

    { id: "tapa-fria-95", nombre: "Tapa para vaso frío de 95 mm", cat: "tapas",
      mat: ["pet", "pla"], img: "tapa-fria-domo", destacado: true,
      desc: "Diámetro 95 mm. Incluye dos modelos compostables en PLA.",
      v: ["Modelo PA", "Modelo PB", "Modelo PC",
          "Modelo PA · compostable", "Modelo PB · compostable"] },

    { id: "tapa-fria-98", nombre: "Tapa para vaso frío de 98 mm", cat: "tapas",
      mat: ["pet"], img: "tapa-fria-plana-hoyo",
      desc: "Diámetro 98 mm. Siete modelos: plana, con hoyo, domo y domo alto.",
      v: ["Modelo PA", "Modelo PB", "Modelo PC", "Modelo PD",
          "Modelo PE", "Modelo PF", "Modelo PG"] },

    { id: "tapa-fria-107", nombre: "Tapa para vaso frío de 107 mm", cat: "tapas",
      mat: ["pet"], img: "tapa-fria-domo-alto",
      desc: "Diámetro 107 mm, para el vaso de 32 oz.", v: ["Modelo PA", "Modelo PB"] },

    { id: "tapa-fria-domo-par", nombre: "Tapa domo para bebida fría", cat: "tapas",
      mat: ["pet"], img: "tapa-fria-domo-par",
      desc: "Domo sin hoyo, para bebidas con cobertura o topping.",
      v: ["95 mm", "98 mm", "107 mm"] },

    /* ---------------- contenedores ---------------- */
    { id: "contenedor-kraft-rect", nombre: "Contenedor rectangular kraft", cat: "contenedores",
      mat: ["kraft"], img: "contenedor-kraft-rect", p: 300, destacado: true,
      desc: "Resiste alimento caliente y grasa sin perder la forma. El caballo de batalla del para llevar.",
      v: ["500 ml", "650 ml", "750 ml"] },

    { id: "tapa-contenedor-kraft", nombre: "Tapa kraft para contenedor", cat: "contenedores",
      mat: ["kraft"], img: "tapa-perfil-kraft", p: 300,
      desc: "Genérica para los tres volúmenes de contenedor rectangular.", v: ["Genérica"] },

    { id: "tapa-contenedor-plastico", nombre: "Tapa de plástico para contenedor", cat: "contenedores",
      mat: ["plastico"], img: "tapa-fria-plana-lisa", p: 300,
      desc: "Tapa transparente. Deja ver el contenido en mostrador y reparto.", v: ["Genérica"] },

    { id: "contenedor-circular-kraft", nombre: "Contenedor circular kraft", cat: "contenedores",
      mat: ["kraft"], img: "contenedor-circular-kraft",
      desc: "Para sopas, ensaladas y bowls calientes. Con tapa a juego.",
      v: ["Chico", "Mediano", "Grande"] },

    { id: "contenedor-kraft-redondo", nombre: "Contenedor kraft redondo con tapa", cat: "contenedores",
      mat: ["kraft"], img: "contenedor-kraft-redondo",
      desc: "Cuerpo y tapa en kraft. Apilable para exhibición.",
      v: ["Chico", "Mediano", "Grande"] },

    { id: "contenedor-papel-chino", nombre: "Contenedor de papel chino", cat: "contenedores",
      mat: ["kraft"], img: "contenedor-papel-chino",
      desc: "Cierre de solapas, sin tapa extra. Para arroz, pasta y salteados.",
      v: ["Chico", "Mediano", "Grande"] },

    { id: "contenedor-helado", nombre: "Contenedor de papel para helado", cat: "contenedores",
      mat: ["papel"], img: "contenedor-helado",
      desc: "Pared lisa, apto para congelación.", v: ["Chico", "Mediano", "Grande"] },

    /* la foto es una caja blanca sobre fondo blanco: no se puede recortar,
       por eso va sobre placa (ver `placa` en la tarjeta) */
    { id: "caja-pizza", nombre: "Caja de pizza", cat: "contenedores",
      mat: ["carton"], img: "caja-pizza", placa: true,
      desc: "Cartón corrugado. Con o sin impresión de tu logo.",
      v: ["Personal", "Mediana", "Grande", "Familiar"] },

    { id: "caja-rebanada-pizza", nombre: "Contenedor para rebanada de pizza", cat: "contenedores",
      mat: ["kraft"], img: "caja-rebanada-pizza",
      desc: "Kraft natural, para venta por rebanada.", v: ["Estándar"] },

    { id: "charola-kraft", nombre: "Charola kraft para papas", cat: "contenedores",
      mat: ["kraft"], img: "charola-kraft",
      desc: "Charola abierta para papas, boneless y frituras.",
      v: ["Chica", "Mediana", "Grande"] },

    { id: "bowl-domo", nombre: "Bowl transparente con tapa domo", cat: "contenedores",
      mat: ["pet"], img: "bowl-domo",
      desc: "Para ensaladas, fruta y postres en barra fría.",
      v: ["Chico", "Mediano", "Grande"] },

    { id: "almeja-transparente", nombre: "Contenedor almeja transparente", cat: "contenedores",
      mat: ["pet"], img: "almeja-transparente",
      desc: "Bisagra y cierre a presión. Exhibe el producto sin abrirlo.",
      v: ["Chica", "Mediana", "Grande"] },

    { id: "ensaladera-transparente", nombre: "Ensaladera transparente", cat: "contenedores",
      mat: ["pet"], img: "ensaladera-transparente",
      desc: "Base honda con tapa. Para ensaladas y bowls fríos.",
      v: ["Chica", "Grande"] },

    { id: "contenedor-bisagra", nombre: "Contenedor cuadrado con bisagra", cat: "contenedores",
      mat: ["pet"], img: "contenedor-bisagra",
      desc: "Cuerpo y tapa en una sola pieza.", v: ["Chico", "Mediano", "Grande"] },

    { id: "charola-pastel-redonda", nombre: "Charola para pastel redonda", cat: "contenedores",
      mat: ["pet"], img: "charola-pastel-redonda",
      desc: "Base negra y domo transparente. Para pastelería y repostería.",
      v: ["Chica", "Mediana", "Grande"] },

    { id: "charola-pastel-larga", nombre: "Charola para pastel larga", cat: "contenedores",
      mat: ["pet"], img: "charola-pastel-larga",
      desc: "Formato alargado para roscas, brazos y panqués.", v: ["Estándar"] },

    { id: "contenedor-rebanada-pastel", nombre: "Contenedor para rebanada de pastel", cat: "contenedores",
      mat: ["pet"], img: "contenedor-rebanada-pastel",
      desc: "Triangular con bisagra. Venta por porción.", v: ["Estándar"] },

    /* ---------------- bagazo y paja de trigo ---------------- */
    { id: "almeja-bagazo", nombre: "Contenedor almeja de bagazo", cat: "bagazo",
      mat: ["bagazo"], img: "almeja-bagazo", destacado: true,
      desc: "Fibra de caña de azúcar. Compostable, resiste calor y grasa.",
      v: ["Chica", "Mediana", "Grande"] },

    { id: "charola-paja-trigo", nombre: "Charola oval de paja de trigo", cat: "bagazo",
      mat: ["paja-trigo"], img: "charola-paja-trigo",
      desc: "Fibra de paja de trigo. Para platos fuertes y comida preparada.",
      v: ["Chica", "Mediana", "Grande"] },

    { id: "souffle-fecula", nombre: "Soufflé de fécula de maíz", cat: "bagazo",
      mat: ["fecula"], img: "souffle-fecula",
      desc: "Vasito para salsa y aderezo. Biodegradable.",
      v: ["1 oz", "2 oz", "4 oz"] },

    /* ---------------- accesorios ---------------- */
    { id: "fajilla-ajustable", nombre: "Fajilla ajustable para vaso", cat: "accesorios",
      mat: ["kraft"], img: "fajilla-kraft", p: 1000, destacado: true,
      desc: "Aísla el calor y da superficie para tu marca.",
      v: ["Ajustable", "Pegada", "Impresión completa"] },

    { id: "agitador-madera", nombre: "Agitador de madera", cat: "accesorios",
      mat: ["madera"], img: "agitador-madera", p: 10000,
      desc: "Madera natural, sin recubrimiento.", v: ["14 mm", "18 mm"] },

    { id: "portavaso-charola", nombre: "Portavasos charola", cat: "accesorios",
      mat: ["bagazo"], img: "portavaso-charola-4",
      desc: "Fibra moldeada. Para reparto y pedidos de varias bebidas.",
      v: ["4 vasos · caja de 300", "2 vasos · caja de 600"] },

    { id: "portavaso-asa", nombre: "Portavasos con asa", cat: "accesorios",
      mat: ["kraft"], img: "portavaso-caja-kraft",
      desc: "Kraft con asa troquelada. Se carga con una mano.",
      v: ["4 vasos · caja de 200", "2 vasos · caja de 250"] },

    { id: "popote-tapioca", nombre: "Popote de tapioca biodegradable", cat: "accesorios",
      mat: ["tapioca"], img: "vaso-popotes", destacado: true,
      desc: "Almidón de tapioca. No se reblandece como el de papel.",
      v: ["21 cm · a granel, 5 kg", "21 cm · estuchado, 2,000 pzs"] },

    { id: "popote-cuchara", nombre: "Popote cuchara biodegradable", cat: "accesorios",
      mat: ["tapioca"], img: "vaso-popotes",
      desc: "Punta de cuchara para frappé y bebidas con topping.",
      v: ["26 cm · a granel, 5 kg"] },

    { id: "cono-crepa", nombre: "Cono porta crepa", cat: "accesorios",
      mat: ["papel"], img: "cono-crepa", p: 1000,
      desc: "Para crepa, papas y snacks de mano.", v: ["Grande"] },

    /* ---------------- papel y bolsas ---------------- */
    { id: "servilleta-larga", nombre: "Servilleta larga", cat: "papel",
      mat: ["papel"], img: "papel-encerado", p: 1200,
      desc: "Formato largo de 39.0 x 37.5 cm.", v: ["39.0 x 37.5 cm"] },

    { id: "papel-encerado", nombre: "Papel encerado grado alimenticio", cat: "accesorios",
      mat: ["papel"], img: "papel-encerado", p: 1000,
      desc: "Barrera contra grasa. Para envolver, forrar charola y canasta.",
      v: ["Varias medidas"] },

    { id: "papel-rh", nombre: "Papel RH grado alimenticio", cat: "papel",
      mat: ["papel"], img: "papel-encerado", p: 1000,
      desc: "Papel de uso general en cocina y mostrador.", v: ["Varias medidas"] },

    { id: "bolsa-kraft-asa", nombre: "Bolsa de papel kraft con asa", cat: "papel",
      mat: ["kraft"], img: "srv-bolsa-kraft", servicio: true, destacado: true,
      desc: "Fabricación a medida, con o sin asa, con o sin impresión.",
      v: ["Chica", "Mediana", "Grande", "A medida"] },

    { id: "bolsa-bond", nombre: "Bolsa de papel bond", cat: "papel",
      mat: ["papel"], img: "srv-bolsas-bond", servicio: true,
      desc: "Bolsa lisa para panadería y mostrador. Personalizable.",
      v: ["Chica", "Mediana", "Grande", "A medida"] },

    { id: "bolsa-ventana", nombre: "Bolsa con ventana", cat: "papel",
      mat: ["papel"], img: "bolsa-ventana",
      desc: "Ventana transparente para producto de panadería y galletería.",
      v: ["Chica", "Mediana", "Grande"] },

    { id: "contenedor-medida", nombre: "Contenedor a medida", cat: "contenedores",
      mat: ["kraft", "carton"], img: "srv-contenedores-medida", servicio: true,
      desc: "Diseñamos y producimos el formato que tu carta necesita, con o sin impresión.",
      v: ["A medida"] }
  ];


  /* ===========================================================================
     OFERTAS  ->  las pinta ofertas.html
     ---------------------------------------------------------------------------
     Está VACÍO a propósito. GreeNova no tiene promociones publicadas y no se
     inventaron: un descuento falso o un "precio antes" que nunca existió es
     publicidad engañosa, no diseño.

     Para encender una oferta agrega una entrada con el id del producto:

       "vaso-papel-blanco": {
         desc:  15,                      // % de descuento, obligatorio
         hasta: "2026-10-31",            // último día, opcional
         nota:  "Última existencia",     // etiqueta libre, opcional
         agotado: false                  // opcional, lo marca como AGOTADO
       }

     Con eso la tarjeta muestra el badge de descuento y, si el producto tiene
     `precio`, el precio tachado junto al de oferta. La página se llena sola.
     =========================================================================== */
  var PROMOS = {};

  /* precio en MXN por caja. null = "Cotizar". Ver nota de arriba. */
  PRODUCTOS.forEach(function (p) { if (!("precio" in p)) p.precio = null; });

  return { CATEGORIAS: CATEGORIAS, MATERIALES: MATERIALES, PRODUCTOS: PRODUCTOS, PROMOS: PROMOS };
})();
