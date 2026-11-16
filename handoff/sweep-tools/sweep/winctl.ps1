param([int]$ProcId, [string]$Cmd = 'rect', [int]$Steps = 60, [int]$Gap = 16)
# The app's own top window, from outside the page (found by process id: the real titled window, shown or minimized).
#   rect     its place and state           restore   bring it back from minimized (what clicking its taskbar button does)
#   close    the system close message (what Alt+F4 and the taskbar's Close send)
#   sweep    resize it in many small steps and back (what dragging an edge does to the page), without taking the mouse
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices; using System.Threading;
public static class WC {
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int hh, uint f);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint a, uint b, out RECT r, uint c);
    public struct RECT { public int L, T, R, B; }
    public static IntPtr Find(uint pid) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p != pid) return true; if (GetWindow(h, 4) != IntPtr.Zero) return true; var s = new StringBuilder(200); GetWindowText(h, s, 200); if (s.ToString().StartsWith("Flogic") && IsWindowVisible(h)) { found = h; return false; } return true; }, IntPtr.Zero);
        return found;
    }
    public static string Run(uint pid, string cmd, int steps, int gap) {
        SetProcessDPIAware();
        IntPtr h = Find(pid);
        if (h == IntPtr.Zero) return "NO-WINDOW";
        RECT r; GetWindowRect(h, out r);
        if (cmd == "restore") { ShowWindow(h, 9); return "RESTORED"; }
        if (cmd == "close") { PostMessage(h, 0x0112, (IntPtr)0xF060, IntPtr.Zero); return "SENT"; }
        if (cmd == "sweep") {
            int w = r.R - r.L, hh = r.B - r.T;
            for (int i = 1; i <= steps; i++) { int d = (int)(Math.Sin(i * Math.PI / steps) * 500); SetWindowPos(h, IntPtr.Zero, r.L, r.T, w - d, hh - d / 2, 0x0014); Thread.Sleep(gap); }
            SetWindowPos(h, IntPtr.Zero, r.L, r.T, w, hh, 0x0014);
            return "SWEPT " + w + "x" + hh;
        }
        RECT wa; SystemParametersInfo(0x0030, 0, out wa, 0);
        return "{\"rect\":[" + r.L + "," + r.T + "," + r.R + "," + r.B + "],\"maximized\":" + (IsZoomed(h) ? "true" : "false") + ",\"minimized\":" + (IsIconic(h) ? "true" : "false") + ",\"workArea\":[" + wa.L + "," + wa.T + "," + wa.R + "," + wa.B + "]}";
    }
}
'@
[WC]::Run([uint32]$ProcId, $Cmd, $Steps, $Gap)
