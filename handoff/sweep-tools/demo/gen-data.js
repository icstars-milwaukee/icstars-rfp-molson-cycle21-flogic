// Makes the test data from section 2 of the plan, into ./data
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const out = path.join(__dirname, 'data');
fs.mkdirSync(out, { recursive: true });

let seed = 20261113;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function int(lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
function p2(n) { return String(n).padStart(2, '0'); }
// a real Excel date cell: a day number with a date format (what Excel itself writes)
function xd(y, m0, d) { return { t: 'n', v: Math.round(Date.UTC(y, m0, d) / 86400000) + 25569, z: 'm/d/yyyy' }; }
function money(n) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const depts = ['Finance', 'HR', 'Operations', 'Brewing', 'Logistics', 'Sales'];
const first = ['Ana', 'Bo', 'Chen', 'Dee', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivan', 'Jo', 'Kai', 'Lena', 'Mo', 'Nia', "O'Neil", 'Pat'];
const last = ['Rivera', 'Smith', 'Nguyen', 'Okafor', 'Kowalski', 'Garcia', 'Lee', 'Brown', "D'Angelo", 'Khan'];

// 1. finance_ledger_2026.sql
{
    let s = '-- MySQL dump: finance ledger\nCREATE TABLE `ledger` (\n  `id` INT PRIMARY KEY,\n  `posted` DATE,\n  `department` VARCHAR(40),\n  `account` VARCHAR(40),\n  `amount` VARCHAR(20),\n  `memo` TEXT\n);\n';
    const accts = ['Payroll', 'Travel', 'Supplies', 'Freight', 'Utilities', 'Marketing'];
    for (let i = 1; i <= 500; i++) {
        const d = '2026-' + p2(int(1, 11)) + '-' + p2(int(1, 28));
        const amt = money(int(50, 250000) + int(0, 99) / 100);
        const memo = pick(["Q" + int(1, 4) + " accrual", "it''s a reversal", 'vendor, net 30', 'PO ' + int(1000, 9999)]);
        s += "INSERT INTO `ledger` VALUES (" + i + ", '" + d + "', '" + pick(depts) + "', '" + pick(accts) + "', '" + amt + "', '" + memo + "');\n";
    }
    fs.writeFileSync(path.join(out, 'finance_ledger_2026.sql'), s);
    fs.writeFileSync(path.join(out, 'weird name (final) v2.sql'), s.split('\n').slice(0, 30).join('\n') + '\n');
}

// 2. hr_roster_2026.xlsx   2 sheets, ~300 rows, hire dates, some blanks
{
    const wb = XLSX.utils.book_new();
    const rows = [['Employee ID', 'Name', 'Department', 'Hire Date', 'Salary', 'Manager']];
    for (let i = 1; i <= 300; i++) {
        const hire = xd(int(1998, 2026), int(0, 11), int(1, 28));
        rows.push(['E' + String(i).padStart(4, '0'), pick(first) + ' ' + pick(last), rnd() < 0.05 ? null : pick(depts),
                   rnd() < 0.04 ? null : hire, int(38000, 160000), rnd() < 0.1 ? null : pick(first) + ' ' + pick(last)]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), 'Roster');
    const r2 = [['Department', 'Headcount', 'Open Roles']];
    for (const d of depts) r2.push([d, int(10, 80), int(0, 6)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(r2), 'Summary');
    XLSX.writeFile(wb, path.join(out, 'hr_roster_2026.xlsx'), { cellDates: true });
}

// 3. ops_tickets_2026.csv   ~2,000 rows, quoted commas, a few stray quotes
{
    let s = 'Ticket,Opened,Site,Priority,Summary,Hours\n';
    const sites = ['Golden, CO', 'Milwaukee, WI', 'Toronto, ON', 'Albany, GA'];
    for (let i = 1; i <= 2000; i++) {
        const d = '2026-' + p2(int(1, 11)) + '-' + p2(int(1, 28));
        let sum = pick(['Conveyor jam on line ' + int(1, 9), 'Filler valve leak', 'Label printer offline', 'Forklift battery, bay ' + int(1, 20), 'Sensor "E-' + int(10, 99) + '" fault']);
        let cell = '"' + sum.replace(/"/g, '""') + '"';
        if (i % 397 === 0) cell = '5" hose clamp missing';            // a stray quote, not quoted properly
        s += 'T-' + String(i).padStart(5, '0') + ',' + d + ',"' + pick(sites) + '",' + pick(['Low', 'Medium', 'High']) + ',' + cell + ',' + (int(1, 400) / 10) + '\n';
    }
    fs.writeFileSync(path.join(out, 'ops_tickets_2026.csv'), s);
}

// 4. legacy_projects_2006.xlsx   dated 2006 in three text formats, plus a real date column
{
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rows = [['Project', 'Owner', 'Start', 'Start ISO', 'Due', 'Budget', 'Status']];
    // a known first row, for checking by eye
    rows.push(['P-0001 Keg line refit', 'Morgan Lee', '3/15/06', '2006-03-15', xd(2006, 5, 30), 125000, 'Done']);
    rows.push(['P-0002 Warehouse racking', 'Morgan Lee', '2006-03-15', '2006-03-15', xd(2006, 8, 1), 98000, 'Done']);
    rows.push(['P-0003 Label redesign', 'Ana Rivera', '15-Mar-2006', '2006-03-15', xd(2006, 11, 15), 42000, 'Cancelled']);
    for (let i = 4; i <= 120; i++) {
        const m = int(1, 12), d = int(1, 28);
        const f = i % 3;
        const start = f === 0 ? m + '/' + d + '/06' : f === 1 ? '2006-' + p2(m) + '-' + p2(d) : p2(d) + '-' + mon[m - 1] + '-2006';
        rows.push(['P-' + String(i).padStart(4, '0') + ' ' + pick(['Boiler', 'Dock', 'ERP', 'Fleet', 'Lab']) + ' ' + pick(['upgrade', 'audit', 'rollout']),
                   pick(first) + ' ' + pick(last), start, '2006-' + p2(m) + '-' + p2(d), xd(2006, m - 1, Math.min(28, d + 5)), int(5, 400) * 1000, pick(['Done', 'Late', 'Cancelled'])]);
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows, { cellDates: true }), 'Projects');
    XLSX.writeFile(wb, path.join(out, 'legacy_projects_2006.xlsx'), { cellDates: true });
}

// 5. y2k_sales_1999.csv   1999-2000, 2-digit and 4-digit years mixed
{
    let s = 'Order,Sale Date,Sale Date ISO,Region,Rep,Amount\n';
    s += 'S-00001,12/31/99,1999-12-31,West,Sam Khan,"$1,204.50"\n';
    s += 'S-00002,01/01/00,2000-01-01,West,Sam Khan,"$2,000.00"\n';
    s += 'S-00003,12/31/1999,1999-12-31,East,Ana Rivera,$310.25\n';
    s += 'S-00004,01/01/2000,2000-01-01,East,Ana Rivera,$99.99\n';
    for (let i = 5; i <= 400; i++) {
        const y = rnd() < 0.5 ? 1999 : 2000, m = int(1, 12), d = int(1, 28);
        const two = i % 2 === 0;
        const shown = p2(m) + '/' + p2(d) + '/' + (two ? String(y).slice(2) : y);
        const amt = int(20, 9000) + int(0, 99) / 100;
        const a = money(amt);
        s += 'S-' + String(i).padStart(5, '0') + ',' + shown + ',' + y + '-' + p2(m) + '-' + p2(d) + ',' + pick(['West', 'East', 'North', 'South']) + ',' +
             pick(first) + ' ' + pick(last) + ',' + (a.includes(',') ? '"' + a + '"' : a) + '\n';
    }
    fs.writeFileSync(path.join(out, 'y2k_sales_1999.csv'), s);
}

// 6. big_warehouse.sql  ~40 MB, written to a real disk file
if (!fs.existsSync(path.join(out, 'big_warehouse.sql'))) {
    const f = path.join(out, 'big_warehouse.sql');
    const fd = fs.openSync(f, 'w');
    fs.writeSync(fd, 'CREATE TABLE inventory (id INT PRIMARY KEY, sku TEXT, site TEXT, counted DATE, qty INT, note TEXT);\n');
    let bytes = 0, id = 0;
    while (bytes < 40 * 1024 * 1024) {
        let chunk = 'INSERT INTO inventory VALUES ';
        const rows = [];
        for (let k = 0; k < 500; k++) {
            id++;
            rows.push('(' + id + ", 'SKU-" + int(100000, 999999) + "', '" + pick(['Golden', 'Milwaukee', 'Toronto', 'Albany']) + "', '2026-" + p2(int(1, 11)) + '-' + p2(int(1, 28)) + "', " + int(0, 5000) + ", 'pallet " + int(1, 9999) + " aisle " + int(1, 60) + "')");
        }
        chunk += rows.join(',\n') + ';\n';
        bytes += fs.writeSync(fd, chunk);
    }
    fs.closeSync(fd);
    console.log('big rows', id, 'bytes', bytes);
}

// 7. odd inputs
fs.writeFileSync(path.join(out, 'not_data.pdf'), '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
fs.writeFileSync(path.join(out, 'empty.csv'), '');
// a plain csv for UC8
fs.writeFileSync(path.join(out, 'plain_notes.csv'), 'Item,Qty,When\nHops,12,2026-11-01\nMalt,40,2026-11-02\nYeast,3,2026-11-03\n');

for (const n of fs.readdirSync(out)) console.log(n, fs.statSync(path.join(out, n)).size);
