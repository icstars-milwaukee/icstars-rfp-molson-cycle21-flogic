param([string]$Name = 'run', [switch]$NoExe, [switch]$NoEdge)
# The test gate (plan 6d): DJ's five tests in Edge, and stations + drawer in the staff sweep build.  Output kept in gate-<Name>\.
$repo = (Resolve-Path "$PSScriptRoot\..\..\..").Path
$S = $PSScriptRoot
$o = "$S\gate-$Name"; New-Item -ItemType Directory -Force $o | Out-Null
Set-Location "$repo\handoff\tests"
$page = "$($repo.Replace('\', '/'))/DataPage/flogic.html"
$exe = "exe:$($repo.Replace('\', '/'))/desktop/target/shared/sweep-staff.exe"
$csv = "$S\fake\incident.csv"
function Run($label, $nodeArgs) {
    & node @nodeArgs *> "$o\$label.txt"
    # (headless Edge sometimes opens at 500x320, whatever size it is asked for: then every layout check fails. Run it again.)
    if (Select-String -Path "$o\$label.txt" -Pattern "^INFO .*\s500x320" -Quiet) { "    ($label started at 500x320: running it again)"; & node @nodeArgs *> "$o\$label.txt" }
    $last = Get-Content "$o\$label.txt" | Select-Object -Last 1
    $p = (Select-String -Path "$o\$label.txt" -Pattern '^PASS').Count; $f = (Select-String -Path "$o\$label.txt" -Pattern '^FAIL').Count
    "{0,-13} PASS={1,-3} FAIL={2,-2} {3}" -f $label, $p, $f, $last
    Select-String -Path "$o\$label.txt" -Pattern '^FAIL' | ForEach-Object { "    " + $_.Line.Substring(0, [Math]::Min(260, $_.Line.Length)) }
}
if (-not $NoEdge) {
    Run 'stations' @('stations-test.mjs', $page, $csv, "$S\out\st")
    Run 'drawer' @('drawer-test.mjs', $page, $csv, "$S\out\dr", '1366', '640')
    Run 'checks' @('checks-test.mjs', $page, $csv, "$S\out\ck")
    & node excel-test.mjs $page "$S\fake\negatives.xlsx" "$S\out\xl-profile" *> "$o\excel.txt"
    "excel:        " + ((Get-Content "$o\excel.txt" | Select-String '\|' | ForEach-Object { ($_.Line -split '\|')[1].Trim() + ' / ' + ($_.Line -split '\|')[2].Trim() }) -join '   ')
    & node usability-audit.mjs $page $csv "$S\out\ua" *> "$o\usability.txt"
    "usability:    " + (Get-Content "$o\usability.txt").Count + " lines"
}
if (-not $NoExe) {
    Run 'stations-exe' @('stations-test.mjs', $exe, $csv, "$S\out\st-exe")
    Run 'drawer-exe' @('drawer-test.mjs', $exe, $csv, "$S\out\dr-exe", '1366', '640')
}
$left = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'sweep-*.exe' }).Count
"leftover apps: $left"
