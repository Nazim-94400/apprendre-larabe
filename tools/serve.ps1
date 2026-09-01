<#
  Serveur statique minimal pour tester la PWA en local.

  Un service worker exige une origine http(s) : ouvrir index.html en file://
  ne permet pas de tester le mode hors ligne. Node et Python n'etant pas
  installés sur ce poste, ce script utilise HttpListener, présent dans Windows.

  Usage :  powershell -ExecutionPolicy Bypass -File tools\serve.ps1 [-Port 8080]
#>
param([int]$Port = 8080, [string]$Base = '')

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mime = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8';   '.json'='application/json; charset=utf-8';
  '.webmanifest'='application/manifest+json; charset=utf-8';
  '.svg'='image/svg+xml';  '.png'='image/png';  '.jpg'='image/jpeg';
  '.woff2'='font/woff2';   '.woff'='font/woff'; '.ttf'='font/ttf';
  '.mp3'='audio/mpeg';     '.pdf'='application/pdf';     '.xml'='application/xml; charset=utf-8';
  '.md'='text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serveur prêt : http://localhost:$Port/  (racine: $root)"
Write-Host "Ctrl+C pour arrêter."

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $path = [Uri]::UnescapeDataString($req.Url.AbsolutePath)

    # -Base reproduit en local le sous-chemin de GitHub Pages (/nom-du-depot/).
    # Sans ce test, une URL absolue oubliee dans le code passe inapercue en local
    # et casse le site une fois deploye.
    if ($Base -ne '') {
      $b = '/' + $Base.Trim('/')
      if ($path -eq $b) { $path = '/' }
      elseif ($path.StartsWith($b + '/')) { $path = $path.Substring($b.Length) }
      else {
        $res.StatusCode = 404
        $res.OutputStream.Close()
        continue
      }
    }

    $rel = $path.TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $full = Join-Path $root ($rel -replace '/', '\')

    # Empêche toute sortie de la racine du projet
    $resolved = $null
    try { $resolved = (Resolve-Path $full -ErrorAction Stop).Path } catch {}

    if ($resolved -and $resolved.StartsWith($root) -and (Test-Path $resolved -PathType Leaf)) {
      $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      # Pas de cache HTTP : sinon le service worker resservirait d'anciens fichiers
      # pendant le développement, ce qui rend le débogage trompeur.
      $res.Headers.Add('Cache-Control', 'no-store')
      $bytes = [System.IO.File]::ReadAllBytes($resolved)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('404')
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
  } catch {
    $res.StatusCode = 500
  } finally {
    $res.OutputStream.Close()
  }
}
