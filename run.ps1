# Demo Contable Real VoyPati - lanzador para VS Code
Write-Host ""
Write-Host "Demo Contable Real (Todo el ecosistema VoyPati)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1) Dia real del ecosistema (mercado + proveedores + express + core)"
Write-Host "  2) Regenerar esquema real del core (extract)"
Write-Host "  3) Regenerar snapshot de GitHub (todos los repos)"
Write-Host "  0) Salir"
Write-Host ""
$op = Read-Host "Elige una opcion"

switch ($op) {
  "1" { node src/simulate.js }
  "2" { node scripts/extract-core-real.js }
  "3" { node scripts/github-org-snapshot.js }
  default { Write-Host "Hasta luego!" }
}
Write-Host ""
Read-Host "Presiona Enter para cerrar..."