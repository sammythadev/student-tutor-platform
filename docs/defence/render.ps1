$ErrorActionPreference = 'Stop'
$root   = 'C:\Users\USER\Desktop\Final Year Research\project\docs\defence'
$pptx   = Join-Path $root 'student-tutor-matchmaking-defence.pptx'
$outDir = Join-Path $root '_render'

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir | Out-Null

$ppt = New-Object -ComObject PowerPoint.Application
try {
  $pres = $ppt.Presentations.Open($pptx, $true, $false, $false)
  $i = 0
  foreach ($slide in $pres.Slides) {
    $i++
    $file = Join-Path $outDir ('slide-{0:d2}.png' -f $i)
    $slide.Export($file, 'PNG', 1600, 900)
  }
  Write-Output "Exported $i slides to $outDir"
  $pres.Close()
} finally {
  $ppt.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
