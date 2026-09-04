#!/usr/bin/env python3
"""Empaqueta cada página en un solo archivo HTML autocontenido.

Inserta styles.css y los scripts en línea y convierte cada imagen de assets/
(incluida assets/prod/) en un data URI, de modo que el resultado se puede abrir
o subir a cualquier lado sin carpeta de apoyo.

    python3 build-single.py     ->  dist/greenova-landing.html
                                    dist/greenova-tienda.html

Los enlaces entre las dos páginas se reescriben para que apunten al archivo
hermano dentro de dist/.
"""
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"

# pagina -> (archivo de salida, scripts que lleva, en ese orden)
AGENTE = ["agente-criterios.js", "agente.js"]
PAGES = {
    "index.html":   ("greenova-landing.html", ["productos.js", "greenova.js"] + AGENTE),
    "tienda.html":  ("greenova-tienda.html",  ["productos.js", "greenova.js", "tienda.js"] + AGENTE),
    "ofertas.html": ("greenova-ofertas.html", ["productos.js", "greenova.js", "tienda.js"] + AGENTE),
    # La ficha se abre con ?id=; en el bundle también funciona porque el
    # parámetro sobrevive al abrir el archivo directo.
    "producto.html": ("greenova-producto.html",
                      ["productos.js", "greenova.js", "producto.js", "tienda.js"] + AGENTE),
}

MIME = {".webp": "image/webp", ".png": "image/png",
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml"}


def data_uri(path: pathlib.Path) -> str:
    return f"data:{MIME[path.suffix]};base64," + base64.b64encode(path.read_bytes()).decode()


def assets() -> dict[str, str]:
    """Todas las imágenes de assets/ y assets/prod/, indexadas por su ruta relativa."""
    out = {}
    for p in sorted((ROOT / "assets").rglob("*")):
        if p.is_file() and p.suffix in MIME:
            out[p.relative_to(ROOT).as_posix()] = data_uri(p)
    return out


def build(page: str, images: dict[str, str]) -> str:
    html = (ROOT / page).read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    scripts = "\n".join((ROOT / s).read_text(encoding="utf-8") for s in PAGES[page][1])

    body_open = re.search(r"<body[^>]*>", html).group(0)
    body_attrs = body_open[5:-1]          # p. ej. ` data-modo="ofertas"`
    body = html.split(body_open, 1)[1].rsplit("</body>", 1)[0]
    title = re.search(r"<title>(.*?)</title>", html, re.S).group(1)
    fonts = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis[^>]+>', html).group(0)

    # las rutas más largas primero, para que assets/prod/x.webp no lo pise assets/
    for rel in sorted(images, key=len, reverse=True):
        body = body.replace(f'"{rel}"', f'"{images[rel]}"')

    # fuera las etiquetas <script src>: el código va en línea al final
    body = re.sub(r'\s*<script src="[^"]+"[^>]*></script>', "", body)

    # los enlaces entre páginas apuntan al archivo hermano del bundle
    for src, (out_name, _) in PAGES.items():
        body = body.replace(f'"{src}"', f'"{out_name}"').replace(f'"{src}#', f'"{out_name}#')

    # Solo tienda.js arma rutas de imagen en caliente; para esas páginas va el mapa.
    # La portada referencia sus imágenes en el HTML, así que no lo necesita.
    amap = ""
    if "tienda.js" in PAGES[page][1] or "producto.js" in PAGES[page][1]:
        amap = "window.GN_ASSETS = {" + ",".join(
            f'{rel!r}:{uri!r}'.replace("'", '"') for rel, uri in images.items()
            if rel.startswith("assets/prod/")) + "};"

    # El <head> se rearma desde cero, así que el icono se vuelve a poner aquí,
    # en línea: el archivo suelto no puede pedir /favicon.svg.
    icono = data_uri(ROOT / "favicon.svg")

    return (
        '<!doctype html>\n<html lang="es-MX">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>{title}</title>\n"
        f'<link rel="icon" href="{icono}" type="image/svg+xml">\n'
        '<meta name="theme-color" content="#224539">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f"{fonts}\n"
        f"<style>\n{css}\n</style>\n"
        '<script>document.documentElement.classList.add("js");</script>\n'
        f"</head>\n<body{body_attrs}>\n{body}\n<script>\n{amap}\n{scripts}\n</script>\n</body>\n</html>"
    )


if __name__ == "__main__":
    DIST.mkdir(exist_ok=True)
    images = assets()
    print(f"{len(images)} imágenes en línea\n")
    for page, (out_name, _) in PAGES.items():
        out = DIST / out_name
        out.write_text(build(page, images), encoding="utf-8")
        print(f"{out}  {out.stat().st_size / 1024:,.0f} KB")
