#!/usr/bin/env python3
"""Servidor estático para desarrollo, sin caché.

`python3 -m http.server` no manda cabeceras de caché, así que el navegador
aplica caché heurística y se queda con versiones viejas de styles.css o de los
scripts mientras editas. Esto sirve lo mismo pero con `Cache-Control: no-store`.

    python3 serve.py [puerto]      (por omisión 4321)
"""
import functools
import http.server
import pathlib
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in fmt % args:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
    handler = functools.partial(NoCache, directory=str(pathlib.Path(__file__).parent))
    print(f"GreeNova SC -> http://localhost:{port}  (sin caché; Ctrl+C para salir)")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
