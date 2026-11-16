param([string]$Which = 'both', [switch]$Trust)
# Builds the sweep builds.  -Trust: with the test trust file in place for the build, and whatever file was there before put back after.
#   (Not "git checkout":  on DJ's machine the working tree holds DJ's REAL trust file, uncommitted.  Checking it out would lose it.)
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
$repo = (Resolve-Path "$PSScriptRoot\..\..\..").Path
$signer = "$repo\DataPage\it-signerI.js"
$saved = "$PSScriptRoot\out\it-signerI.before-trust.js"
Set-Location "$repo\desktop"
if ($Trust) {
    New-Item -ItemType Directory -Force "$PSScriptRoot\out" | Out-Null
    if (Test-Path $saved) { throw "$saved is still there from a run that didn't finish.  Put it back in DataPage\ by hand (check it first), delete it, then run again." }
    Copy-Item $signer $saved
    Copy-Item "$PSScriptRoot\world\it-signerI.js" $signer -Force; (Get-Item $signer).LastWriteTime = Get-Date     # (a fresh time, or cargo thinks nothing changed)
}
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
    if ($Trust) { Copy-Item $saved $signer -Force; (Get-Item $signer).LastWriteTime = Get-Date; Remove-Item $saved; "trust file put back as it was" }
    git -C $repo status --short
}
