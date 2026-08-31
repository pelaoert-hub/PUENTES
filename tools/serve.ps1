# Servidor estatico minimo para probar Puentes en local.
# Los service workers solo funcionan sobre HTTPS o localhost, por eso no
# alcanza con abrir el index.html haciendo doble clic.
#
#   powershell -ExecutionPolicy Bypass -File tools\serve.ps1
#
# Despues abri http://localhost:8080

param(
  [int]$Port = 8080,
  [string]$Root = (Join-Path (Split-Path -Parent $PSScriptRoot) 'web')
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

$mime = @{
  '.html'        = 'text/html; charset=utf-8'
  '.js'          = 'text/javascript; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.jpg'         = 'image/jpeg'
  '.jpeg'        = 'image/jpeg'
  '.webp'        = 'image/webp'
  '.ico'         = 'image/x-icon'
  '.xml'         = 'application/xml; charset=utf-8'
  '.txt'         = 'text/plain; charset=utf-8'
  '.woff2'       = 'font/woff2'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "No se pudo abrir el puerto $Port. Probablemente ya este en uso." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  Puentes corriendo en http://localhost:$Port" -ForegroundColor Green
Write-Host "  Sirviendo: $Root"
Write-Host "  Ctrl+C para detener."
Write-Host ""

while ($listener.IsListening) {
  try {
    $context  = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response

    # Ruta pedida, sin query string
    $rel = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

    $full = Join-Path $Root $rel

    # Si la ruta apunta a una carpeta (por ejemplo /articulos/mi-articulo),
    # servimos su index.html, que es lo que hace Vercel en produccion.
    if (Test-Path -LiteralPath $full -PathType Container) {
      $indice = Join-Path $full 'index.html'
      if (Test-Path -LiteralPath $indice -PathType Leaf) {
        $rel  = ($rel.TrimEnd('/')) + '/index.html'
        $full = $indice
      }
    }

    # No permitimos salir de la carpeta web/
    $resolved = $null
    try { $resolved = (Resolve-Path -LiteralPath $full -ErrorAction Stop).Path } catch { }

    if ($resolved -and $resolved.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolved -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($resolved)
      $ext   = [System.IO.Path]::GetExtension($resolved).ToLowerInvariant()

      $tipo = $mime[$ext]
      if (-not $tipo) { $tipo = 'application/octet-stream' }

      $response.StatusCode  = 200
      $response.ContentType = $tipo
      # Sin cache del navegador: queremos ver los cambios al recargar.
      $response.Headers.Add('Cache-Control', 'no-store')
      # El service worker debe poder controlar toda la raiz.
      if ($rel -eq 'sw.js') { $response.Headers.Add('Service-Worker-Allowed', '/') }
      $response.ContentLength64 = $bytes.Length
      # El navegador aborta pedidos de forma normal (por ejemplo el navigation
      # preload del service worker cuando la respuesta sale del cache). Eso
      # rompe la escritura y no es un error real: lo ignoramos.
      try {
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host ("  200  /{0}" -f $rel)
      } catch {
        Write-Host ("  ---  /{0} (el navegador corto la conexion)" -f $rel) -ForegroundColor DarkGray
      }
    } else {
      $cuerpo = [System.Text.Encoding]::UTF8.GetBytes("404 - no encontrado: /$rel")
      $response.StatusCode  = 404
      $response.ContentType = 'text/plain; charset=utf-8'
      $response.ContentLength64 = $cuerpo.Length
      $response.OutputStream.Write($cuerpo, 0, $cuerpo.Length)
      Write-Host ("  404  /{0}" -f $rel) -ForegroundColor DarkYellow
    }

    try { $response.OutputStream.Close() } catch { }
  } catch {
    Write-Host ("  error: {0}" -f $_.Exception.Message) -ForegroundColor Red
  }
}
