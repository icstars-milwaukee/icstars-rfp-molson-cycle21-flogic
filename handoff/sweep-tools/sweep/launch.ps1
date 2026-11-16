param([string]$Exe, [int]$Port = 9334, [int]$WatchMs = 3000)
# Starts ONE app and watches it from outside, like a person's eyes:
#   - when its window becomes visible (polled every ~4 ms)
#   - what the screen shows where the window lands, every ~16 ms (a small patch near the window's middle, and one in the title bar)
# Prints one JSON line.  The process is left running (the caller connects to it, then stops it).
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Drawing @'
using System; using System.Text; using System.Diagnostics; using System.Drawing; using System.Runtime.InteropServices; using System.Collections.Generic;
public static class Launch {
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);
    public struct RECT { public int L, T, R, B; }
    static IntPtr Visible(uint pid) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((h, l) => { uint p; GetWindowThreadProcessId(h, out p); if (p == pid && IsWindowVisible(h)) { RECT r; GetWindowRect(h, out r); if (r.R - r.L > 300) { found = h; return false; } } return true; }, IntPtr.Zero);
        return found;
    }
    static int[] Patch(Graphics g, Bitmap b, int x, int y) {
        g.CopyFromScreen(x, y, 0, 0, b.Size);
        long r = 0, gr = 0, bl = 0; int n = 0;
        for (int i = 0; i < b.Width; i += 4) for (int j = 0; j < b.Height; j += 4) { Color c = b.GetPixel(i, j); r += c.R; gr += c.G; bl += c.B; n++; }
        return new int[] { (int)(r / n), (int)(gr / n), (int)(bl / n) };
    }
    public static string Run(string exe, int port, int watchMs) {
        SetProcessDPIAware();
        int sw = GetSystemMetrics(0), sh = GetSystemMetrics(1);
        var bmp = new Bitmap(48, 48); var g = Graphics.FromImage(bmp);
        int cx = sw / 2 - 24, cy = sh / 2 - 24;
        int[] before = Patch(g, bmp, cx, cy);
        Environment.SetEnvironmentVariable("FLOGIC_SWEEP_PORT", port.ToString()); var psi = new ProcessStartInfo(exe); psi.UseShellExecute = true;     // (no handles handed down: the caller must not wait on the app)
        long epoch0 = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var sw0 = Stopwatch.StartNew();
        var p = Process.Start(psi);
        double visibleAt = -1; RECT rect = new RECT();
        var frames = new List<string>(); double nextShot = 0;
        while (sw0.Elapsed.TotalMilliseconds < watchMs) {
            double t = sw0.Elapsed.TotalMilliseconds;
            if (visibleAt < 0) { IntPtr h = Visible((uint)p.Id); if (h != IntPtr.Zero) { visibleAt = sw0.Elapsed.TotalMilliseconds; GetWindowRect(h, out rect); cx = (rect.L + rect.R) / 2 - 24; cy = (rect.T + rect.B) / 2 - 24; } }
            if (t >= nextShot) {
                int[] mid = Patch(g, bmp, cx, cy);
                int[] top = visibleAt >= 0 ? Patch(g, bmp, rect.L + 200, rect.T + 8) : new int[] { -1, -1, -1 };
                frames.Add("[" + Math.Round(sw0.Elapsed.TotalMilliseconds) + "," + mid[0] + "," + mid[1] + "," + mid[2] + "," + top[0] + "," + top[1] + "," + top[2] + "]");
                nextShot = t + 16;
            } else System.Threading.Thread.Sleep(visibleAt < 0 ? 2 : 4);
        }
        return "{\"pid\":" + p.Id + ",\"epoch0\":" + epoch0 + ",\"visibleMs\":" + Math.Round(visibleAt) + ",\"rect\":[" + rect.L + "," + rect.T + "," + rect.R + "," + rect.B + "],\"screen\":[" + sw + "," + sh + "],\"before\":[" + before[0] + "," + before[1] + "," + before[2] + "],\"frames\":[" + string.Join(",", frames) + "]}";
    }
}
'@
[Launch]::Run($Exe, $Port, $WatchMs)
