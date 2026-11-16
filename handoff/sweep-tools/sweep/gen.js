// Section 2's extra made-up files.  node gen.js
const fs = require('fs');
const path = require('path');
const XLSX = require('../demo/node_modules/xlsx');
const out = path.join(__dirname, 'data');
fs.mkdirSync(out, { recursive: true });
let seed = 77;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
const p2 = (n) => String(n).padStart(2, '0');

// 1,000,000 rows x 12 columns
{
    const f = path.join(out, 'million_12col.csv');
    if (!fs.existsSync(f)) {
        const fd = fs.openSync(f, 'w');
        fs.writeSync(fd, 'id,opened,site,team,priority,state,category,owner,hours,cost,qty,note\n');
        const sites = ['Golden', 'Milwaukee', 'Toronto', 'Albany'], teams = ['L1', 'L2', 'NOC', 'Field', 'Vendor'], st = ['New', 'Open', 'Hold', 'Closed'], cat = ['Hardware', 'Software', 'Network', 'Access'];
        let buf = [];
        for (let i = 1; i <= 1000000; i++) {
            buf.push(i + ',2026-' + p2(int(1, 11)) + '-' + p2(int(1, 28)) + ',' + pick(sites) + ',' + pick(teams) + ',' + int(1, 4) + ',' + pick(st) + ',' + pick(cat) + ',user' + int(1, 400) + ',' + (int(1, 400) / 10) + ',' + (int(100, 99999) / 100) + ',' + int(0, 500) + ',note ' + int(1, 99999));
            if (buf.length === 20000) { fs.writeSync(fd, buf.join('\n') + '\n'); buf = []; }
        }
        if (buf.length) fs.writeSync(fd, buf.join('\n') + '\n');
        fs.closeSync(fd);
    }
}
// 300 columns x 2,000 rows
{
    const head = []; for (let c = 1; c <= 300; c++) head.push('col' + String(c).padStart(3, '0'));
    const rows = [head.join(',')];
    for (let r = 1; r <= 2000; r++) { const cells = []; for (let c = 1; c <= 300; c++) cells.push(c % 7 === 0 ? 'w' + int(1, 999) : int(0, 99999)); rows.push(cells.join(',')); }
    fs.writeFileSync(path.join(out, 'wide_300col.csv'), rows.join('\n') + '\n');
}
// xlsx with 5 sheets
{
    const wb = XLSX.utils.book_new();
    for (const name of ['North', 'South', 'East', 'West', 'Totals']) {
        const rows = [['Month', 'Site', 'Units', 'Revenue', 'Returned']];
        for (let i = 0; i < 400; i++) rows.push(['2026-' + p2(int(1, 11)), pick(['Golden', 'Milwaukee', 'Toronto']), int(1, 900), int(100, 90000) / 10, int(0, 20)]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    }
    XLSX.writeFile(wb, path.join(out, 'five_sheets.xlsx'));
}
// 20 small CSVs for batch packing
{
    const d = path.join(out, 'batch20'); fs.mkdirSync(d, { recursive: true });
    for (let k = 1; k <= 20; k++) {
        let s = 'Item,Qty,When\n';
        for (let i = 0; i < 50; i++) s += 'item' + int(1, 999) + ',' + int(1, 90) + ',2026-11-' + p2(int(1, 28)) + '\n';
        fs.writeFileSync(path.join(d, 'batch_' + p2(k) + '.csv'), s);
    }
}
for (const n of fs.readdirSync(out)) { const s = fs.statSync(path.join(out, n)); console.log(n, s.isDirectory() ? '(dir)' : s.size); }
