/* Genera sitemap.xml a partir del catálogo.
   Se vuelve a correr cada vez que cambia productos.js:

       node build-sitemap.mjs

   Las 56 fichas viven en producto.html?id=<id>. Son URLs con query string,
   que Google indexa sin problema siempre que estén declaradas aquí y la
   ficha emita su propio <link rel="canonical"> (lo hace producto.js). */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const DIR = dirname(fileURLToPath(import.meta.url));
const SITIO = "https://www.greenovasc.com.mx";

/* productos.js es un script de navegador: se ejecuta en un contexto con
   `window` para leer el catálogo sin duplicarlo aquí. */
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(DIR, "productos.js"), "utf8"), ctx);
const { PRODUCTOS } = ctx.window.GREENOVA;

const hoy = new Date().toISOString().slice(0, 10);

const paginas = [
  { loc: "/",             prio: "1.0", freq: "monthly" },
  { loc: "/tienda.html",  prio: "0.9", freq: "weekly"  },
  { loc: "/ofertas.html", prio: "0.6", freq: "weekly"  }
];

/* Los destacados del catálogo llevan prioridad un escalón arriba. */
for (const p of PRODUCTOS) {
  paginas.push({
    loc:  "/producto.html?id=" + p.id,
    prio: p.destacado ? "0.8" : "0.7",
    freq: "monthly"
  });
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paginas.map((p) => `  <url>
    <loc>${esc(SITIO + p.loc)}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.prio}</priority>
  </url>`).join("\n")}
</urlset>
`;

writeFileSync(join(DIR, "sitemap.xml"), xml);
console.log(`sitemap.xml: ${paginas.length} URLs (${PRODUCTOS.length} fichas de producto)`);
