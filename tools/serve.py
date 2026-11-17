#!/usr/bin/env python3
"""Servidor estatico minimo para probar Puentes en local (Mac / Linux / Windows).

Reemplaza a tools/serve.ps1, que solo funcionaba en Windows con PowerShell.
Hace lo mismo que aquel:

  - Sirve la carpeta web/ en http://localhost:8080
  - Sin cache del navegador (Cache-Control: no-store): ves los cambios al recargar.
  - Una ruta que apunta a una carpeta (/articulos/mi-articulo) sirve su index.html
    sin redirigir, que es lo que hace Vercel en produccion.
  - /sw.js lleva Service-Worker-Allowed: / para controlar toda la raiz.
  - No deja salir de web/.
  - Ignora los cortes de conexion normales del navegador (navigation preload
    del service worker, pedidos abortados).

Los service workers solo funcionan sobre HTTPS o localhost, por eso no alcanza
con abrir index.html haciendo doble clic.

Uso:
    python3 tools/serve.py              # puerto 8080
    python3 tools/serve.py --port 9000
"""

import argparse
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ_POR_DEFECTO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")

TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".xml": "application/xml; charset=utf-8",
    ".glb": "model/gltf-binary",
    ".txt": "text/plain; charset=utf-8",
    ".woff2": "font/woff2",
}


class Manejador(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, **TIPOS}

    def do_GET(self):
        self._carpeta_a_index()
        super().do_GET()

    def do_HEAD(self):
        self._carpeta_a_index()
        super().do_HEAD()

    def _carpeta_a_index(self):
        """/carpeta (sin barra final) -> sirve /carpeta/index.html sin redirigir."""
        ruta_url = self.path.split("?", 1)[0].split("#", 1)[0]
        if ruta_url.endswith("/"):
            return
        real = self.translate_path(ruta_url)
        if os.path.isdir(real) and os.path.isfile(os.path.join(real, "index.html")):
            resto = self.path[len(ruta_url):]
            self.path = ruta_url + "/index.html" + resto

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        if self.path.split("?", 1)[0] == "/sw.js":
            self.send_header("Service-Worker-Allowed", "/")
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code == 404:
            cuerpo = ("404 - no encontrado: " + self.path.split("?", 1)[0]).encode("utf-8")
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(cuerpo)
            return
        super().send_error(code, message, explain)

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass  # el navegador corto la conexion: no es un error real

    def log_message(self, formato, *args):
        try:
            codigo = str(args[1])
        except IndexError:
            codigo = "---"
        sys.stdout.write("  %s  %s\n" % (codigo, self.path.split("?", 1)[0]))
        sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description="Servidor local de Puentes")
    parser.add_argument("--port", "-p", type=int, default=8080)
    parser.add_argument("--root", default=RAIZ_POR_DEFECTO)
    args = parser.parse_args()

    raiz = os.path.realpath(args.root)
    if not os.path.isdir(raiz):
        print("No existe la carpeta a servir: %s" % raiz, file=sys.stderr)
        sys.exit(1)

    try:
        servidor = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Manejador, directory=raiz))
    except OSError:
        print("No se pudo abrir el puerto %d. Probablemente ya este en uso." % args.port, file=sys.stderr)
        sys.exit(1)

    print("")
    print("  Puentes corriendo en http://localhost:%d" % args.port)
    print("  Sirviendo: %s" % raiz)
    print("  Ctrl+C para detener.")
    print("")
    sys.stdout.flush()

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor detenido.")
    finally:
        servidor.server_close()


if __name__ == "__main__":
    main()
