param([string]$Pids, [string]$Path, [string]$Mode = 'folder', [int]$WaitSec = 15)
# Answers ONE app's own Windows dialog (Select Folder / Open / Save As), through that dialog's own controls.
# Scoped to the process ids given (the app we started and its WebView2 children).  No global keys, no mouse.
#   -Mode folder   type the folder, press "Select Folder"        -Mode file   type the file path(s), press "Open"
#   -Mode cancel   press Cancel                                  -Mode allow  only press the webview's own Allow prompt
#   -Mode dump     list the windows and buttons these processes own
$ErrorActionPreference = 'SilentlyContinue'
$Path = $Path.Replace('/', '\')
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type @'
using System; using System.Runtime.InteropServices;
public static class W2 {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr w, string l);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
}
'@
$A = [System.Windows.Automation.AutomationElement]; $T = [System.Windows.Automation.TreeScope]; $C = [System.Windows.Automation.ControlType]
$procIds = @($Pids.Split(',') | ForEach-Object { [int]$_ })
function Wins { foreach ($w in $A::RootElement.FindAll($T::Children, [System.Windows.Automation.Condition]::TrueCondition)) { try { if ($procIds -contains $w.Current.ProcessId) { $w } } catch {} } }
function ById($root, $id, $class) {
    $c1 = New-Object System.Windows.Automation.PropertyCondition($A::AutomationIdProperty, $id)
    $c2 = New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, $class)
    return $root.FindFirst($T::Descendants, (New-Object System.Windows.Automation.AndCondition($c1, $c2)))
}
function Dialog {
    foreach ($w in Wins) {
        if ($w.Current.ClassName -eq '#32770') { return $w }
        $d = $w.FindFirst($T::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, '#32770')))
        if ($d) { return $d }
    }
    return $null
}
function Buttons($root) { $cond = New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, $C::Button); foreach ($e in $root.FindAll($T::Descendants, $cond)) { $e } }

if ($Mode -eq 'dump') {
    foreach ($w in Wins) { "TOP [$($w.Current.ClassName)] '$($w.Current.Name)' pid $($w.Current.ProcessId)"; foreach ($b in Buttons $w) { "   btn '$($b.Current.Name)' id='$($b.Current.AutomationId)' [$($b.Current.ClassName)]" } }
    exit 0
}
if ($Mode -ne 'allow') {
    $deadline = (Get-Date).AddSeconds($WaitSec); $done = $false
    while ((Get-Date) -lt $deadline -and -not $done) {
        $dlg = Dialog
        if ($dlg) {
            "DIALOG: $($dlg.Current.Name)"
            if ($Mode -eq 'cancel') { $b = ById $dlg '2' 'Button'; if ($b) { [void][W2]::PostMessage([IntPtr]$b.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero); "CANCELLED"; $done = $true; break } }
            else {
                $edit = if ($Mode -eq 'folder') { ById $dlg '1152' 'Edit' } else { ById $dlg '1148' 'Edit' }
                if (-not $edit -and $Mode -ne 'folder') { $edit = ById $dlg '1001' 'Edit' }       # Save As: the file name box
                $b = ById $dlg '1' 'Button'
                if ($edit -and $b) {
                    [void][W2]::SendMessage([IntPtr]$edit.Current.NativeWindowHandle, 0x000C, [IntPtr]::Zero, $Path)
                    Start-Sleep -Milliseconds 400
                    for ($k = 0; $k -lt 3; $k++) {
                        $b = ById (Dialog) '1' 'Button'
                        if ($b) { [void][W2]::PostMessage([IntPtr]$b.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero) }
                        Start-Sleep -Milliseconds 900
                        if (-not (Dialog)) { "PICKED"; $done = $true; break }
                    }
                }
            }
        }
        if (-not $done) { Start-Sleep -Milliseconds 250 }
    }
    if (-not $done) { "NO-DIALOG"; exit 3 }
}
if ($Mode -eq 'folder' -or $Mode -eq 'allow') {
    $deadline = (Get-Date).AddSeconds(18); $clicked = 0
    while ((Get-Date) -lt $deadline -and $clicked -lt 2) {
        $hit = $false
        foreach ($w in Wins) { foreach ($b in Buttons $w) { $n = $b.Current.Name; if ($n -match '^(View files|Edit files|Save changes|Allow.*)$') { $p = $null; if ($b.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$p)) { $p.Invoke(); "ALLOWED: $n"; $clicked++; $hit = $true; $deadline = (Get-Date).AddSeconds(3); Start-Sleep -Milliseconds 700 } } } }
        if (-not $hit) { Start-Sleep -Milliseconds 350 }
    }
    if ($clicked -eq 0) { "NO-PROMPT" }
}
