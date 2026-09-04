/* GreeNova SC - servidor para Render (y para cualquier hosting con Node).
   ===========================================================================
   El sitio es estático, pero el agente necesita un servidor donde viva la API
   key. Render corre un proceso Node de larga vida, así que este archivo hace
   las dos cosas: sirve los archivos del sitio y expone /api/chat.

   La lógica del agente NO se duplica: se reutiliza api/chat.js, que está
   escrito como función de Vercel (req.body ya parseado, res.status().json()).
   Aquí se le arma ese mismo contrato antes de llamarlo.

   Arranque:  node server.js       (Render usa la variable PORT)
   Variables: OPENAI_API_KEY  y, opcional, OPENAI_MODEL
   =========================================================================== */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "./api/chat.js";

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = process.env.PORT || 3000;

/* Tope diario de preguntas a la IA, igual que en la versión de Hostinger. Aquí
   vive en memoria: Render mantiene el proceso vivo, y si se reinicia el peor
   caso es que el contador vuelva a cero. */
const TOPE_DIARIO = 300;
let contador = { fecha: "", preguntas: 0 };

function cabeDentroDelTope() {
  const hoy = new Date().toISOString().slice(0, 10);
  if (contador.fecha !== hoy) contador = { fecha: hoy, preguntas: 0 };
  if (contador.preguntas >= TOPE_DIARIO) return false;
  contador.preguntas++;
  return true;
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/* Nada de esto debe salir por HTTP: claves, código de servidor, herramientas. */
const PROHIBIDO = [
  ".env", ".git", "node_modules", "php/", "api/", "server.js",
  "package.json", "package-lock.json", "serve.py", "build-single.py",
  "build-sitemap.mjs", "README.md", ".htaccess", "vercel.json",
];

function esProhibido(rel) {
  return PROHIBIDO.some((p) => rel === p || rel.startsWith(p));
}

/* ------------------------- la parte del agente ------------------------- */

function leerCuerpo(req) {
  return new Promise((listo) => {
    let crudo = "";
    req.on("data", (t) => {
      crudo += t;
      if (crudo.length > 200000) req.destroy();   /* nadie manda tanto de buena fe */
    });
    req.on("end", () => {
      try { listo(JSON.parse(crudo || "{}")); } catch (e) { listo({}); }
    });
  });
}

/* api/chat.js espera el `res` de Vercel, que trae status() y json(). El de Node
   no los tiene, así que se los agregamos: son dos líneas y evitan mantener dos
   copias del agente. */
function comoVercel(res) {
  res.status = (codigo) => { res.statusCode = codigo; return res; };
  res.json = (obj) => {
    if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

/* ------------------------------ el servidor ---------------------------- */

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  if (url.pathname === "/api/chat") {
    if (!cabeDentroDelTope()) {
      console.error("[agente greenova] tope diario alcanzado (" + TOPE_DIARIO + " preguntas)");
      return comoVercel(res).status(429).json({ error: "tope_diario" });
    }
    req.body = await leerCuerpo(req);
    return handler(req, comoVercel(res));
  }

  /* Archivos del sitio. */
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  if (rel === "") rel = "index.html";

  const destino = path.normalize(path.join(RAIZ, rel));
  if (!destino.startsWith(RAIZ) || esProhibido(rel)) {
    res.statusCode = 404;
    return res.end("No encontrado");
  }

  /* /tienda -> /tienda.html, para que las URLs se vean limpias. */
  let archivo = destino;
  if (!fs.existsSync(archivo) && fs.existsSync(archivo + ".html")) archivo += ".html";

  fs.stat(archivo, (err, info) => {
    if (err || !info.isFile()) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end("<h1>404</h1><p>Esa página no existe. <a href=\"/\">Volver al inicio</a></p>");
    }
    const ext = path.extname(archivo).toLowerCase();
    res.setHeader("Content-Type", TIPOS[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", ext === ".html"
      ? "public, max-age=300, must-revalidate"
      : "public, max-age=3600, must-revalidate");
    fs.createReadStream(archivo).pipe(res);
  });
});

servidor.listen(PUERTO, () => {
  console.log("GreeNova SC escuchando en el puerto " + PUERTO);
  if (!process.env.OPENAI_API_KEY) {
    console.warn("AVISO: falta OPENAI_API_KEY. El sitio funciona y el agente " +
                 "contesta con el catálogo, pero no va a llamar al modelo.");
  }
});
