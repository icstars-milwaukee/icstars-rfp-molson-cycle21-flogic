# Builds both Windows apps, side by side in desktop\out\:   Flogic.exe  (staff)   and   Flogic IT.exe  (IT)
#   powershell -File desktop\build.ps1
# Each is built with the trust file in DIRECTORY\it-signerI.js as it is NOW.   Never commit a filled-in one.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $here 'out'
New-Item -ItemType Directory -Force $out | Out-Null
Push-Location $here
try {
    cargo build --release --target-dir target/shared
    if ($LASTEXITCODE -ne 0) { throw 'The staff app did not build.' }
    Copy-Item target/shared/release/flogic.exe (Join-Path $out 'Flogic.exe') -Force
    cargo build --release --features it --target-dir target/shared
    if ($LASTEXITCODE -ne 0) { throw 'The IT app did not build.' }
    Copy-Item target/shared/release/flogic.exe (Join-Path $out 'Flogic IT.exe') -Force
    Get-ChildItem $out | Select-Object Name, @{ n = 'MB'; e = { [math]::Round($_.Length / 1MB, 1) } }
} finally { Pop-Location }
