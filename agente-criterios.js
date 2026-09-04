/* GreeNova SC - criterios y base de conocimiento del agente.
   ===========================================================================
   ESTE ES EL ARCHIVO QUE TÚ EDITAS. No hace falta tocar nada más.

   El agente contesta en dos niveles:

   1. RAG  — busca en el catálogo (los 56 productos de productos.js) y en los
             HECHOS de abajo. Si encuentra la respuesta, la da al instante,
             sin llamar a la IA y sin costo.
   2. IA   — si el RAG no alcanza, manda la pregunta a Claude junto con lo que
             sí encontró y con los CRITERIOS de abajo, y Claude resuelve.

   Todo lo que escribas aquí es lo que el agente puede decir. Si un dato no
   está aquí ni en el catálogo, el agente tiene prohibido inventarlo: dice que
   no lo sabe y pasa el contacto de ventas.
   =========================================================================== */
window.GREENOVA_AGENTE = (function () {
  "use strict";

  /* ---------------------------------------------------------------------
     CRITERIOS — las reglas con las que la IA contesta.
     Escríbelas en lenguaje normal. Agrega, quita o cambia lo que quieras.
     --------------------------------------------------------------------- */
  var CRITERIOS = [
    "Eres el asistente de GreeNova SC, empresa mexicana de empaque biodegradable y compostable para el sector alimenticio, con sede en la Ciudad de México.",
    "Hablas español de México, de tú, directo y breve. Dos o tres frases cuando alcance. Nada de relleno ni de lenguaje publicitario.",
    "Solo puedes afirmar datos que aparezcan en el CATÁLOGO o en los HECHOS que se te pasan. Si te preguntan algo que no está ahí, dilo con claridad y ofrece el contacto de ventas. Nunca inventes medidas, materiales, certificaciones ni tiempos.",
    "NUNCA des precios. GreeNova no publica lista de precios. Si preguntan cuánto cuesta, explica que el precio depende de la medida y del volumen, y que ventas cotiza sin compromiso.",
    "NUNCA prometas tiempos de entrega, mínimos de compra ni descuentos concretos: esos datos no están confirmados. Di que ventas los define en la cotización.",
    "Cuando alguien busque un producto, di la medida exacta y las piezas por caja tal como vienen en el catálogo, y sugiere el enlace de la tienda.",
    "Para elegir tapa, lo que importa es el diámetro de boca del vaso, no las onzas. Si te dan onzas, pide la boca o menciona las bocas que existen para esa medida.",
    "Si la persona quiere su logo impreso, explica que hay serigrafía sobre vaso, contenedor y bolsa, y que también se diseñan contenedores y bolsas a medida.",
    "Si la persona quiere comprar o pedir cotización, dile que arme su lista en la tienda y la envíe, o que escriba a ventas@greenovasc.com.mx / 55 2260 1113.",
    "La gente no pide las cosas como se llaman en el catálogo. Traduce siempre: \"vaso para café\" o \"vaso para bebida caliente\" es el VASO DE PAPEL; \"vaso para bebida fría\", \"vaso para frappé\" o \"vaso transparente\" es el VASO PET o PLA. Usa la lista de EQUIVALENCIAS que se te pasa en el contexto y responde con el nombre del catálogo, no con el que usó la persona.",
    "Si alguien pide algo que GreeNova no maneja (cubiertos, tenedores, cucharas, platos), dilo directo: no está en catálogo, y pásalo a ventas por si lo pueden conseguir. No lo sustituyas por otro producto como si fuera lo mismo.",
    "SÍ ENVIAMOS A TODO MÉXICO. Si preguntan por cualquier estado, ciudad o pueblo del país (Tlaxcala, Puebla, Monterrey, Mérida, Tijuana, el que sea), la respuesta es sí: GreeNova envía a nivel nacional desde la Ciudad de México. Nunca contestes que no lo tienes confirmado. Lo único que no sabes es el costo y el tiempo del envío: eso lo confirma ventas en la cotización.",
    "NUNCA escribas nombres de archivo ni rutas (tienda.html, producto.html, .php). Habla como persona: \"en la tienda\", \"en el catálogo\". El enlace se lo pone el sitio solo.",
    "Cuando alguien diga que quiere cotizar, comprar o hacer un pedido, no lo mandes a leer instrucciones. Pregúntale qué productos quiere y en qué medida, y cuántas cajas de cada uno. Si en el bloque CARRITO ya trae productos, retómalos por nombre y cantidad en vez de preguntar de cero.",
    "Cierra siempre las conversaciones de compra con el contacto directo: 55 2260 1113 o ventas@greenovasc.com.mx.",
    "No hables de la competencia ni compares con otras marcas.",
    "Si la pregunta no tiene nada que ver con empaque, GreeNova o el pedido, dilo amablemente y reencauza."
  ];

  /* ---------------------------------------------------------------------
     HECHOS — la base de conocimiento fuera del catálogo de productos.
     Cada entrada se busca por separado. Agrega las que quieras.
     --------------------------------------------------------------------- */
  var HECHOS = [
    { t: "Contacto y horario de ventas",
      c: "Correo: ventas@greenovasc.com.mx. Teléfonos: 55 2260 1113 y 55 7051 1149. Sitio: www.greenovasc.com.mx. GreeNova SC está en la Ciudad de México." },

    { t: "Registro SEDEMA",
      c: "El vaso de papel de GreeNova está registrado ante la Secretaría del Medio Ambiente de la Ciudad de México (SEDEMA). Es la versión que pide la normativa local y existe en las mismas seis medidas que el vaso estándar: 4, 8, 10, 12, 16 y 20 oz." },

    { t: "Certificación FSC",
      c: "El papel que usa GreeNova cuenta con certificación FSC, que acredita manejo forestal responsable." },

    { t: "Materiales que se manejan",
      c: "Papel, papel con recubrimiento compostable de PLA, PET y PLA para línea fría, cartón kraft, bagazo de caña de azúcar, paja de trigo, fécula de maíz, tapioca y madera. Cada producto del catálogo indica de qué está hecho." },

    { t: "Diferencia entre PET y PLA",
      c: "El PET es plástico transparente reciclable para bebida fría. El PLA (ácido poliláctico) se ve igual de transparente pero es compostable: es la opción compostable de la línea fría. GreeNova maneja las dos." },

    { t: "Envíos a todo México",
      c: "Sí, GreeNova envía a todo el país. La salida es desde la Ciudad de México hacia cualquier estado de la República. El costo y el tiempo dependen del destino y del volumen; ventas los confirma en la cotización." },

    { t: "Imprimir tu logo: serigrafía y personalización",
      c: "GreeNova imprime tu logo en serigrafía directamente sobre vasos, contenedores y bolsas. También diseña y produce contenedores para alimentos a medida, con o sin impresión, y fabrica bolsas de papel bond y kraft personalizadas, con o sin asa." },

    { t: "Cómo elegir la tapa correcta",
      c: "La tapa se elige por el diámetro de boca del vaso, no por las onzas. En línea caliente las bocas van de 63 a 90 mm; en línea fría, de 78 a 107 mm. Si conoces la boca de tu vaso, la tapa ya existe en inventario." },

    { t: "Piezas por caja",
      c: "Depende del producto. El vaso de papel y las fajillas vienen en caja de 1,000 piezas; los contenedores rectangulares kraft en caja de 300; las servilletas largas en 1,200; los agitadores de madera en 10,000. Cada ficha del catálogo lo indica." },

    { t: "Cómo pedir una cotización",
      c: "Dinos qué productos quieres, en qué medida y cuántas cajas de cada uno. Puedes ir marcándolos en la tienda para mandar la lista completa de una sola vez, o escribir directo a ventas@greenovasc.com.mx o al 55 2260 1113. Ventas contesta con precio y tiempo de entrega." },

    { t: "Productos fuera de catálogo",
      c: "El catálogo es el punto de partida. Si hay un requerimiento especial de medida, material, volumen o impresión, el equipo de ventas lo cotiza. GreeNova produce contenedores a medida." },

    { t: "Compostable y biodegradable",
      c: "Los materiales compostables de GreeNova (PLA, bagazo de caña, paja de trigo, fécula de maíz, tapioca) se degradan con la fracción orgánica. El vaso de papel con recubrimiento de PLA es compostable." }

    /* Agrega aquí lo que falte. Ejemplos que hoy NO están confirmados y que
       convendría añadir en cuanto los tengas:
       { t: "Mínimo de compra",     c: "..." },
       { t: "Tiempo de producción", c: "..." },
       { t: "Formas de pago",       c: "..." },
       { t: "Muestras",             c: "..." }                              */
  ];

  /* ---------------------------------------------------------------------
     EQUIVALENCIAS — cómo lo pide la gente vs. cómo se llama en el catálogo.
     Si alguien escribe cualquier palabra de "dice", la búsqueda agrega en
     silencio las palabras de "es" antes de buscar, para que salgan los
     productos correctos aunque nadie los haya nombrado.
     Agrega las que se te ocurran; se aplican solas.
     --------------------------------------------------------------------- */
  var SINONIMOS = [
    { dice: ["cafe", "café", "capuchino", "capuccino", "americano", "latte", "te", "té",
             "bebida caliente", "bebidas calientes", "linea caliente", "chocolate caliente",
             "atole", "coffee", "to go", "cafeteria", "cafetería", "barra"],
      es: "vaso de papel bebida caliente linea caliente",
      busca: ["vaso de papel", "vasos de papel"] },

    { dice: ["bebida fria", "bebidas frias", "bebida fría", "bebidas frías", "linea fria",
             "frappe", "frappé", "licuado", "smoothie", "jugo", "agua fresca", "refresco",
             "michelada", "cerveza", "vaso transparente", "vaso de plastico", "vaso de plástico",
             "cristal", "hielo"],
      es: "vaso PET PLA bebida fria transparente linea fria",
      busca: ["vasos pet y pla"] },

    { dice: ["bowl", "bowls", "tazon", "tazón", "ensaladera", "ensalada", "lunch box",
             "lunchbox", "poke", "sopa", "caldo"],
      es: "ensaladera transparente bowl tapa domo contenedor circular kraft redondo",
      busca: ["ensaladera", "bowl", "contenedor circular kraft", "contenedor kraft redondo"] },

    { dice: ["salsero", "salsa", "dippero", "dip", "portasalsas", "aderezo"],
      es: "souffle fecula de maiz",
      busca: ["souffle"] },

    { dice: ["clamshell", "concha", "almeja", "hamburguesa", "burger", "comida para llevar",
             "delivery", "domicilio"],
      es: "contenedor almeja transparente bagazo contenedor rectangular kraft",
      busca: ["almeja", "contenedor rectangular kraft"] },

    { dice: ["charola", "bandeja", "papas", "boneless", "snack"],
      es: "charola kraft paja de trigo",
      busca: ["charola"] },

    { dice: ["popote", "popotes", "sorbete", "straw", "pajilla"],
      es: "popote de tapioca popote cuchara",
      busca: ["popote"] },

    { dice: ["removedor", "stirrer", "palito", "agitar"],
      es: "agitador de madera",
      busca: ["agitador"] },

    { dice: ["manga", "funda", "cinturon", "cinturón", "sleeve", "quema", "caliente la mano"],
      es: "fajilla ajustable para vaso",
      busca: ["fajilla"] },

    { dice: ["portavaso", "portavasos", "cup holder", "cargar varios vasos"],
      es: "portavasos charola portavasos con asa",
      busca: ["portavaso"] },

    { dice: ["bolsa", "bolsas", "bag", "empaque para llevar", "asa"],
      es: "bolsa de papel kraft bond con ventana",
      busca: ["bolsa"] },

    { dice: ["servilleta", "servilletas", "napkin"],
      es: "servilleta larga papel",
      busca: ["servilleta"] },

    { dice: ["domo", "tapa transparente", "tapa alta", "crema batida"],
      es: "tapa domo bebida fria caliente",
      busca: ["domo"] },

    { dice: ["pastel", "postre", "reposteria", "repostería", "tarta"],
      es: "charola para pastel contenedor rebanada de pastel",
      busca: ["pastel"] },

    { dice: ["pizza", "rebanada"],
      es: "caja de pizza contenedor rebanada",
      busca: ["pizza"] },

    { dice: ["helado", "nieve", "yogurt"],
      es: "contenedor de papel para helado",
      busca: ["helado"] },

    { dice: ["envio", "envío", "envian", "envían", "envias", "envías", "mandan", "mandas",
             "llega", "llegan", "paqueteria", "paquetería", "flete", "foraneo", "foráneo",
             "tlaxcala", "puebla", "hidalgo", "queretaro", "querétaro", "guanajuato", "jalisco",
             "guadalajara", "monterrey", "nuevo leon", "nuevo león", "merida", "mérida", "yucatan",
             "yucatán", "cancun", "cancún", "quintana roo", "tijuana", "baja california", "oaxaca",
             "veracruz", "chiapas", "sonora", "sinaloa", "michoacan", "michoacán", "guerrero",
             "acapulco", "morelos", "cuernavaca", "toluca", "estado de mexico", "estado de méxico",
             "provincia", "interior de la republica", "interior de la república", "foraneos"],
      es: "envios a todo Mexico nacional desde la Ciudad de Mexico",
      busca: [] },

    { dice: ["sedema", "norma", "normativa", "ley", "cdmx", "prohibicion", "prohibición"],
      es: "vaso de papel con registro SEDEMA",
      busca: ["sedema"] },

    { dice: ["compostable", "composta", "biodegradable", "ecologico", "ecológico", "verde",
             "sustentable", "no contamina"],
      es: "PLA bagazo paja de trigo fecula tapioca compostable",
      busca: ["compostable", "bagazo", "paja de trigo", "fecula", "tapioca"] }
  ];

  /* Preguntas sugeridas que aparecen al abrir el chat. */
  var SUGERENCIAS = [
    "¿Qué tapa va con un vaso de 12 oz?",
    "¿Tienen contenedores compostables?",
    "¿Pueden imprimir mi logo?",
    "¿Hacen envíos a Monterrey?"
  ];

  /* Cuando ni el RAG ni la IA pueden contestar. */
  var SALIDA = "Eso no lo tengo confirmado y prefiero no inventarlo. " +
               "Escríbele a ventas: ventas@greenovasc.com.mx o 55 2260 1113, ahí te lo resuelven.";

  return {
    CRITERIOS: CRITERIOS,
    HECHOS: HECHOS,
    SINONIMOS: SINONIMOS,
    SUGERENCIAS: SUGERENCIAS,
    SALIDA: SALIDA,
    /* Dónde vive la función que guarda la API key. En Hostinger es el archivo
       PHP; si algún día se despliega en Vercel, cámbialo a "/api/chat".
       Ver README. */
    ENDPOINT: "/api/chat.php"
  };
})();
