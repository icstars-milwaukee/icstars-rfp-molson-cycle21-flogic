param([string]$Which = 'both', [switch]$Trust)
# Builds the sweep builds.  -Trust: with the test trust file in place for the build (and the blank one put back after).
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
$repo = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location "$repo\desktop"
if ($Trust) { Copy-Item "$PSScriptRoot\world\it-signerI.js" "$repo\DataPage\it-signerI.js" -Force; (Get-Item "$repo\DataPage\it-signerI.js").LastWriteTime = Get-Date }     # (a fresh time, or cargo thinks nothing changed)
try {
    if ($Which -ne 'it') {
        cargo build --release --features sweep --target-dir target/shared 2>&1 | Select-String 'error|Finished' | ForEach-Object { "$_".Trim() }
        if ($LASTEXITCODE -eq 0) { Copy-Item target\shared\release\flogic.exe target\shared\sweep-staff.exe -Force; "staff ok" } else { "STAFF BUILD FAILED" }
    }
    if ($Which -ne 'staff') {
        cargo build --release --features it,sweep --target-dir target/shared 2>&1 | Select-String 'error|Finished' | ForEach-Object { "$_".Trim() }
        if ($LASTEXITCODE -eq 0) { Copy-Item target\shared\release\flogic.exe target\shared\sweep-it.exe -Force; "it ok" } else { "IT BUILD FAILED" }
    }
} finally {
    if ($Trust) { git -C $repo checkout DataPage/it-signerI.js 2>$null }
    git -C $repo status --short
}
